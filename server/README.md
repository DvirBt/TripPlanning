# Server

The trip-planning backend: an Express app that orchestrates Google Gemini and exposes a
small HTTP API. It is a modular monolith — see the per-module READMEs under `src/`.

## Run

From the repo root: `npm run dev` (runs this server and the web app). To run only the server:
`npm run dev -w server`. It listens on `PORT` (default 8787).

Environment is read in `src/config.ts` from `.env` (see `.env.example`). The agent needs
`GEMINI_API_KEY`; Google OAuth (`GOOGLE_CLIENT_ID`) and `GOOGLE_PLACES_API_KEY` are required for
auth and place search.

## Endpoints

- `GET /api/preferences` - the authenticated user's stored preferences.
- `POST /api/chat` - streams one agent turn as Server-Sent Events. Body:
  `{ chatId, message, boundary }`. Events: `text`, `tool`, `itinerary`, `done`, `error`.
- `GET /api/health` - liveness check.

## Layout

```
prompts/                     the agent's rules and methodology (loaded at runtime)
src/
  config.ts                  environment configuration
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
