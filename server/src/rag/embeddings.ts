/**
 * Lightweight, dependency-free text embedding.
 *
 * The PRD calls for a RAG/vector approach. To keep the MVP offline we embed
 * text into a fixed-size bag-of-words vector hashed into buckets, then compare
 * with cosine similarity. This is intentionally simple but real vector math -
 * good enough to retrieve the most relevant stored preferences.
 *
 * Swap point: replace embed() with a call to a real embeddings API (e.g.
 * Voyage, OpenAI, Cohere) and the vector store keeps working unchanged.
 */
const DIMENSIONS = 256;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function hashToken(token: string): number {
  let hash = 2166136261;
  for (let i = 0; i < token.length; i++) {
    hash ^= token.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash) % DIMENSIONS;
}

export function embed(text: string): number[] {
  const vector = new Array<number>(DIMENSIONS).fill(0);
  for (const token of tokenize(text)) {
    vector[hashToken(token)] += 1;
  }
  return vector;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}