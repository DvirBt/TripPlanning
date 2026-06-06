// Mirror of the server's itinerary types the UI needs to render results.
export interface Boundary {
  level: "country" | "state" | "city";
  value: string;
}

export interface ItineraryItem {
  time: string;
  placeName: string;
  placeType: "hotel" | "restaurant" | "attraction";
  city: string;
  state: string;
  country: string;
  note: string;
  estimatedCost: number;
}

export interface ItineraryDay {
  date: string;
  items: ItineraryItem[];
}

export interface Itinerary {
  destination: string;
  summary: string;
  totalEstimatedCost: number;
  currency: string;
  days: ItineraryDay[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

export interface User {
  userId: string;
  email: string;
}
