import { useRef, useState } from "react";
import { streamChat } from "../api/chat";
import type { Boundary, ChatMessage, Itinerary } from "../types";
import { MessageList } from "./MessageList";

const TOOL_LABELS: Record<string, string> = {
  mcp__trip__searchPlaces: "Searching places...",
  mcp__trip__getUserPreferences: "Recalling your preferences...",
  mcp__trip__saveUserPreference: "Saving a preference...",
  mcp__trip__validateTripConstraints: "Checking the budget is realistic...",
  mcp__trip__finalizeItinerary: "Putting the itinerary together...",
};

/**
 * Best-effort extraction of a destination from the user's message.
 * The server-side geofence passes when boundary.value is empty,
 * so this is purely additive — the agent handles the conversation.
 */
function extractDestination(text: string): string {
  const m = text.match(
    /\b(?:visit(?:ing)?|trip\s+to|going\s+to|travel(?:l?ing)?\s+to|go\s+to|explore|in)\s+([A-Z][a-zA-Z\s-]{1,30}?)(?=\s+for\b|\s+from\b|\s+with\b|\s+in\b|\s*[,.]|$)/i,
  );
  return m ? m[1].trim() : "";
}

/** The chat panel: transcript, tool activity, and the message composer. */
export function ChatWindow({
  token,
  onItinerary,
}: {
  token: string;
  onItinerary: (itinerary: Itinerary) => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      text: "Hi! Tell me about the trip you have in mind - where, when, how many people and your budget.",
    },
  ]);
  const [input, setInput] = useState("");
  const [activity, setActivity] = useState("");
  const [sending, setSending] = useState(false);
  const boundary = useRef<Boundary>({ level: "city", value: "" });
  const chatId = useRef<string>(`chat-${Math.random().toString(36).slice(2)}`);

  const appendToAssistant = (chunk: string) => {
    setMessages((prev) => {
      const next = [...prev];
      const last = next[next.length - 1];
      if (last && last.role === "assistant") {
        next[next.length - 1] = { ...last, text: (last.text ? last.text + "\n\n" : "") + chunk };
      } else {
        next.push({ role: "assistant", text: chunk });
      }
      return next;
    });
  };

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;

    // Try to extract a destination so the geofence can enforce it.
    const dest = extractDestination(text);
    if (dest) boundary.current = { level: "city", value: dest };

    setInput("");
    setSending(true);
    setMessages((prev) => [...prev, { role: "user", text }, { role: "assistant", text: "" }]);

    await streamChat(
      { token, chatId: chatId.current, message: text, boundary: boundary.current },
      {
        onText: (t) => appendToAssistant(t),
        onTool: (name) => setActivity(TOOL_LABELS[name] ?? "Working..."),
        onItinerary: (it) => onItinerary(it),
        onError: (msg) => appendToAssistant(`(error) ${msg}`),
        onDone: () => {
          setActivity("");
          setSending(false);
        },
      },
    );
  };

  return (
    <div className="chat">
      <MessageList messages={messages} activity={activity} />
      <div className="composer">
        <textarea
          value={input}
          placeholder="Describe your trip..."
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          disabled={sending}
        />
        <button onClick={() => void send()} disabled={sending}>
          {sending ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
}