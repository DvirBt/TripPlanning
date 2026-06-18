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
  lat?: number;
  lng?: number;
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

/** Raw form field values as the user types them (dates are dd/mm/yyyy here). */
export interface RawFields {
  where: string;
  startDate: string; // dd/mm/yyyy
  endDate: string; // dd/mm/yyyy
  partySize: string;
  budget: string;
}

/** The normalised trip the backend receives (dates converted to ISO). */
export interface TripIntake {
  where: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  partySize: number;
  budget: number;
}

/** Field-name -> message map, shared by UI and backend validation. */
export type TripErrors = Partial<Record<keyof TripIntake, string>>;

export interface User {
  userId: string;
  email: string;
}

/** Which LLM backend powers the agent. Chosen in the model selector. */
export type LlmProvider = "gemini" | "openai";

/** The models offered in the top-right selector. */
export const LLM_PROVIDERS: { value: LlmProvider; label: string }[] = [
  { value: "gemini", label: "Gemini" },
  { value: "openai", label: "ChatGPT (OpenAI)" },
];
