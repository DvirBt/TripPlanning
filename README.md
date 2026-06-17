# AI-Powered Trip Planning System

A web app where users sign in with Google, chat with an AI agent, and receive a self-contained,
budget-aware travel itinerary restricted to a geographical boundary they choose. The agent is
powered by Google Gemini; recommendations are grounded in the user's saved preferences (RAG) and
real place data from the Google Places API.

## What it does

- Conversational planning that asks follow-up questions when the request is vague.
- Constraint validation that catches impossible requests (for example a $200 trip from the
  USA to Africa) and suggests realistic alternatives.
- Strict boundary adherence: recommendations are limited to the chosen country, state or city,
  enforced both at the data layer and in the finalize handler before an itinerary is accepted.
- Personalization via a RAG preference store that is read before planning and updated when the
  user reveals new preferences.
- A self-contained, informational itinerary (no booking links) covering restaurants and
  attractions. Hotels are available on request.

## Architecture

```
web/      React + Vite UI (login, chat, boundary, itinerary)
server/   Express backend
  auth/   Google OAuth token verification
  agent/  Google Gemini orchestration: tools, prompt, conversation history
  rag/    preference vector store (retrieval + updating)
  places/ Google Places API integration
  geo/    geofencing boundary checks
```

## Quick start

Requirements: Node 18+, a Google Cloud project with an OAuth 2.0 Client ID and the Places API
enabled, and a Google Gemini (Google AI Studio) API key.

```
npm install
cp .env.example .env   # fill in all required keys (see below)
npm run dev            # starts the API on :8787 and the web app on :5173
```

## Required environment variables

Copy `.env.example` to `.env` and fill in:

**Agent (Google Gemini):**
- `GEMINI_API_KEY` — create one at [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
- `GEMINI_MODEL` — defaults to `gemini-2.5-flash`

**Google OAuth (sign-in, used by both backend token verification and the frontend):**
- `GOOGLE_CLIENT_ID` — OAuth 2.0 Client ID (backend verifies the token was issued for it)
- `VITE_GOOGLE_CLIENT_ID` — the same Client ID, exposed to the frontend by Vite

**Google Places API:**
- `GOOGLE_PLACES_API_KEY`

### Google sign-in setup

1. Go to [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials).
2. Create an **OAuth 2.0 Client ID** (Web application).
3. Add `http://localhost:5173` to **Authorized JavaScript origins** and **Authorized redirect URIs**.
4. Put the Client ID in both `GOOGLE_CLIENT_ID` and `VITE_GOOGLE_CLIENT_ID`.
5. Enable the **Places API** for the project and create an API key for `GOOGLE_PLACES_API_KEY`.

The frontend obtains a Google access token via the popup sign-in flow and sends it as a bearer
token on every API request; the backend verifies it against Google's `tokeninfo` endpoint.

## Useful scripts

- `npm run dev` - run backend and frontend together.
- `npm run seed` - seed demo preferences so RAG visibly affects results.
- `npm run typecheck` - typecheck the server.
- `npm run test` - run the server unit tests (geofence + constraints).
