import type { Boundary, Itinerary } from "../itinerary/types";
import type { TripFields } from "../trip/tripParams";
import type { LlmProvider } from "../config";

/** Which phase of the flow this turn belongs to. */
export type AgentMode = "discuss" | "plan";

export type { LlmProvider };

/** A sink the HTTP layer implements to forward agent events to the browser. */
export interface AgentEventSink {
  text(text: string): void;
  toolStart(name: string): void;
  itinerary(itinerary: Itinerary): void;
  done(summary: string): void;
  error(message: string): void;
}

/** Parameters for one conversational turn, regardless of LLM backend. */
export interface AgentTurnParams {
  chatId: string;
  userId: string;
  message: string;
  boundary: Boundary;
  /** "discuss" = chatty advisor (no itinerary); "plan" = build & finalize. */
  mode: AgentMode;
  /** The trip fields known so far, injected into the prompt as context. */
  fields: TripFields;
  /** In plan mode, the number of days the trip must cover (from the validated
   *  date range). Used to enforce full day coverage at finalize. */
  expectedDays?: number;
  /** Which LLM backend to run this turn on. */
  provider: LlmProvider;
  sink: AgentEventSink;
}
