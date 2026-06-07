# AI-Powered Trip Planning System

A web app where users sign in with Google, chat with an AI agent, and receive a self-contained,
budget-aware travel itinerary restricted to a geographical boundary they choose. The agent
is built on the Claude Agent SDK or Gemini; recommendations are grounded in the user's saved
preferences (RAG) and real place data from the Google Places API.

## What it does

- Conversational planning that asks follow-up questions when the request is vague.
- Constraint validation that catches impossible requests (for example a $200 trip from the
  USA to Africa) and suggests realistic alternatives.
- Strict boundary adherence: recommendations are limited to the chosen country, state or city,
  enforced both at the data layer and by a PreToolUse hook in the agent.
- Personalization via a RAG preference store that is read before planning and updated when the
  user reveals new preferences.
- A self-contained, informational itinerary (no booking links) covering restaurants and
  attractions. Hotels are available on request.

## Architecture

```
web/      React + Vite UI (login, chat, boundary, itinerary)
server/   Express backend
  auth/   Firebase Authentication (token verification)
  agent/  Claude Agent SDK / Gemini orchestration: tools, hooks, prompt, sessions
  rag/    preference vector store (retrieval + updating)
  places/ Google Places API integration
  geo/    geofencing boundary checks
```

## Quick start

Requirements: Node 18+, a Firebase project with Google Sign-In enabled, a Google Places API key,
and an LLM API key (Anthropic or Gemini).

```
npm install
cp .env.example .env   # fill in all required keys (see below)
npm run dev            # starts the API on :8787 and the web app on :5173
```

## Required environment variables

Copy `.env.example` to `.env` and fill in:

**Agent (one of):**
- `ANTHROPIC_API_KEY` — for `AGENT_PROVIDER=claude` (default)
- `GEMINI_API_KEY` — for `AGENT_PROVIDER=gemini`

**Firebase Admin SDK (backend token verification):**
- `FIREBASE_SERVICE_ACCOUNT` — service account JSON, pasted as a single line
- `FIREBASE_PROJECT_ID` — your Firebase project ID

**Google Places API:**
- `GOOGLE_PLACES_API_KEY`

**Firebase Web SDK (frontend, Vite):**
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_APP_ID`

### Firebase setup

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and create a project.
2. Enable **Authentication → Sign-in method → Google**.
3. Go to **Project Settings → Service accounts → Generate new private key** — download the JSON.
4. Paste the entire JSON (minified to one line) as `FIREBASE_SERVICE_ACCOUNT` in `.env`.
5. Go to **Project Settings → Your apps → Add web app** — copy the config values into the
   `VITE_FIREBASE_*` variables.

## Useful scripts

- `npm run dev` - run backend and frontend together.
- `npm run seed` - seed demo preferences so RAG visibly affects results.
- `npm run typecheck` - typecheck the server.
- `npm run test` - run the server unit tests (geofence + constraints).
