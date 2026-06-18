import cors from "cors";
import express from "express";
import { config, type LlmProvider } from "./config";
import { runAgentTurn, type AgentEventSink } from "./agent/agentService";
import { requireAuth, type AuthedRequest } from "./auth/middleware";
import type { Boundary } from "./itinerary/types";
import { getPlacesAdapter } from "./places/placesAdapter";
import { ragAdapter } from "./rag/ragAdapter";
import { getChatBoundary, setChatBoundary } from "./trip/boundaryStore";
import { validateTripParams, type NormalizedTrip, type TripFields } from "./trip/tripParams";

const app = express();
app.use(cors());
app.use(express.json());

/** The authenticated user's stored preferences (useful for debugging RAG writes). */
app.get("/api/preferences", requireAuth, (req: AuthedRequest, res) => {
  res.json({ preferences: ragAdapter.getPreferences(req.userId!) });
});

/**
 * Resolves the country-level geofence boundary for a starting location, caching
 * per chat so the country is only geocoded again when "where" changes. Falls
 * back to a city-level boundary on the raw input if the country can't be
 * resolved, so planning never fails on geocoding alone. An empty location
 * yields an empty (pass-all) boundary, which is fine during discussion.
 */
async function ensureBoundary(chatId: string, where: string): Promise<Boundary> {
  const trimmed = where.trim();
  if (!trimmed) return { level: "city", value: "" };

  const cached = getChatBoundary(chatId);
  if (cached && cached.where === trimmed) return cached.boundary;

  let boundary: Boundary = { level: "city", value: trimmed };
  try {
    const country = await getPlacesAdapter().resolveCountry(trimmed);
    if (country) boundary = { level: "country", value: country };
  } catch (err) {
    console.warn(`resolveCountry failed for "${trimmed}":`, err);
  }
  setChatBoundary(chatId, trimmed, boundary);
  return boundary;
}

/** The instruction sent to the agent when the user presses "Start planning". */
function composePlanMessage(trip: NormalizedTrip): string {
  return [
    "I'm ready — please build the itinerary now using these details and everything we discussed:",
    `- Starting location: ${trip.where} (the trip may roam the surrounding country)`,
    `- Dates: ${trip.startDate} to ${trip.endDate} (${trip.days} day(s))`,
    `- Travellers: ${trip.partySize}`,
    `- Budget: ${trip.budget} USD total`,
  ].join("\n");
}

/** Coerces an untrusted body.fields into the partial TripFields the prompt uses. */
function readFields(raw: unknown): TripFields {
  const f = (raw ?? {}) as Record<string, unknown>;
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
  return {
    where: str(f.where),
    startDate: str(f.startDate),
    endDate: str(f.endDate),
    partySize: num(f.partySize),
    budget: num(f.budget),
  };
}

/**
 * Chat endpoint. Streams the agent turn back as Server-Sent Events:
 *   event: text      -> a chunk of assistant prose
 *   event: tool      -> the agent invoked a tool (name)
 *   event: itinerary -> the final structured itinerary
 *   event: done      -> turn finished
 *   event: error     -> something went wrong
 *
 * A turn is either "discuss" (a free-text chat message with the advisor) or
 * "plan" (the user pressed Start planning — the fields are validated here, the
 * source of truth, and the agent builds the itinerary).
 */
app.post("/api/chat", requireAuth, async (req: AuthedRequest, res) => {
  const { chatId, message, fields } = req.body ?? {};
  const mode = req.body?.mode === "plan" ? "plan" : "discuss";
  // The UI's model selector chooses the backend; fall back to the configured
  // default only when the request doesn't specify a recognised provider.
  const reqProvider = req.body?.provider;
  const provider: LlmProvider =
    reqProvider === "openai" || reqProvider === "gemini" ? reqProvider : config.llmProvider;
  if (typeof chatId !== "string" || !chatId) {
    res.status(400).json({ error: "chatId is required" });
    return;
  }

  let agentMessage: string;
  let promptFields: TripFields;
  let boundary: Boundary;
  let expectedDays: number | undefined;

  if (mode === "plan") {
    // Planning requires all fields to be present and valid.
    const result = validateTripParams(fields);
    if (!result.valid) {
      res.status(400).json({ errors: result.errors });
      return;
    }
    boundary = await ensureBoundary(chatId, result.value!.where);
    agentMessage = composePlanMessage(result.value!);
    promptFields = readFields(fields);
    expectedDays = result.value!.days;
  } else {
    if (typeof message !== "string" || !message.trim()) {
      res.status(400).json({ error: "A message is required to chat." });
      return;
    }
    promptFields = readFields(fields);
    boundary = await ensureBoundary(chatId, promptFields.where ?? "");
    agentMessage = message;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const sink: AgentEventSink = {
    text: (text) => send("text", { text }),
    toolStart: (name) => send("tool", { name }),
    itinerary: (itinerary) => send("itinerary", itinerary),
    error: (msg) => send("error", { message: msg }),
    done: (summary) => {
      send("done", { summary });
      res.end();
    },
  };

  await runAgentTurn({
    chatId,
    userId: req.userId!,
    message: agentMessage,
    boundary,
    mode,
    fields: promptFields,
    expectedDays,
    provider,
    sink,
  });
});

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.listen(config.port, () => {
  console.log(`Trip planning server on http://localhost:${config.port}`);
});
