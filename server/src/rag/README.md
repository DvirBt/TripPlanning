# RAG module

Purpose: ground recommendations in the user's preferences, and learn new ones during the
conversation. This is the PRD's RAG/Database service - retrieval plus dynamic updating.

## How it works

- `embeddings.ts` turns text into a fixed-size vector (a hashed bag-of-words) and provides
  cosine similarity. It is dependency-free so the app runs offline; it is the single swap point
  for a real embeddings API.
- `vectorStore.ts` stores per-user preference records (key, value, text, embedding) and persists
  them to `server/data/preferences.json`. Retrieval is cosine similarity against the query
  vector. This stands in for a managed vector database (Pinecone, Chroma, pgvector).
- `ragAdapter.ts` is the surface the agent uses: `getPreferences`, `savePreference`, `search`.
- `seed.ts` seeds a demo user so personalization is visible on first run (`npm run seed`).

## Retrieval and updating in the flow

Before each conversation the agent's prompt is primed with the user's stored preferences
(retrieval). When the user states a new or changed preference, the agent calls
`saveUserPreference`, which upserts it (updating). Inspect what is stored at any time via
`GET /api/preferences`.

## Swap to a real vector database

Replace the body of `vectorStore.ts` with calls to your vector DB and `embed()` with a real
embeddings model. `ragAdapter.ts` and everything above it stay unchanged.
