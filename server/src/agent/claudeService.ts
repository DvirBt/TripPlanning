import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  query,
  type CanUseTool,
  type PermissionResult,
} from "@anthropic-ai/claude-agent-sdk";
import { config } from "../config";
import { ragAdapter } from "../rag/ragAdapter";
import { buildHooks } from "./hooks";
import { buildSystemPrompt } from "./prompt";
import { sessionStore } from "./sessionStore";
import { buildTripServer } from "./tools";
import type { TripContext } from "./toolHandlers";
import type { AgentTurnParams } from "./types";

const __dirname = dirname(fileURLToPath(import.meta.url));
/** server/ directory - cwd for the SDK so .claude/skills are discovered. */
const SERVER_DIR = resolve(__dirname, "../..");

/** Only the trip tools and skills may run; everything else is denied. */
const canUseTool: CanUseTool = async (toolName): Promise<PermissionResult> => {
  if (toolName.startsWith("mcp__trip__") || toolName === "Skill") {
    return { behavior: "allow" };
  }
  return { behavior: "deny", message: `Tool ${toolName} is not available to this agent.` };
};

/**
 * Runs one turn on the Claude Agent SDK: builds the per-request tool server and
 * PreToolUse hook, resumes the SDK session for this chat if one exists, and
 * streams assistant text, tool activity and the final itinerary to the sink.
 */
export async function runClaudeTurn(params: AgentTurnParams): Promise<void> {
  const { chatId, userId, message, boundary, sink } = params;

  if (!config.anthropicApiKey) {
    sink.error("ANTHROPIC_API_KEY is not set. Add it to .env to enable the agent.");
    sink.done("");
    return;
  }

  const preferences = ragAdapter.getPreferences(userId);
  const systemPrompt = buildSystemPrompt(boundary, preferences);

  const ctx: TripContext = {
    userId,
    boundary,
    onItinerary: (itinerary) => sink.itinerary(itinerary),
  };
  const tripServer = buildTripServer(ctx);
  const resume = sessionStore.get(chatId);

  try {
    const response = query({
      prompt: message,
      options: {
        model: config.agentModel,
        systemPrompt: { type: "preset", preset: "claude_code", append: systemPrompt },
        mcpServers: { trip: tripServer },
        hooks: buildHooks(boundary),
        canUseTool,
        settingSources: ["project"],
        cwd: SERVER_DIR,
        maxTurns: 30,
        ...(resume ? { resume } : {}),
      },
    });

    let resultText = "";
    for await (const msg of response) {
      if (msg.session_id) sessionStore.set(chatId, msg.session_id);

      if (msg.type === "assistant") {
        const blocks = msg.message.content as unknown as Array<{
          type: string;
          text?: string;
          name?: string;
        }>;
        for (const block of blocks) {
          if (block.type === "text" && block.text && block.text.trim()) {
            sink.text(block.text);
          } else if (block.type === "tool_use" && block.name) {
            sink.toolStart(block.name);
          }
        }
      } else if (msg.type === "result") {
        resultText = msg.subtype === "success" ? msg.result : "";
        if (msg.subtype !== "success") {
          sink.error(`Agent stopped: ${msg.subtype}`);
        }
      }
    }
    sink.done(resultText);
  } catch (err) {
    sink.error(err instanceof Error ? err.message : String(err));
    sink.done("");
  }
}
