import { config } from "../config";
import { runClaudeTurn } from "./claudeService";
import { runGeminiTurn } from "./geminiService";
import type { AgentTurnParams } from "./types";

export type { AgentEventSink, AgentTurnParams } from "./types";

/**
 * Runs one conversational turn using the configured LLM backend. Both backends
 * share the same tool logic, system prompt, RAG store and boundary enforcement;
 * only the LLM call differs. Select with AGENT_PROVIDER (claude | gemini).
 */
export async function runAgentTurn(params: AgentTurnParams): Promise<void> {
  if (config.agentProvider === "gemini") {
    return runGeminiTurn(params);
  }
  return runClaudeTurn(params);
}
