import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Boundary } from "../itinerary/types";
import type { Preference } from "../rag/ragAdapter";
import type { AgentMode } from "./types";
import type { TripFields } from "../trip/tripParams";
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
/** Renders the trip fields known so far, listing anything still missing. */
function buildFieldsBlock(fields: TripFields): string {
  const fmt = (v: unknown) => (v === undefined || v === "" ? "(missing)" : String(v));
  const missing: string[] = [];
  if (!fields.where) missing.push("starting location");
  if (!fields.startDate) missing.push("start date");
  if (!fields.endDate) missing.push("end date");
  if (fields.partySize === undefined) missing.push("number of people");
  if (fields.budget === undefined) missing.push("budget");

  const lines = [
    "\n\n## Trip details provided so far (from the form)",
    `- Starting location: ${fmt(fields.where)}`,
    `- Dates: ${fmt(fields.startDate)} to ${fmt(fields.endDate)}`,
    `- Travellers: ${fmt(fields.partySize)}`,
    `- Budget: ${fields.budget === undefined ? "(missing)" : `${fields.budget} USD`}`,
  ];
  if (missing.length > 0) {
    lines.push(
      `Still missing: ${missing.join(", ")}. Ask the user to fill these in the form above before planning.`,
    );
  }
  return lines.join("\n");
}

/** Phase-specific instructions: chatty advisor vs. build-the-itinerary-now. */
function buildModeBlock(mode: AgentMode): string {
  if (mode === "plan") {
    return (
      "\n\n## Current phase: PLANNING (act now)\n" +
      "The user pressed 'Start planning' — that IS their confirmation. In THIS turn you MUST deliver the finished itinerary, not a draft:\n" +
      "- Do NOT post the itinerary as chat prose, do NOT show a partial draft, and do NOT ask 'how does this sound' or for any confirmation.\n" +
      "- Build the COMPLETE day-by-day plan covering EVERY day of the date range — not just the first day or two.\n" +
      "- Use searchPlaces to gather real in-boundary places for the whole trip, then call finalizeItinerary exactly once with the full itinerary. The plan reaches the user ONLY through the finalizeItinerary tool call.\n" +
      "- You may call validateTripConstraints first; ONLY if it reports the trip is infeasible may you skip finalizeItinerary and instead explain why.\n" +
      "- After finalizeItinerary succeeds, reply with just a one or two sentence summary."
    );
  }
  return (
    "\n\n## Current phase: DISCUSSION\n" +
    "You are chatting with the user as a warm, curious personal trip advisor. Discuss ideas, suggest options, and ask about anything vague or missing (especially any missing form fields). You MAY use searchPlaces to ground your suggestions in real, in-boundary places. Do NOT build or finalize an itinerary yet — the user will press 'Start planning' when they are ready. Keep replies conversational and fairly short."
  );
}

export function buildSystemPrompt(
  boundary: Boundary,
  preferences: Preference[],
  mode: AgentMode,
  fields: TripFields,
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

  return base + buildFieldsBlock(fields) + buildModeBlock(mode) + boundaryBlock + prefsBlock;
}