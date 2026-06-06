import { useEffect, useRef } from "react";
import type { ChatMessage } from "../types";

/** Renders the running chat transcript plus a transient "tool activity" line. */
export function MessageList({
  messages,
  activity,
}: {
  messages: ChatMessage[];
  activity: string;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activity]);

  return (
    <div className="messages">
      {messages.map((m, i) => (
        <div key={i} className={`message ${m.role}`}>
          <div className="bubble">{m.text}</div>
        </div>
      ))}
      {activity && <div className="activity">{activity}</div>}
      <div ref={endRef} />
    </div>
  );
}
