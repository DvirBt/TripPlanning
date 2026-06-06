import type { Boundary, Place, PlaceType } from "../itinerary/types";

/** Query passed to the places adapter. */
export interface PlacesQuery {
  /** Free-text location hint, e.g. "Kyoto". */
  location: string;
  type: PlaceType;
  /** Optional keyword, e.g. "vegetarian", "budget". */
  query?: string;
  /** Max price level to include (1..4). Optional. */
  maxPriceLevel?: number;
  /** The active boundary. Results are always filtered to it. */
  boundary: Boundary;
}

/**
 * Places adapter interface. Both the mock and the real Google Places
 * implementation honour the same contract, including the crucial guarantee
 * that returned places always fall inside the supplied boundary.
 */
export interface PlacesAdapter {
  searchPlaces(query: PlacesQuery): Promise<Place[]>;
}

import { config } from "../config";
import { mockPlaces } from "./mockPlaces";
import { createGooglePlaces } from "./googlePlaces";

let cached: PlacesAdapter | null = null;

export function getPlacesAdapter(): PlacesAdapter {
  if (cached) return cached;
  cached = config.useMocks ? mockPlaces : createGooglePlaces();
  return cached;
}