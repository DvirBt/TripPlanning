import OpenAI from "openai";
import { config } from "../config";
import type { Itinerary, PlaceType } from "../itinerary/types";
import { ragAdapter } from "../rag/ragAdapter";
import { dispatchTool, FUNCTION_DECLARATIONS } from "./geminiService";
import { toOpenAITools } from "./openaiTools";
import { buildSystemPrompt } from "./prompt";
import type { TripContext } from "./toolHandlers";
import type { AgentTurnParams } from "./types";

type Message = OpenAI.Chat.Completions.ChatCompletionMessageParam;

/** Per-chat conversation history, mirroring the Gemini backend's `histories`. */
const histories = new Map<string, Message[]>();

/** OpenAI signals an exhausted credit balance / quota as 429 insufficient_quota. */
export function isOpenAIQuotaError(err: unknown): boolean {
  const e = err as { status?: number; code?: string | null };
  return e?.status === 429 && e?.code === "insufficient_quota";
}

/** Transient OpenAI failures worth retrying: rate limits (429) and 5xx. */
export function isOpenAIRetryable(err: unknown): boolean {
  if (isOpenAIQuotaError(err)) return false;
  const e = err as { status?: number };
  return e?.status === 429 || (typeof e?.status === "number" && e.status >= 500);
}

/** Waits ms milliseconds. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Runs one turn on OpenAI via the Chat Completions tool-calling loop. This is
 * the OpenAI sibling of runGeminiTurn: it reuses the shared system prompt, tool
 * handlers (dispatchTool) and tool schemas (converted from FUNCTION_DECLARATIONS),
 * so all business logic and the geofencing guarantee stay backend-agnostic.
 */
export async function runOpenAITurn(params: AgentTurnParams): Promise<void> {
  const { chatId, userId, message, boundary, mode, fields, sink } = params;

  if (!config.openaiApiKey) {
    sink.error("OPENAI_API_KEY is not set. Add it to .env to use the ChatGPT backend.");
    sink.done("");
    return;
  }

  const client = new OpenAI({ apiKey: config.openaiApiKey });
  let itineraryEmitted = false;
  const ctx: TripContext = {
    userId,
    boundary,
    onItinerary: (itinerary) => {
      itineraryEmitted = true;
      sink.itinerary(itinerary);
    },
  };

  const systemInstruction = buildSystemPrompt(
    boundary,
    ragAdapter.getPreferences(userId),
    mode,
    fields,
  );

  // In discussion mode the agent must not finalize — drop the tool entirely so
  // the "no itinerary until Start planning" guarantee holds in code, not prompt.
  const tools = toOpenAITools(
    mode === "plan"
      ? FUNCTION_DECLARATIONS
      : FUNCTION_DECLARATIONS.filter((d) => d.name !== "finalizeItinerary"),
  );

  // Rebuild the system prompt fresh each turn (boundary/mode/fields change);
  // prior turns are restored from the per-chat history without their system msg.
  const messages: Message[] = [
    { role: "system", content: systemInstruction },
    ...(histories.get(chatId) ?? []),
    { role: "user", content: message },
  ];

  // Tool-calling loop: keep feeding tool results back until no more calls.
  const runToolLoop = async (): Promise<string> => {
    let lastText = "";
    for (let step = 0; step < 12; step++) {
      const completion = await client.chat.completions.create({
        model: config.openaiModel,
        messages,
        tools,
      });
      const choice = completion.choices[0]?.message;
      if (!choice) break;
      messages.push(choice);

      if (choice.content) {
        lastText = choice.content;
        sink.text(choice.content);
      }

      const toolCalls = choice.tool_calls ?? [];
      if (toolCalls.length === 0) break;

      for (const call of toolCalls) {
        if (call.type !== "function") continue;
        const name = call.function.name;
        sink.toolStart(`mcp__trip__${name}`);
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(call.function.arguments || "{}");
        } catch {
          /* malformed arguments -> let the handler reject empty input */
        }
        const dispatchArgs =
          name === "searchPlaces"
            ? { ...args, type: args.type as PlaceType }
            : name === "finalizeItinerary"
              ? (args as unknown as Itinerary)
              : args;
        const result = await dispatchTool(ctx, name, dispatchArgs as Record<string, unknown>);
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(result),
        });
      }
    }
    return lastText;
  };

  const MAX_RETRIES = 3;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      let finalText = await runToolLoop();

      // Safety net: in plan mode the user already confirmed by pressing Start
      // planning, so a turn that ends without an itinerary gets one firm nudge.
      if (mode === "plan" && !itineraryEmitted) {
        messages.push({
          role: "user",
          content:
            "You have not finalized the itinerary yet. The user already pressed 'Start planning', so do not ask for confirmation. Unless validateTripConstraints showed the trip is infeasible, call finalizeItinerary NOW with the complete day-by-day plan covering every day — deliver it through the finalizeItinerary tool, not as chat prose.",
        });
        finalText = (await runToolLoop()) || finalText;
      }

      // Persist everything after the system message for the next turn.
      histories.set(chatId, messages.slice(1));
      sink.done(finalText);
      return;
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      if (isOpenAIQuotaError(err)) {
        console.error(`[openai] usage quota exhausted: ${raw}`);
        sink.error(
          "You've reached your OpenAI usage limit (insufficient quota — the API key is out of credits). " +
            "Check your plan and billing at https://platform.openai.com/account/billing",
        );
        sink.done("");
        return;
      }
      if (isOpenAIRetryable(err) && attempt < MAX_RETRIES) {
        console.warn(`[openai] retryable error (attempt ${attempt}/${MAX_RETRIES}): ${raw}`);
        await sleep(1500 * attempt); // 1.5s, 3s back-off
        continue;
      }
      console.error(`[openai] turn failed after ${attempt} attempt(s): ${raw}`);
      const friendly = isOpenAIRetryable(err)
        ? "The AI service is temporarily overloaded. Please try again in a moment."
        : raw;
      sink.error(friendly);
      sink.done("");
      return;
    }
  }
}
