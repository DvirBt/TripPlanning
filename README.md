# AI-Powered Trip Planning System

A web app where users sign in, chat with an AI agent, and receive a self-contained,
budget-aware travel itinerary restricted to a geographical boundary they choose. The agent
is built on the Claude Agent SDK; recommendations are grounded in the user's saved
preferences (RAG) and place data.

This is a runnable MVP. Every external dependency (Google Sign-In via Firebase, Google
Places, the vector database) ships with an in-process mock, so the whole system runs offline.
The only key needed to power the live agent is an Anthropic API key.

## What it does (mapped to the PRD)

- Conversational planning that asks follow-up questions when the request is vague.
- Constraint validation that catches impossible requests (for example a $200 trip from the
  USA to Africa) and suggests realistic alternatives.
- Strict boundary adherence: recommendations are limited to the chosen country, state or city,
  enforced both at the data layer and by a PreToolUse hook in the agent.
- Personalization via a RAG preference store that is read before planning and updated when the
  user reveals new preferences.
- A self-contained, informational itinerary (no booking links) rendered day by day.

## Architecture

A modular monolith. One backend with four clear modules that map to the PRD's microservices,
plus a React frontend. See `docs/ARCHITECTURE.md` for the data flow and `server/README.md` /
`web/README.md` for details.

```
web/      React + Vite UI (login, chat, boundary, itinerary)
server/   Express backend
  auth/   authentication (mock + Firebase)
  agent/  Claude Agent SDK orchestration: tools, hooks, prompt, sessions
  rag/    preference vector store (retrieval + updating)
  places/ place search (mock + Google Places)
  geo/    geofencing boundary checks
```

## Quick start

Requirements: Node 18+ (tested on 20/24) and an LLM API key - either an Anthropic key
(default backend) or a Google Gemini key.

```
npm install
cp .env.example .env          # set a key (see "Agent backend" below); keep USE_MOCKS=true
npm run seed                  # seed the demo user's preferences (optional)
npm run dev                   # starts the API and the web app
```

### Agent backend (Claude or Gemini)

The agent can run on either LLM, selected with `AGENT_PROVIDER` in `.env`:

- `AGENT_PROVIDER=claude` (default) - uses the Claude Agent SDK; set `ANTHROPIC_API_KEY`.
- `AGENT_PROVIDER=gemini` - uses Google Gemini (`@google/genai`); set `GEMINI_API_KEY`.

Both backends share the same tools, system prompt, RAG store and boundary enforcement; only the
LLM call differs. See `docs/ARCHITECTURE.md`.

Open the web app (Vite prints the URL, default http://localhost:5173), click "Sign in with
Google" (mocked), set a boundary, and start chatting.

For step-by-step end-to-end checks (including the impossible-request and boundary-enforcement
cases), see `docs/VERIFICATION.md`.

## Useful scripts

- `npm run dev` - run backend and frontend together.
- `npm run seed` - seed demo preferences so RAG visibly affects results.
- `npm run typecheck` - typecheck the server.
- `npm run test` - run the server unit tests (geofence + constraints).

## Switching mocks for real services

Set `USE_MOCKS=false` in `.env` and provide the relevant keys. The adapter files document the
exact change needed:
- Firebase auth: `server/src/auth/firebaseAuth.ts`
- Google Places: `server/src/places/googlePlaces.ts`
- Vector database: swap the embedding/store in `server/src/rag/`
