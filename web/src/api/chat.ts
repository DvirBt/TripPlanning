import type { Itinerary, TripErrors } from "../types";

/** Partial trip fields sent as context with every turn (numbers may be omitted). */
export interface WireFields {
  where?: string;
  startDate?: string; // ISO yyyy-mm-dd
  endDate?: string; // ISO yyyy-mm-dd
  partySize?: number;
  budget?: number;
}

/**
 * Streams a chat turn from the backend. We use fetch + a stream reader (rather
 * than EventSource) because the request is a POST. The backend sends SSE-style
 * "event:"/"data:" frames which we parse and dispatch to the handlers.
 *
 * A turn is either "discuss" (a chat message to the advisor) or "plan" (the user
 * pressed Start planning). On plan the backend validates the fields and may
 * return `400 { errors }`, surfaced via `onValidationError`.
 */
export interface ChatHandlers {
  onText: (text: string) => void;
  onTool: (name: string) => void;
  onItinerary: (itinerary: Itinerary) => void;
  onValidationError: (errors: TripErrors) => void;
  onError: (message: string) => void;
  onDone: () => void;
}

export async function streamChat(
  params: {
    token: string;
    chatId: string;
    mode: "discuss" | "plan";
    message?: string;
    fields: WireFields;
  },
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
      mode: params.mode,
      fields: params.fields,
      ...(params.message !== undefined ? { message: params.message } : {}),
    }),
  });

  if (!res.ok || !res.body) {
    // A 400 from trip validation carries a field-error map.
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      /* not JSON */
    }
    const errors = (body as { errors?: TripErrors } | null)?.errors;
    if (errors) {
      handlers.onValidationError(errors);
    } else {
      const msg = (body as { error?: string } | null)?.error ?? `Request failed (${res.status})`;
      handlers.onError(msg);
    }
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
