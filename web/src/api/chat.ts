import type { Boundary, Itinerary } from "../types";

/**
 * Streams a chat turn from the backend. We use fetch + a stream reader (rather
 * than EventSource) because the request is a POST. The backend sends SSE-style
 * "event:"/"data:" frames which we parse and dispatch to the handlers.
 */
export interface ChatHandlers {
  onText: (text: string) => void;
  onTool: (name: string) => void;
  onItinerary: (itinerary: Itinerary) => void;
  onError: (message: string) => void;
  onDone: () => void;
}

export async function streamChat(
  params: { token: string; chatId: string; message: string; boundary: Boundary },
  handlers: ChatHandlers,
): Promise<void> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.token}`,
    },
    body: JSON.stringify({
      chatId: params.chatId,
      message: params.message,
      boundary: params.boundary,
    }),
  });

  if (!res.ok || !res.body) {
    handlers.onError(`Request failed (${res.status})`);
    handlers.onDone();
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const dispatch = (event: string, data: string) => {
    let payload: unknown = {};
    try {
      payload = JSON.parse(data);
    } catch {
      /* ignore malformed frame */
    }
    switch (event) {
      case "text":
        handlers.onText((payload as { text: string }).text);
        break;
      case "tool":
        handlers.onTool((payload as { name: string }).name);
        break;
      case "itinerary":
        handlers.onItinerary(payload as Itinerary);
        break;
      case "error":
        handlers.onError((payload as { message: string }).message);
        break;
      case "done":
        handlers.onDone();
        break;
    }
  };

  // Parse the SSE stream frame by frame (frames separated by a blank line).
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";
    for (const frame of frames) {
      let event = "message";
      let data = "";
      for (const line of frame.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) data += line.slice(5).trim();
      }
      if (data) dispatch(event, data);
    }
  }
}
