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
}

import { createGooglePlaces } from "./googlePlaces";

let cached: PlacesAdapter | null = null;

export function getPlacesAdapter(): PlacesAdapter {
  if (cached) return cached;
  cached = createGooglePlaces();
  return cached;
}
