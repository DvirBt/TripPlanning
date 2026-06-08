import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Boundary } from "../itinerary/types";
import type { Preference } from "../rag/ragAdapter";
import { describeBoundary } from "../geo/geofence";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROMPTS_DIR = resolve(__dirname, "../../prompts");

function loadPromptFile(name: string): string {
  return readFileSync(resolve(PROMPTS_DIR, name), "utf8");
}

/**
 * Builds the per-conversation system prompt: the static rules plus the dynamic
 * context for this user (their active boundary and any preferences retrieved
 * from the RAG store). Injecting preferences here is the "retrieval" half of
 * RAG - it grounds the agent before the conversation starts.
 */
export function buildSystemPrompt(
  boundary: Boundary,
  preferences: Preference[],
): string {
  const base = [
    loadPromptFile("system-prompt.md"),
    loadPromptFile("itinerary-guide.md"),
    loadPromptFile("constraint-guide.md"),
    loadPromptFile("search-guide.md"),
  ].join("\n\n");

  const boundaryBlock = boundary.value.trim()
    ? `\n\n## Active geographical boundary\nYou MUST restrict every recommendation to the ${describeBoundary(boundary)}. Do not suggest anything outside it.`
    : "";

  const prefsBlock =
    preferences.length > 0
      ? `\n\n## Known user preferences (from their profile)\n${preferences
          .map((p) => `- ${p.key}: ${p.value}`)
          .join(
            "\n",
          )}\nUse these to personalise recommendations. If the user states a new or changed preference, save it with the saveUserPreference tool.`
      : "\n\n## Known user preferences\nNone on file yet. Learn them during the conversation and save them with the saveUserPreference tool.";

  return base + boundaryBlock + prefsBlock;
}