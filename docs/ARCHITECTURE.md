# Architecture

The system is a modular monolith. The PRD describes four backend microservices; here they are
four modules inside one Express server, which keeps the MVP simple to run while preserving the
same separation of concerns. A React frontend talks to the backend over a single `/api` origin
(Vite proxies it in development).

## Modules and how they map to the PRD

| PRD service              | Module            | Responsibility                                            |
|--------------------------|-------------------|-----------------------------------------------------------|
| Frontend UI              | `web/`            | Login, chat, boundary selection, itinerary rendering      |
| Authentication Service   | `server/src/auth` | Verify the user's Firebase ID token                       |
| Agent/Orchestration      | `server/src/agent`| Claude Agent SDK: tools, hooks, prompt, session state     |
| RAG/Database Service     | `server/src/rag`  | Store and retrieve user preferences as vectors            |
| External Integration     | `server/src/places`| Search places via Google Places API                      |
| (cross-cutting rule)     | `server/src/geo`  | Geofencing: is a place inside the boundary?               |

## Request flow (one chat turn)

1. The browser sends `POST /api/chat` with the bearer token, a `chatId`, the user `message`
   and the active `boundary`.
2. `auth` middleware verifies the token and resolves the `userId`.
3. `agentService` retrieves the user's preferences from `rag` and builds the system prompt
   (static rules in `prompts/system-prompt.md` plus the boundary and preferences).
4. It builds a per-request in-process tool server (`agent/tools.ts`) and a PreToolUse hook
   (`agent/hooks.ts`), then calls the Claude Agent SDK `query()`, resuming the SDK session for
   this chat if one exists.
5. As the agent works it calls tools:
   - `searchPlaces` -> `places` adapter, filtered to the boundary by `geo`.
   - `validateTripConstraints` -> feasibility heuristic.
   - `getUserPreferences` / `saveUserPreference` -> `rag`.
   - `finalizeItinerary` -> the PreToolUse hook first re-checks every place against the
     boundary; if all pass, the handler emits the structured itinerary to the UI.
6. The backend streams Server-Sent Events back to the browser: assistant text, tool activity,
   the final itinerary, and a done marker.

## Two layers of boundary enforcement

Border adherence is guaranteed twice, independently:
- Data layer: the places adapter only returns places inside the boundary.
- Agent layer: the PreToolUse hook denies `finalizeItinerary` if any proposed place is out of
  bounds, forcing the agent to correct the plan.

This means the "100% boundary adherence" metric does not depend on the language model behaving.

## Sessions

A chat is multi-turn. `agent/sessionStore.ts` maps the frontend `chatId` to the Claude Agent
SDK session id (captured from the SDK's messages) and passes it as `resume` on later turns, so
context carries across separate HTTP requests. In-memory for the MVP; back it with Redis or a
database for production.

## Pluggable LLM backend

The agent runs on either Claude or Gemini, chosen by `AGENT_PROVIDER`:
- `agent/claudeService.ts` - Claude Agent SDK (`query()`), in-process MCP tools, PreToolUse hook,
  filesystem skills, SDK session resume.
- `agent/geminiService.ts` - Google Gemini (`@google/genai`), a manual function-calling loop,
  in-memory per-chat history, boundary enforced inside the finalize handler.
- `agent/agentService.ts` - the dispatcher that picks one based on config.

Both call the same provider-agnostic tool logic in `agent/toolHandlers.ts`, the same system
prompt (`agent/prompt.ts`), the same RAG store, and the same geofencing
(`geo/findBoundaryViolations`). Swapping providers does not change behavior the user sees.

## Skills, hooks and prompt

These are the Claude Agent SDK primitives that carry the core logic:
- Prompt: `server/prompts/system-prompt.md` is the single source of truth for the agent's rules.
- Skills: `server/.claude/skills/*` provide methodology (itinerary building, constraint
  validation). The SDK discovers them because `agentService` sets `settingSources: ['project']`
  and `cwd` to the server directory.
- Hook: `server/src/agent/hooks.ts` enforces geofencing at the `finalizeItinerary` gate.
