import type { Place } from "../itinerary/types";
import { isWithinBoundary } from "../geo/geofence";
import type { PlacesAdapter, PlacesQuery } from "./placesAdapter";

/**
 * Real Google Places adapter. Only used when USE_MOCKS=false.
 *
 * Sketch of a real implementation using the Places API (Text Search):
 *   POST https://places.googleapis.com/v1/places:searchText
 *   header: X-Goog-Api-Key: config.googlePlacesApiKey
 *   body:   { textQuery: `${query.query ?? ""} ${query.type} in ${query.location}` }
 *
 * Map each returned place into our Place shape (deriving city/state/country
 * from addressComponents), then ALWAYS run isWithinBoundary() so the same
 * geofencing guarantee the mock provides also holds for live data.
 */
export function createGooglePlaces(): PlacesAdapter {
  return {
    async searchPlaces(query: PlacesQuery): Promise<Place[]> {
      // Reference shape after fetching + mapping `raw` results to Place[]:
      //   const mapped: Place[] = raw.map(toPlace);
      //   return mapped.filter((p) => isWithinBoundary(p, query.boundary));
      void isWithinBoundary; // keep the geofencing helper imported for the real impl
      void query;
      throw new Error(
        "Google Places is not wired up. Implement the Places Text Search call " +
          "here and map results to Place, or set USE_MOCKS=true. " +
          "See server/src/places/googlePlaces.ts.",
      );
    },
  };
}