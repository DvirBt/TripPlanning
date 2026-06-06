/**
 * Maps a frontend chat id to the Claude Agent SDK session id so a multi-turn
 * conversation survives across separate HTTP requests. On the first turn there
 * is no session id; we capture it from the SDK's init message and reuse it via
 * the `resume` option on later turns.
 *
 * In-memory is fine for the MVP (one server process). A production deployment
 * would back this with Redis or a database keyed by user + chat.
 */
const chatToSession = new Map<string, string>();

export const sessionStore = {
  get(chatId: string): string | undefined {
    return chatToSession.get(chatId);
  },
  set(chatId: string, sessionId: string): void {
    chatToSession.set(chatId, sessionId);
  },
  clear(chatId: string): void {
    chatToSession.delete(chatId);
  },
};