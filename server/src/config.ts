import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const here = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(here, "../../.env") });
dotenv.config({ path: resolve(here, "../.env") });

export const config = {
  port: Number(process.env.PORT ?? 8787),

  /** Google Gemini powers the agent. */
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  geminiModel: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",

  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googlePlacesApiKey: process.env.GOOGLE_PLACES_API_KEY ?? "",
};

export type Config = typeof config;
