# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Run from the repo root (npm workspaces: `server`, `web`).

- `npm run dev` — runs backend (`:8787`) and frontend (`:5173`) together via `concurrently`.
- `npm run build` — type-checks and builds the web app.
- `npm run typecheck` — `tsc --noEmit` on the server only.
- `npm run test` — server unit tests (`tsx --test src/**/*.test.ts`).
- `npm run seed` — seeds demo RAG preferences so personalization is visible.

Run a single test file from the `server` workspace:

```
npm test -w server -- src/geo/geofence.test.ts
```

Setup: `cp .env.example .env` and fill in `GEMINI_API_KEY`, `GOOGLE_CLIENT_ID` + `VITE_GOOGLE_CLIENT_ID` (same value), and `GOOGLE_PLACES_API_KEY`. The root `.env` is read by both workspaces (Vite uses `envDir: ".."`).

## Architecture

A modular monolith: an Express backend (`server/`) plus a React + Vite frontend (`web/`). The PRD's four microservices map to four backend modules. The frontend talks to `/api`; Vite proxies it to `:8787` in dev (single origin, no CORS issues).

### Request flow (one chat turn)

`POST /api/chat` (SSE) → `requireAuth` middleware → `agentService.runAgentTurn` → `geminiService.runGeminiTurn`. The agent runs a manual Gemini function-calling loop (max 12 steps), dispatching tools and feeding results back until the model returns final text. The endpoint streams Server-Sent Events: `text`, `tool`, `itinerary`, `done`, `error`.

### The two invariants that define this codebase

1. **Boundary adherence is enforced in code, not by the model — twice.** The user picks a boundary (`country` | `state` | `city` + value). The `places` adapter only returns in-boundary results (data layer), AND `handleFinalizeItinerary` re-checks every place via `geo/findBoundaryViolations` and rejects the call if any place is out of bounds (agent layer). When touching geofencing or finalize logic, preserve both layers — the "100% boundary adherence" guarantee must not depend on LLM behavior. Geofencing is a deterministic case-insensitive string match on the place's country/state/city field (`geo/geofence.ts`).

2. **The LLM backend is the only model-specific code.** `geminiService.ts` (`@google/genai`) is the swappable layer. Tool logic (`agent/toolHandlers.ts`), the system prompt (`agent/prompt.ts`), RAG, and geofencing are all backend-agnostic. Keep new business logic in the shared modules, not in `geminiService.ts`. Tool *handlers* are defined once in `toolHandlers.ts`; their Gemini schemas are mirrored separately in `FUNCTION_DECLARATIONS` in `geminiService.ts` — changing a tool's signature means editing both.

### Swappable adapters

Each external integration sits behind an adapter interface with a cached factory, so swapping the implementation touches one file:
- `places/placesAdapter.ts` → `googlePlaces.ts` (Google Places API)
- `auth/authAdapter.ts` → `googleAuth.ts` (verifies Google OAuth bearer token via `tokeninfo`)
- `rag/ragAdapter.ts` → `vectorStore.ts` (preference store; the swap point for a managed vector DB)

### RAG

`embeddings.ts` is a dependency-free bag-of-words hash embedding (256 dims) + cosine similarity — intentionally offline for the MVP; swap `embed()` for a real embeddings API and the vector store is unchanged. Preferences are injected into the system prompt at the start of each turn (the "retrieval" half) and written back via the `saveUserPreference` tool when the user reveals new ones. Per-chat conversation history lives **in memory** in `geminiService.ts` (`histories` map), keyed by `chatId` — back it with Redis/DB for production.

### Prompts

`server/prompts/*.md` are the source of truth for agent behavior, concatenated at runtime in `prompt.ts`: `system-prompt.md` + `itinerary-guide.md` + `constraint-guide.md` + `search-guide.md`, followed by dynamically injected boundary and user-preference blocks. Edit these markdown files to change agent rules — not the prompt-building code.
