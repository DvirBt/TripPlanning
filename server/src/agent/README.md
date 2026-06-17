# Agent module

Purpose: the orchestration "brain". It gives the model a focused set of tools, enforces the hard
rules, and streams the conversation back to the UI. This is where the PRD's conversational logic,
clarification, and constraint checking live.

## Backend

`agentService.ts` is a thin dispatcher that runs one conversational turn on Google Gemini:
- `geminiService.ts` - Google Gemini (`@google/genai`), a manual function-calling loop with
  per-chat in-memory history; geofencing enforced in the finalize handler.

The provider-agnostic tool logic lives in `toolHandlers.ts`, so the LLM backend stays a thin,
swappable layer. The notes below describe that shared behavior.

## How a turn works
1. Loads the user's preferences from the RAG module and builds the system prompt
   (`prompt.ts` = static rules in `prompts/system-prompt.md` + the active boundary + preferences).
2. Calls Gemini with the trip tools declared as function declarations and runs a function-calling
   loop, feeding tool results back until the model produces a final reply. Per-chat conversation
   history is kept in memory so multi-turn context survives across HTTP requests.
3. Forwards assistant text, tool activity and the final itinerary to the caller through an event
   sink (the HTTP layer turns these into SSE).

## The tools

- `searchPlaces` - place lookup, always filtered to the boundary.
- `getUserPreferences` / `saveUserPreference` - RAG read and write (dynamic personalization).
- `validateTripConstraints` - feasibility heuristic (`constraints.ts`) to catch impossible
  requests and propose alternatives.
- `finalizeItinerary` - submit the structured plan; the handler pushes it to the UI.

## Boundary enforcement

The `finalizeItinerary` handler (`toolHandlers.ts`) checks every place against the boundary
(`geo`) before accepting the plan; if any is out of bounds it rejects the call with a reason, and
the agent must fix the plan. This guarantees boundary adherence in code, regardless of the
model's behavior.

## Methodology

`prompts/system-prompt.md`, `prompts/itinerary-guide.md`, `prompts/constraint-guide.md` and
`prompts/search-guide.md` are loaded into the system prompt at runtime and carry the agent's
rules and methodology (itinerary building, constraint validation, search behavior).
