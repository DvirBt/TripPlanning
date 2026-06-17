# Architecture

The system is a modular monolith. The PRD describes four backend microservices; here they are
four modules inside one Express server, which keeps the MVP simple to run while preserving the
same separation of concerns. A React frontend talks to the backend over a single `/api` origin
(Vite proxies it in development).

## Modules and how they map to the PRD

| PRD service              | Module            | Responsibility                                            |
|--------------------------|-------------------|-----------------------------------------------------------|
| Frontend UI              | `web/`            | Login, chat, boundary selection, itinerary rendering      |
| Authentication Service   | `server/src/auth` | Verify the user's Google OAuth access token               |
| Agent/Orchestration      | `server/src/agent`| Google Gemini: tools, prompt, conversation history        |
| RAG/Database Service     | `server/src/rag`  | Store and retrieve user preferences as vectors            |
| External Integration     | `server/src/places`| Search places via Google Places API                      |
| (cross-cutting rule)     | `server/src/geo`  | Geofencing: is a place inside the boundary?               |

## Request flow (one chat turn)

1. The browser sends `POST /api/chat` with the bearer token, a `chatId`, the user `message`
   and the active `boundary`.
2. `auth` middleware verifies the token and resolves the `userId`.
3. `agentService` retrieves the user's preferences from `rag` and builds the system prompt
   (static rules in `prompts/system-prompt.md` plus the boundary and preferences).
4. `geminiService` calls Gemini with the trip tools declared as function declarations and runs a
   function-calling loop, reusing the in-memory conversation history for this chat.
5. As the agent works it calls tools:
   - `searchPlaces` -> `places` adapter, filtered to the boundary by `geo`.
   - `validateTripConstraints` -> feasibility heuristic.
   - `getUserPreferences` / `saveUserPreference` -> `rag`.
   - `finalizeItinerary` -> the handler re-checks every place against the boundary; if all pass,
     it emits the structured itinerary to the UI.
6. The backend streams Server-Sent Events back to the browser: assistant text, tool activity,
   the final itinerary, and a done marker.

## Two layers of boundary enforcement

Border adherence is guaranteed twice, independently:
- Data layer: the places adapter only returns places inside the boundary.
- Agent layer: the `finalizeItinerary` handler rejects the call if any proposed place is out of
  bounds, forcing the agent to correct the plan.

This means the "100% boundary adherence" metric does not depend on the language model behaving.

## Sessions

A chat is multi-turn. `agent/geminiService.ts` keeps the conversation history per `chatId` in
memory, so context carries across separate HTTP requests. In-memory for the MVP; back it with
Redis or a database for production.

## LLM backend

The agent runs on Google Gemini:
- `agent/geminiService.ts` - Google Gemini (`@google/genai`), a manual function-calling loop,
  in-memory per-chat history, boundary enforced inside the finalize handler.
- `agent/agentService.ts` - the thin entry point that runs one turn.

The LLM call is the only model-specific code; the tool logic (`agent/toolHandlers.ts`), system
prompt (`agent/prompt.ts`), RAG store, and geofencing (`geo/findBoundaryViolations`) are all
backend-agnostic, so the model layer stays swappable.

## Prompt and methodology

- Prompt: `server/prompts/system-prompt.md` is the single source of truth for the agent's rules.
- Methodology: `server/prompts/itinerary-guide.md`, `constraint-guide.md` and `search-guide.md`
  are loaded into the system prompt at runtime (itinerary building, constraint validation, search).
- Boundary enforcement: the `finalizeItinerary` handler in `agent/toolHandlers.ts` re-checks every
  place against the boundary before accepting a plan.
