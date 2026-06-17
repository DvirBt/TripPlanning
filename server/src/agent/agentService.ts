import { runGeminiTurn } from "./geminiService";
import type { AgentTurnParams } from "./types";

export type { AgentEventSink, AgentTurnParams } from "./types";

/**
 * Runs one conversational turn. The agent is powered by Google Gemini; the
 * shared tool logic, system prompt, RAG store and boundary enforcement all live
 * outside this call so the LLM backend stays a thin, swappable layer.
 */
export async function runAgentTurn(params: AgentTurnParams): Promise<void> {
  return runGeminiTurn(params);
}
