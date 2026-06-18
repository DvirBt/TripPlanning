import { runGeminiTurn } from "./geminiService";
import { runOpenAITurn } from "./openaiService";
import type { AgentTurnParams } from "./types";

export type { AgentEventSink, AgentTurnParams } from "./types";

/**
 * Runs one conversational turn, routed to the LLM backend the request chose
 * (Gemini or OpenAI). The shared tool logic, system prompt, RAG store and
 * boundary enforcement all live outside these calls, so each backend stays a
 * thin, swappable layer.
 */
export async function runAgentTurn(params: AgentTurnParams): Promise<void> {
  if (params.provider === "openai") return runOpenAITurn(params);
  return runGeminiTurn(params);
}
