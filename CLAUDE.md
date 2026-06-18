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

`POST /api/chat` (SSE) → `requireAuth` middleware → `agentService.runAgentTurn` → the chosen backend (`geminiService.runGeminiTurn` or `openaiService.runOpenAITurn`). Each backend runs a manual function-calling loop (max 12 steps), dispatching tools and feeding results back until the model returns final text. The endpoint streams Server-Sent Events: `text`, `tool`, `itinerary`, `done`, `error`.

**Backend selection.** Each turn carries a `provider` (`"gemini" | "openai"`) chosen by the model selector in the top-right of the UI; `agentService.runAgentTurn` routes on it, falling back to `config.llmProvider` (env `LLM_PROVIDER`) when unset. Both backends share `dispatchTool`, `buildSystemPrompt`, RAG, and geofencing — only the loop and SDK calls differ.

**Two-phase flow.** The frontend `Planner` component owns the session: a structured fields form (`where`, `startDate`, `endDate`, `partySize`, `budget`) on top, a "Start planning" button, and the advisor chat below. Every `/api/chat` turn carries a `mode` and the current `fields`:
- `mode: "discuss"` — a free-text chat `message`. The agent is a chatty advisor; `geminiService` **removes the `finalizeItinerary` tool** in this mode so no itinerary can be produced until planning. The advisor may `searchPlaces` to ground suggestions and asks the user to fill any missing fields.
- `mode: "plan"` — triggered by "Start planning". The fields are validated by `trip/tripParams.validateTripParams` (pure, mirrored client-side in `web/src/trip/validation.ts` and `web/src/trip/dates.ts` for the dd/mm/yyyy ↔ ISO conversion — backend is the source of truth); on failure the endpoint returns `400 { errors: { field } }` before streaming. The button stays disabled until all fields are valid. A valid plan turn builds and finalizes the itinerary using the fields plus the full discussion history.

The current `fields` are injected into the system prompt each turn (`prompt.buildSystemPrompt(boundary, prefs, mode, fields)`), and the boundary is resolved/cached from `where` per `chatId` via `ensureBoundary` in `index.ts`.

### The two invariants that define this codebase

1. **Boundary adherence is enforced in code, not by the model — twice.** The user enters a starting location ("where") in the intake form; the backend resolves it to a **country-level** boundary via `placesAdapter.resolveCountry` (a soft anchor — the trip roams the whole country, with wider scope expressed in the chat). The `places` adapter only returns in-boundary results (data layer), AND `handleFinalizeItinerary` re-checks every place via `geo/findBoundaryViolations` and rejects the call if any place is out of bounds (agent layer). When touching geofencing or finalize logic, preserve both layers — the "100% boundary adherence" guarantee must not depend on LLM behavior. Geofencing is a deterministic case-insensitive string match on the place's country/state/city field (`geo/geofence.ts`). The resolved boundary is stored per `chatId` in `trip/boundaryStore.ts` (in-memory, like the `histories` map) so chat follow-ups reuse it; if country resolution fails it falls back to a city-level boundary on the raw input.

2. **The LLM backend is the only model-specific code.** `geminiService.ts` (`@google/genai`) and `openaiService.ts` (`openai`) are the two swappable backends behind `agentService`. Tool logic (`agent/toolHandlers.ts`), the system prompt (`agent/prompt.ts`), RAG, and geofencing are all backend-agnostic — keep new business logic in the shared modules, not in a backend. Tool *handlers* are defined once in `toolHandlers.ts` and routed by the shared `dispatchTool` (in `geminiService.ts`). Tool *schemas* have a single source of truth: `FUNCTION_DECLARATIONS` (Gemini shape) in `geminiService.ts`, converted to OpenAI tool shape by `agent/openaiTools.ts` (`toOpenAITools`, which deep-lowercases the JSON-Schema `type` fields). Changing a tool's signature means editing the handler and `FUNCTION_DECLARATIONS` — the OpenAI side follows automatically. Each backend keeps its own in-memory `histories` map (per `chatId`), so switching providers mid-chat starts a fresh history for that backend.

### Swappable adapters

Each external integration sits behind an adapter interface with a cached factory, so swapping the implementation touches one file:
- `places/placesAdapter.ts` → `googlePlaces.ts` (Google Places API)
- `auth/authAdapter.ts` → `googleAuth.ts` (verifies Google OAuth bearer token via `tokeninfo`)
- `rag/ragAdapter.ts` → `vectorStore.ts` (preference store; the swap point for a managed vector DB)

### RAG

`embeddings.ts` is a dependency-free bag-of-words hash embedding (256 dims) + cosine similarity — intentionally offline for the MVP; swap `embed()` for a real embeddings API and the vector store is unchanged. Preferences are injected into the system prompt at the start of each turn (the "retrieval" half) and written back via the `saveUserPreference` tool when the user reveals new ones. Per-chat conversation history lives **in memory** in `geminiService.ts` (`histories` map), keyed by `chatId` — back it with Redis/DB for production.

### Prompts

`server/prompts/*.md` are the source of truth for agent behavior, concatenated at runtime in `prompt.ts`: `system-prompt.md` + `itinerary-guide.md` + `constraint-guide.md` + `search-guide.md`, followed by dynamically injected boundary and user-preference blocks. Edit these markdown files to change agent rules — not the prompt-building code.
