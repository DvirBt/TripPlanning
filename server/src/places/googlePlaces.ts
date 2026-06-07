import type { Place } from "../itinerary/types";
import { isWithinBoundary } from "../geo/geofence";
import { config } from "../config";
import type { PlacesAdapter, PlacesQuery } from "./placesAdapter";

const ENDPOINT = "https://places.googleapis.com/v1/places:searchText";

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.rating",
  "places.priceLevel",
  "places.types",
  "places.addressComponents",
  "places.editorialSummary",
].join(",");

const PRICE_MAP: Record<string, number> = {
  PRICE_LEVEL_FREE: 1,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

// Generic Google Places types that don't add useful tag information
const SKIP_TYPES = new Set([
  "point_of_interest",
  "establishment",
  "food",
  "premise",
  "store",
  "health",
]);

interface AddressComponent {
  types?: string[];
  longText?: string;
}

interface RawPlace {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  rating?: number;
  priceLevel?: string;
  types?: string[];
  addressComponents?: AddressComponent[];
  editorialSummary?: { text?: string };
}

function getComponent(components: AddressComponent[], type: string): string {
  return components.find((c) => c.types?.includes(type))?.longText ?? "";
}

function toPlace(raw: RawPlace, query: PlacesQuery): Place | null {
  const name = raw.displayName?.text;
  const lat = raw.location?.latitude;
  const lng = raw.location?.longitude;
  if (!name || lat === undefined || lng === undefined) return null;

  const components = raw.addressComponents ?? [];

  // Try progressively broader components for city; fall back to the search location
  // so the boundary check has something to match against.
  const city =
    getComponent(components, "locality") ||
    getComponent(components, "postal_town") ||
    getComponent(components, "administrative_area_level_2") ||
    query.location;

  const state = getComponent(components, "administrative_area_level_1");
  const country = getComponent(components, "country");

  const tags = (raw.types ?? []).filter((t) => !SKIP_TYPES.has(t));

  return {
    id: raw.id ?? name,
    name,
    type: query.type,
    city,
    state,
    country,
    lat,
    lng,
    priceLevel: PRICE_MAP[raw.priceLevel ?? ""] ?? 2,
    rating: raw.rating ?? 0,
    description: raw.editorialSummary?.text ?? raw.formattedAddress ?? "",
    tags,
  };
}

export function createGooglePlaces(): PlacesAdapter {
  return {
    async searchPlaces(query: PlacesQuery): Promise<Place[]> {
      if (!config.googlePlacesApiKey) {
        throw new Error("GOOGLE_PLACES_API_KEY is not set in .env");
      }

      const parts = [query.query, query.type, "in", query.location].filter(Boolean);
      const textQuery = parts.join(" ");

      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": config.googlePlacesApiKey,
          "X-Goog-FieldMask": FIELD_MASK,
        },
        body: JSON.stringify({ textQuery, maxResultCount: 10, languageCode: "en" }),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Google Places API ${res.status}: ${body}`);
      }

      const data = (await res.json()) as { places?: RawPlace[] };
      const places = (data.places ?? [])
        .map((raw) => toPlace(raw, query))
        .filter((p): p is Place => p !== null)
        .filter((p) => isWithinBoundary(p, query.boundary));

      if (query.maxPriceLevel !== undefined) {
        return places
          .filter((p) => p.priceLevel <= query.maxPriceLevel!)
          .sort((a, b) => b.rating - a.rating);
      }

      return places.sort((a, b) => b.rating - a.rating);
    },
  };
}
