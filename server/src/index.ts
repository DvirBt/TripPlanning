import cors from "cors";
import express from "express";
import { config } from "./config";
import { runAgentTurn, type AgentEventSink } from "./agent/agentService";
import { requireAuth, type AuthedRequest } from "./auth/middleware";
import type { Boundary } from "./itinerary/types";
import { ragAdapter } from "./rag/ragAdapter";

const app = express();
app.use(cors());
app.use(express.json());

/** The authenticated user's stored preferences (useful for debugging RAG writes). */
app.get("/api/preferences", requireAuth, (req: AuthedRequest, res) => {
  res.json({ preferences: ragAdapter.getPreferences(req.userId!) });
});

/**
 * Chat endpoint. Streams the agent turn back as Server-Sent Events:
 *   event: text      -> a chunk of assistant prose
 *   event: tool      -> the agent invoked a tool (name)
 *   event: itinerary -> the final structured itinerary
 *   event: done      -> turn finished
 *   event: error     -> something went wrong
 */
app.post("/api/chat", requireAuth, async (req: AuthedRequest, res) => {
  const { chatId, message, boundary } = req.body ?? {};
  if (typeof chatId !== "string" || typeof message !== "string" || !boundary) {
    res.status(400).json({ error: "chatId, message and boundary are required" });
    return;
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
    message,
    boundary: boundary as Boundary,
    sink,
  });
});

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.listen(config.port, () => {
  console.log(`Trip planning server on http://localhost:${config.port}`);
});
