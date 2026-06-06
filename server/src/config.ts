import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

// Load the repo-root .env first (the documented location), then a server-local
// .env as a fallback. Loading both means it works whether the server is run
// from the repo root or from the server workspace directory.
const here = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(here, "../../.env") });
dotenv.config({ path: resolve(here, "../.env") });

/**
 * Central configuration. Reads the environment once and exposes typed values.
 * The single most important flag is USE_MOCKS: when true (the default) every
 * external dependency is served by an in-process mock so the app runs offline.
 */
function bool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value.toLowerCase() === "true" || value === "1";
}

export const config = {
  port: Number(process.env.PORT ?? 8787),
  useMocks: bool(process.env.USE_MOCKS, true),

  /** Which LLM backend powers the agent: "claude" (Claude Agent SDK) or "gemini". */
  agentProvider: (process.env.AGENT_PROVIDER ?? "claude").toLowerCase(),

  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  agentModel: process.env.AGENT_MODEL ?? "claude-sonnet-4-6",

  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  geminiModel: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",

  firebase: {
    serviceAccount: process.env.FIREBASE_SERVICE_ACCOUNT ?? "",
    projectId: process.env.FIREBASE_PROJECT_ID ?? "",
  },

  googlePlacesApiKey: process.env.GOOGLE_PLACES_API_KEY ?? "",
};

export type Config = typeof config;