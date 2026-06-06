# Server

The trip-planning backend: an Express app that orchestrates the Claude Agent SDK and exposes a
small HTTP API. It is a modular monolith - see the per-module READMEs under `src/`.

## Run

From the repo root: `npm run dev` (runs this server and the web app). To run only the server:
`npm run dev -w server`. It listens on `PORT` (default 8787).

Environment is read in `src/config.ts` from `.env` (see `.env.example`). The key flag is
`USE_MOCKS`: when true (default) auth, places and the vector store use in-process mocks.
`AGENT_PROVIDER` selects the LLM backend: `claude` (needs `ANTHROPIC_API_KEY`) or `gemini`
(needs `GEMINI_API_KEY`).

## Endpoints

- `POST /api/auth/session` - mock Google sign-in; returns a bearer token and user. Disabled
  when `USE_MOCKS=false`.
- `GET /api/preferences` - the authenticated user's stored preferences (proves RAG writes).
- `POST /api/chat` - streams one agent turn as Server-Sent Events. Body:
  `{ chatId, message, boundary }`. Events: `text`, `tool`, `itinerary`, `done`, `error`.
- `GET /api/health` - liveness and the current mock mode.

## Layout

```
prompts/system-prompt.md     the agent's rules (loaded at runtime)
.claude/skills/              Agent Skills discovered by the SDK
src/
  config.ts                  environment + USE_MOCKS
  index.ts                   Express app and routes
  itinerary/types.ts         shared domain types
  auth/  agent/  rag/  places/  geo/   the modules (each has its own README)
data/                        JSON persistence for the vector store
```

## Scripts

- `npm run dev` - watch-run the server with tsx.
- `npm run seed` - seed demo preferences.
- `npm run typecheck` - `tsc --noEmit`.
- `npm run test` - unit tests (node:test via tsx).
