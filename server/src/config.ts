import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const here = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(here, "../../.env") });
dotenv.config({ path: resolve(here, "../.env") });

/** The LLM backends the agent can run on. The UI picks one per request; this is the fallback. */
export type LlmProvider = "gemini" | "openai";

const defaultProvider: LlmProvider =
  process.env.LLM_PROVIDER === "openai" ? "openai" : "gemini";

export const config = {
  port: Number(process.env.PORT ?? 8787),

  /** Default LLM backend when the request doesn't specify one. */
  llmProvider: defaultProvider,

  /** Google Gemini powers the agent. */
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  geminiModel: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",

  /** OpenAI (ChatGPT) — the alternative agent backend. */
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  openaiModel: process.env.OPENAI_MODEL ?? "gpt-4o-mini",

  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googlePlacesApiKey: process.env.GOOGLE_PLACES_API_KEY ?? "",
};

export type Config = typeof config;
