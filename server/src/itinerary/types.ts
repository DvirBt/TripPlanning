/**
 * Shared domain types used across every module. Keeping them in one place
 * means the places adapter, geofence, agent tools and the frontend all agree
 * on the same shapes.
 */

/** Where the user is willing to travel. The agent must not recommend anything
 *  outside this boundary. "value" is matched against the place's matching field
 *  (city / state / country) at the chosen level. */
export interface Boundary {
  level: "country" | "state" | "city";
  value: string;
}

/** A category of place we can search for. */
export type PlaceType = "hotel" | "restaurant" | "attraction";

/** A single location returned by the places adapter. */
export interface Place {
  id: string;
  name: string;
  type: PlaceType;
  city: string;
  state: string;
  country: string;
  lat: number;
  lng: number;
  /** 1 (budget) .. 4 (luxury), Google-Places style. */
  priceLevel: number;
  rating: number;
  description: string;
  /** Free-text tags used for simple preference matching, e.g. "vegetarian". */
  tags: string[];
}

/** Parameters that describe the trip the user wants. */
export interface TripParams {
  origin?: string;
  destination?: string;
  startDate?: string;
  days?: number;
  partySize?: number;
  budget?: number;
  interests?: string[];
}

/** One scheduled stop within a day. */
export interface ItineraryItem {
  time: string;
  placeName: string;
  placeType: PlaceType;
  city: string;
  state: string;
  country: string;
  note: string;
  estimatedCost: number;
  /** Optional coordinates copied from the searchPlaces result, used by the map. */
  lat?: number;
  lng?: number;
}

/** One day of the trip. */
export interface ItineraryDay {
  date: string;
  items: ItineraryItem[];
}

/** The final self-contained plan handed to the UI. No booking links. */
export interface Itinerary {
  destination: string;
  summary: string;
  totalEstimatedCost: number;
  currency: string;
  days: ItineraryDay[];
}