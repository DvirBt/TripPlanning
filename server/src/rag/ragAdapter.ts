import { vectorStore } from "./vectorStore";

/**
 * RAG adapter: the read/write surface the agent uses to ground recommendations
 * in the user's preferences. It wraps the vector store so a future swap to a
 * managed vector DB only touches vectorStore.ts.
 */
export interface Preference {
  key: string;
  value: string;
}

export const ragAdapter = {
  /** All known preferences for a user (used to prime the conversation). */
  getPreferences(userId: string): Preference[] {
    return vectorStore.all(userId).map(({ key, value }) => ({ key, value }));
  },

  /** Persist a new or updated preference learned during the conversation. */
  savePreference(userId: string, key: string, value: string): void {
    vectorStore.upsert(userId, key, value);
  },

  /** Retrieve the preferences most relevant to a free-text query. */
  search(userId: string, queryText: string): Preference[] {
    return vectorStore
      .search(userId, queryText)
      .map(({ key, value }) => ({ key, value }));
  },
};