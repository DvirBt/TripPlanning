import type { Boundary, Itinerary, PlaceType } from "../itinerary/types";
import { findBoundaryViolations } from "../geo/geofence";
import { getPlacesAdapter } from "../places/placesAdapter";
import { ragAdapter } from "../rag/ragAdapter";
import { validateConstraints } from "./constraints";

/**
 * The trip-planning tool logic. The Gemini backend calls these from its
 * function-calling loop (geminiService.ts).
 *
 * Each handler returns a plain JSON-serialisable object.
 */
export interface TripContext {
  userId: string;
  boundary: Boundary;
  /** Number of days the trip must cover (from the date range). When set,
   *  finalize rejects an itinerary that covers fewer days, so "cover every day"
   *  is guaranteed in code rather than left to the model. Unset in discussion. */
  expectedDays?: number;
  /** Called when an itinerary passes validation, to push it to the UI. */
  onItinerary: (itinerary: Itinerary) => void;
}

export interface SearchPlacesArgs {
  location: string;
  type: PlaceType;
  query?: string;
  maxPriceLevel?: number;
}

export async function handleSearchPlaces(ctx: TripContext, args: SearchPlacesArgs) {
  const places = await getPlacesAdapter().searchPlaces({
    location: args.location,
    type: args.type,
    query: args.query,
    maxPriceLevel: args.maxPriceLevel,
    boundary: ctx.boundary,
  });
  return { places };
}

export function handleGetUserPreferences(ctx: TripContext) {
  return { preferences: ragAdapter.getPreferences(ctx.userId) };
}

export function handleSaveUserPreference(
  ctx: TripContext,
  args: { key: string; value: string },
) {
  ragAdapter.savePreference(ctx.userId, args.key, args.value);
  return { saved: true, key: args.key, value: args.value };
}

export function handleValidateTripConstraints(args: {
  origin?: string;
  destination?: string;
  budget: number;
  days: number;
  partySize: number;
}) {
  return validateConstraints(args);
}

/**
 * Validates the proposed itinerary against the boundary BEFORE accepting it.
 * If any place is out of bounds, it is rejected with the offending places so
 * the agent can fix and resubmit; otherwise it is pushed to the UI. This is the
 * geofencing guarantee: the boundary is enforced here in code, not left to the
 * model.
 */
export function handleFinalizeItinerary(ctx: TripContext, itinerary: Itinerary) {
  const violations = findBoundaryViolations(itinerary, ctx.boundary);
  if (violations.length > 0) {
    return {
      ok: false,
      error:
        `Rejected: ${violations.length} place(s) fall outside the ` +
        `${ctx.boundary.level} of ${ctx.boundary.value}. Replace them with ` +
        `in-boundary options and finalize again.`,
      violations,
    };
  }
  // Day-coverage guarantee: the plan must cover every day of the trip. Enforced
  // here in code (like the boundary) so a model that under-delivers gets the
  // itinerary bounced back to complete, rather than the user seeing a stub.
  const dayCount = (itinerary.days ?? []).length;
  if (ctx.expectedDays !== undefined && dayCount < ctx.expectedDays) {
    return {
      ok: false,
      error:
        `Rejected: the itinerary covers only ${dayCount} day(s) but the trip spans ` +
        `${ctx.expectedDays} day(s). Add the missing days — one entry per day of the ` +
        `date range — and call finalizeItinerary again with the complete plan.`,
    };
  }
  ctx.onItinerary(sanitizeCoords(itinerary));
  return {
    ok: true,
    message: "Itinerary delivered to the user's screen. Briefly summarise it in chat.",
  };
}

/** Drops any lat/lng that is not a finite number, so the map never receives junk coords. */
function sanitizeCoords(itinerary: Itinerary): Itinerary {
  return {
    ...itinerary,
    days: (itinerary.days ?? []).map((day) => ({
      ...day,
      items: (day.items ?? []).map((item) => {
        // Coords are a pair: keep them only when both are finite, since a lone
        // lat or lng is useless on the map.
        const hasBoth = Number.isFinite(item.lat) && Number.isFinite(item.lng);
        return { ...item, lat: hasBoth ? item.lat : undefined, lng: hasBoth ? item.lng : undefined };
      }),
    })),
  };
}
