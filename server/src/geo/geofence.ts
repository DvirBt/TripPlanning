import type { Boundary, Itinerary, Place } from "../itinerary/types";

/**
 * Geofencing: decide whether a place falls inside the user's chosen boundary.
 *
 * Boundaries are "dynamic" in the PRD sense: the user picks a level
 * (country, state or city) and a value. We do a case-insensitive match against
 * the corresponding field on the place. This is deterministic, so border
 * adherence does not depend on the language model behaving.
 */
function norm(value: string): string {
  return value.trim().toLowerCase();
}

export function isWithinBoundary(place: Place, boundary: Boundary): boolean {
  const target = norm(boundary.value);
  switch (boundary.level) {
    case "country":
      return norm(place.country) === target;
    case "state":
      return norm(place.state) === target;
    case "city":
      return norm(place.city) === target;
    default:
      return false;
  }
}

/** Convenience: split a list of places into those inside and outside the boundary. */
export function partitionByBoundary(
  places: Place[],
  boundary: Boundary,
): { inside: Place[]; outside: Place[] } {
  const inside: Place[] = [];
  const outside: Place[] = [];
  for (const place of places) {
    (isWithinBoundary(place, boundary) ? inside : outside).push(place);
  }
  return { inside, outside };
}

/** Human-readable label, e.g. "city of Kyoto". */
export function describeBoundary(boundary: Boundary): string {
  return `${boundary.level} of ${boundary.value}`;
}

/** A place in an itinerary that falls outside the boundary. */
export interface ItineraryViolation {
  placeName: string;
  location: string;
  reason: string;
}

/**
 * Returns every place in an itinerary that violates the boundary. Used by both
 * the Claude PreToolUse hook and the shared finalize handler, so border
 * adherence is enforced the same way regardless of LLM backend.
 */
export function findBoundaryViolations(
  itinerary: Itinerary,
  boundary: Boundary,
): ItineraryViolation[] {
  const violations: ItineraryViolation[] = [];
  for (const day of itinerary.days ?? []) {
    for (const item of day.items ?? []) {
      const place = { city: item.city, state: item.state, country: item.country };
      if (!isWithinBoundary(place as Place, boundary)) {
        violations.push({
          placeName: item.placeName,
          location: `${item.city}, ${item.state}, ${item.country}`,
          reason: `outside the ${boundary.level} of ${boundary.value}`,
        });
      }
    }
  }
  return violations;
}