# Agent module

Purpose: the orchestration "brain". It gives the model a focused set of tools, enforces the hard
rules, and streams the conversation back to the UI. This is where the PRD's conversational logic,
clarification, and constraint checking live.

## Two interchangeable backends

`agentService.ts` is a thin dispatcher that picks an LLM backend from `AGENT_PROVIDER`:
- `claudeService.ts` - Claude Agent SDK (`query()`), in-process MCP tools (`tools.ts`),
  PreToolUse hook (`hooks.ts`), filesystem skills, SDK session resume.
- `geminiService.ts` - Google Gemini (`@google/genai`), a manual function-calling loop with
  per-chat in-memory history; geofencing enforced in the finalize handler.

Both call the same provider-agnostic tool logic in `toolHandlers.ts`, so they behave identically.
The notes below describe that shared behavior.

## How a turn works
1. Loads the user's preferences from the RAG module and builds the system prompt
   (`prompt.ts` = static rules in `prompts/system-prompt.md` + the active boundary + preferences).
2. Builds a per-request in-process MCP tool server (`tools.ts`) and a PreToolUse hook
   (`hooks.ts`), then calls the SDK `query()`. It resumes the SDK session for this chat if one
   exists (`sessionStore.ts`), so multi-turn context survives across HTTP requests.
3. Iterates the SDK message stream and forwards assistant text, tool activity and the final
   itinerary to the caller through an event sink (the HTTP layer turns these into SSE).

A `canUseTool` callback restricts the agent to the trip tools and Skills only; all other
built-in tools are denied.

## The tools (seen by the model as `mcp__trip__*`)

- `searchPlaces` - place lookup, always filtered to the boundary.
- `getUserPreferences` / `saveUserPreference` - RAG read and write (dynamic personalization).
- `validateTripConstraints` - feasibility heuristic (`constraints.ts`) to catch impossible
  requests and propose alternatives.
- `finalizeItinerary` - submit the structured plan; the handler pushes it to the UI.

## The hook (enforcement)

`hooks.ts` registers a PreToolUse hook matching `finalizeItinerary`. Before the tool runs it
checks every place against the boundary (`geo`); if any is out of bounds it denies the call with
a reason, and the agent must fix the plan. This guarantees boundary adherence regardless of the
model's behavior.

## Skills

`prompts/system-prompt.md` references methodology that lives in `.claude/skills/`
(`itinerary-builder`, `constraint-validator`). The SDK discovers these because `agentService`
sets `settingSources: ['project']` and `cwd` to the server directory.
