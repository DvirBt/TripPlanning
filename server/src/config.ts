import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const here = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(here, "../../.env") });
dotenv.config({ path: resolve(here, "../.env") });

export const config = {
  port: Number(process.env.PORT ?? 8787),

  /** Which LLM backend powers the agent: "claude" or "gemini". */
  agentProvider: (process.env.AGENT_PROVIDER ?? "claude").toLowerCase(),

  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  agentModel: process.env.AGENT_MODEL ?? "claude-sonnet-4-6",

  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  geminiModel: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",

  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googlePlacesApiKey: process.env.GOOGLE_PLACES_API_KEY ?? "",
};

export type Config = typeof config;
