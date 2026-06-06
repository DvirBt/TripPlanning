import type { Boundary, Itinerary } from "../itinerary/types";

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
  sink: AgentEventSink;
}
