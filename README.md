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

The frontend obtains a Google access token via the popup sign-in flow and sends it as a bearer
token on every API request; the backend verifies it against Google's `tokeninfo` endpoint. See
[Getting your API keys](#getting-your-api-keys) below for step-by-step instructions.

## Useful scripts

- `npm run dev` - run backend and frontend together.
- `npm run seed` - seed demo preferences so RAG visibly affects results.
- `npm run typecheck` - typecheck the server.
- `npm run test` - run the server unit tests (geofence + constraints).

## Getting your API keys

You need three values, all from Google. Never commit them — keep them only in `.env`, which is
git-ignored.

### 1. `GEMINI_API_KEY` — the AI agent

1. Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey) and sign in.
2. Click **Create API key** (pick a Google Cloud project, or let it create one).
3. Copy the key into `GEMINI_API_KEY`.

`GEMINI_MODEL` defaults to `gemini-2.5-flash`; leave it unless you want a different model.

### 2. `GOOGLE_CLIENT_ID` + `VITE_GOOGLE_CLIENT_ID` — Google sign-in

These two are the **same value** (backend verification + frontend), used twice.

1. Open the [Google Cloud Console](https://console.cloud.google.com/) and create a project (top
   bar → project dropdown → **New Project**), or select an existing one.
2. One-time consent screen: **APIs & Services → OAuth consent screen** → choose **External** →
   fill in app name and your email → **Save**. Under **Audience / Test users**, add the Google
   account you'll sign in with (required while the app is unpublished).
3. **APIs & Services → Credentials → + Create Credentials → OAuth client ID**.
4. **Application type: Web application**.
5. Under **Authorized JavaScript origins**, add `http://localhost:5173`.
6. Under **Authorized redirect URIs**, add `http://localhost:5173`.
7. Click **Create** and copy the **Client ID** (ends in `.apps.googleusercontent.com`).
8. Paste that one value into **both** `GOOGLE_CLIENT_ID` and `VITE_GOOGLE_CLIENT_ID`.

### 3. `GOOGLE_PLACES_API_KEY` — place search

1. In the same project: **APIs & Services → Library** → search **Places API (New)** → **Enable**.
2. **APIs & Services → Credentials → + Create Credentials → API key** → copy it.
3. Recommended: click the key → **Restrict key** → **API restrictions** → select
   **Places API (New)** so the key only works for Places.
4. Paste the value into `GOOGLE_PLACES_API_KEY`.

> Places API (New) requires **billing enabled** on the project (**Billing** in the left menu).
> Google provides a free monthly allowance, but a billing account must be attached or calls
> return `403`.

Once all three are in `.env`, run `npm run dev`, open <http://localhost:5173>, sign in with
Google, choose a boundary, and start planning.
