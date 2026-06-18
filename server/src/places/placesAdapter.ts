import type { Boundary, Place, PlaceType } from "../itinerary/types";

export interface PlacesQuery {
  location: string;
  type: PlaceType;
  query?: string;
  maxPriceLevel?: number;
  boundary: Boundary;
}

export interface PlacesAdapter {
  searchPlaces(query: PlacesQuery): Promise<Place[]>;
  /**
   * Resolves the country a location sits in (e.g. "Kyoto" -> "Japan"), used to
   * set the country-level geofence boundary. Returns null if it can't be
   * resolved so the caller can fall back gracefully.
   */
  resolveCountry(location: string): Promise<string | null>;
}

import { createGooglePlaces } from "./googlePlaces";

let cached: PlacesAdapter | null = null;

export function getPlacesAdapter(): PlacesAdapter {
  if (cached) return cached;
  cached = createGooglePlaces();
  return cached;
}
