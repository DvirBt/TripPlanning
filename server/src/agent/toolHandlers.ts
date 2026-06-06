import type { Boundary, Itinerary, PlaceType } from "../itinerary/types";
import { findBoundaryViolations } from "../geo/geofence";
import { getPlacesAdapter } from "../places/placesAdapter";
import { ragAdapter } from "../rag/ragAdapter";
import { validateConstraints } from "./constraints";

/**
 * Provider-agnostic tool logic. Both backends use these:
 * - the Claude path wraps each in an MCP `tool()` (tools.ts)
 * - the Gemini path calls them from its function-calling loop (geminiService.ts)
 *
 * Each handler returns a plain JSON-serialisable object.
 */
export interface TripContext {
  userId: string;
  boundary: Boundary;
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
 * geofencing guarantee for the Gemini backend (the Claude backend also has a
 * PreToolUse hook, but this keeps both behaving identically).
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
  ctx.onItinerary(itinerary);
  return {
    ok: true,
    message: "Itinerary delivered to the user's screen. Briefly summarise it in chat.",
  };
}
