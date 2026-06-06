import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { cosineSimilarity, embed } from "./embeddings";

/**
 * A minimal per-user vector store with JSON-file persistence. Each record is a
 * preference ("key: value") with its embedding. Retrieval is cosine similarity
 * against the query embedding.
 *
 * Storage is one JSON file at server/data/preferences.json. This stands in for
 * a managed vector database (Pinecone, Chroma, pgvector); the public methods
 * are what a swap would have to preserve.
 */
export interface PreferenceRecord {
  key: string;
  value: string;
  text: string; // "key: value", the embedded text
  embedding: number[];
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = resolve(__dirname, "../../data/preferences.json");

type Store = Record<string, PreferenceRecord[]>; // userId -> records

function load(): Store {
  if (!existsSync(DATA_FILE)) return {};
  try {
    return JSON.parse(readFileSync(DATA_FILE, "utf8")) as Store;
  } catch {
    return {};
  }
}

function save(store: Store): void {
  mkdirSync(dirname(DATA_FILE), { recursive: true });
  writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), "utf8");
}

export const vectorStore = {
  /** Insert or update a preference by key for a user. */
  upsert(userId: string, key: string, value: string): void {
    const store = load();
    const records = store[userId] ?? [];
    const text = `${key}: ${value}`;
    const record: PreferenceRecord = { key, value, text, embedding: embed(text) };
    const idx = records.findIndex((r) => r.key === key);
    if (idx >= 0) records[idx] = record;
    else records.push(record);
    store[userId] = records;
    save(store);
  },

  /** Return all stored preferences for a user (no ranking). */
  all(userId: string): PreferenceRecord[] {
    return load()[userId] ?? [];
  },

  /** Return the top-k preferences most relevant to queryText. */
  search(userId: string, queryText: string, k = 5): PreferenceRecord[] {
    const records = load()[userId] ?? [];
    if (records.length === 0) return [];
    const queryVec = embed(queryText);
    return records
      .map((r) => ({ r, score: cosineSimilarity(queryVec, r.embedding) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, k)
      .map((x) => x.r);
  },
};