import { useState } from "react";
import type { ChatMessage } from "../types";
import { MessageList } from "./MessageList";

/**
 * The discussion panel: a titled chat with the trip advisor — transcript, tool
 * activity, and the composer. Presentational; the conversation state and
 * streaming live in the parent Planner.
 */
export function ChatWindow({
  messages,
  activity,
  sending,
  onSend,
}: {
  messages: ChatMessage[];
  activity: string;
  sending: boolean;
  onSend: (text: string) => void;
}) {
  const [input, setInput] = useState("");

  const submit = () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    onSend(text);
  };

  return (
    <div className="chat">
      <div className="chat-title">Discuss the trip</div>
      <MessageList messages={messages} activity={activity} />
      <div className="composer">
        <textarea
          value={input}
          placeholder="Chat with your trip advisor — ideas, questions, preferences..."
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          disabled={sending}
        />
        <button onClick={submit} disabled={sending}>
          {sending ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
}
