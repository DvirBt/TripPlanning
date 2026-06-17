import {
  GoogleGenAI,
  Type,
  type Content,
  type FunctionDeclaration,
} from "@google/genai";
import { config } from "../config";
import type { Itinerary, PlaceType } from "../itinerary/types";
import { ragAdapter } from "../rag/ragAdapter";
import { buildSystemPrompt } from "./prompt";
import {
  handleFinalizeItinerary,
  handleGetUserPreferences,
  handleSaveUserPreference,
  handleSearchPlaces,
  handleValidateTripConstraints,
  type TripContext,
} from "./toolHandlers";
import type { AgentTurnParams } from "./types";

/** Per-chat conversation history, so multi-turn context survives HTTP requests. */
const histories = new Map<string, Content[]>();

/** Gemini function declarations mirroring the shared tool handlers. */
const FUNCTION_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: "searchPlaces",
    description:
      "Search for hotels, restaurants or attractions. Results are automatically " +
      "restricted to the active geographical boundary.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        location: { type: Type.STRING, description: "City or area, e.g. 'Kyoto'" },
        type: { type: Type.STRING, enum: ["hotel", "restaurant", "attraction"] },
        query: { type: Type.STRING, description: "Optional keyword, e.g. 'vegetarian'" },
        maxPriceLevel: { type: Type.NUMBER, description: "1 (budget) to 4 (luxury)" },
      },
      required: ["location", "type"],
    },
  },
  {
    name: "getUserPreferences",
    description: "Retrieve the current user's saved trip preferences.",
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: "saveUserPreference",
    description: "Save or update a single user preference learned during the conversation.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        key: { type: Type.STRING, description: "Short preference name, e.g. 'diet'" },
        value: { type: Type.STRING, description: "The value, e.g. 'vegetarian'" },
      },
      required: ["key", "value"],
    },
  },
  {
    name: "validateTripConstraints",
    description:
      "Check whether a trip is financially realistic BEFORE planning. If not " +
      "feasible, warn the user and offer the returned alternatives.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        origin: { type: Type.STRING },
        destination: { type: Type.STRING },
        budget: { type: Type.NUMBER },
        days: { type: Type.NUMBER },
        partySize: { type: Type.NUMBER },
      },
      required: ["budget", "days", "partySize"],
    },
  },
  {
    name: "finalizeItinerary",
    description:
      "Submit the final, self-contained itinerary (no booking links). Every place " +
      "must be inside the active boundary, or it will be rejected.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        destination: { type: Type.STRING },
        summary: { type: Type.STRING },
        totalEstimatedCost: { type: Type.NUMBER },
        currency: { type: Type.STRING },
        days: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              date: { type: Type.STRING },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    time: { type: Type.STRING },
                    placeName: { type: Type.STRING },
                    placeType: { type: Type.STRING, enum: ["hotel", "restaurant", "attraction"] },
                    city: { type: Type.STRING },
                    state: { type: Type.STRING },
                    country: { type: Type.STRING },
                    note: { type: Type.STRING },
                    estimatedCost: { type: Type.NUMBER },
                  },
                  required: ["time", "placeName", "placeType", "city", "state", "country", "note", "estimatedCost"],
                },
              },
            },
            required: ["date", "items"],
          },
        },
      },
      required: ["destination", "summary", "totalEstimatedCost", "currency", "days"],
    },
  },
];

/** Returns true for transient errors that are worth retrying. */
function isRetryable(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("503") || msg.includes("UNAVAILABLE") || msg.includes("high demand") || msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED");
}

/** Waits ms milliseconds. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Routes a Gemini function call to the matching shared handler. */
async function dispatchTool(
  ctx: TripContext,
  name: string,
  args: Record<string, unknown>,
): Promise<object> {
  switch (name) {
    case "searchPlaces":
      return handleSearchPlaces(ctx, {
        location: String(args.location ?? ""),
        type: args.type as PlaceType,
        query: args.query as string | undefined,
        maxPriceLevel: args.maxPriceLevel as number | undefined,
      });
    case "getUserPreferences":
      return handleGetUserPreferences(ctx);
    case "saveUserPreference":
      return handleSaveUserPreference(ctx, {
        key: String(args.key ?? ""),
        value: String(args.value ?? ""),
      });
    case "validateTripConstraints":
      return handleValidateTripConstraints({
        origin: args.origin as string | undefined,
        destination: args.destination as string | undefined,
        budget: Number(args.budget ?? 0),
        days: Number(args.days ?? 0),
        partySize: Number(args.partySize ?? 0),
      });
    case "finalizeItinerary":
      return handleFinalizeItinerary(ctx, args as unknown as Itinerary);
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

/**
 * Runs one turn on Gemini via @google/genai: a function-calling loop that feeds
 * tool results back until the model produces a final text reply. Conversation
 * history is kept per chat in memory. Geofencing is enforced inside the
 * finalizeItinerary handler, so border adherence is guaranteed in code rather
 * than left to the model.
 */
export async function runGeminiTurn(params: AgentTurnParams): Promise<void> {
  const { chatId, userId, message, boundary, sink } = params;

  if (!config.geminiApiKey) {
    sink.error("GEMINI_API_KEY is not set. Add it to .env to enable the agent.");
    sink.done("");
    return;
  }

  const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });
  const ctx: TripContext = {
    userId,
    boundary,
    onItinerary: (itinerary) => sink.itinerary(itinerary),
  };
  const systemInstruction = buildSystemPrompt(boundary, ragAdapter.getPreferences(userId));

  const chat = ai.chats.create({
    model: config.geminiModel,
    config: {
      systemInstruction,
      tools: [{ functionDeclarations: FUNCTION_DECLARATIONS }],
    },
    history: histories.get(chatId) ?? [],
  });

  // Retry up to 3 times on transient Gemini overload errors.
  const MAX_RETRIES = 3;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      let response = await chat.sendMessage({ message });

      // Tool-calling loop: keep feeding tool results back until no more calls.
      for (let step = 0; step < 12; step++) {
        if (response.text && response.text.trim()) sink.text(response.text);

        const calls = response.functionCalls ?? [];
        if (calls.length === 0) break;

        const responseParts = [];
        for (const call of calls) {
          const name = call.name ?? "";
          sink.toolStart(`mcp__trip__${name}`);
          const result = await dispatchTool(ctx, name, call.args ?? {});
          responseParts.push({
            functionResponse: { name, response: result as Record<string, unknown> },
          });
        }
        response = await chat.sendMessage({ message: responseParts });
      }

      histories.set(chatId, chat.getHistory());
      sink.done(response.text ?? "");
      return;
    } catch (err) {
      if (isRetryable(err) && attempt < MAX_RETRIES) {
        await sleep(1500 * attempt); // 1.5s, 3s back-off
        continue;
      }
      const raw = err instanceof Error ? err.message : String(err);
      const friendly = isRetryable(err)
        ? "The AI service is temporarily overloaded. Please try again in a moment."
        : raw;
      sink.error(friendly);
      sink.done("");
      return;
    }
  }
}
