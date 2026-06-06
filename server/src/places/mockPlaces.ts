import type { Place } from "../itinerary/types";
import { isWithinBoundary } from "../geo/geofence";
import { MOCK_PLACES } from "./mockData";
import type { PlacesAdapter, PlacesQuery } from "./placesAdapter";

/**
 * Mock places provider used when USE_MOCKS=true. It filters the curated dataset
 * by type, optional keyword and price level, and then enforces the boundary at
 * the data layer. Because the boundary filter runs here (not just in the
 * prompt), out-of-bounds places can never reach the agent.
 */
export const mockPlaces: PlacesAdapter = {
  async searchPlaces(query: PlacesQuery): Promise<Place[]> {
    const keyword = query.query?.trim().toLowerCase();

    const results = MOCK_PLACES.filter((place) => {
      if (place.type !== query.type) return false;
      if (!isWithinBoundary(place, query.boundary)) return false;
      if (
        query.maxPriceLevel !== undefined &&
        place.priceLevel > query.maxPriceLevel
      ) {
        return false;
      }
      if (keyword) {
        const haystack = [
          place.name,
          place.description,
          ...place.tags,
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(keyword)) return false;
      }
      return true;
    });

    // Best first.
    return results.sort((a, b) => b.rating - a.rating);
  },
};