import type { Boundary } from "../itinerary/types";

/**
 * Per-chat geofence boundary, kept in memory and keyed by chatId (mirroring the
 * conversation `histories` map in geminiService). It is derived from the "where"
 * field and reused across every turn in the chat, so the boundary never has to
 * round-trip through the untrusted client. We remember which `where` produced it
 * so the country only has to be resolved again when the starting location
 * actually changes.
 *
 * Back this with Redis/DB for production, just like the histories map.
 */
interface ChatBoundary {
  where: string;
  boundary: Boundary;
}

const boundaries = new Map<string, ChatBoundary>();

export function setChatBoundary(chatId: string, where: string, boundary: Boundary): void {
  boundaries.set(chatId, { where, boundary });
}

export function getChatBoundary(chatId: string): ChatBoundary | undefined {
  return boundaries.get(chatId);
}
