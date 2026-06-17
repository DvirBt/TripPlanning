# Web

The React frontend (Vite + TypeScript): Google sign-in, the chat interface, the boundary
selector, and the visual itinerary. This is the PRD's Frontend UI.

## Run

From the repo root `npm run dev` runs this alongside the backend. To run only the web app:
`npm run dev -w web`. Vite serves on http://localhost:5173 and proxies `/api` to the backend
(see `vite.config.ts`), so there is one origin and no CORS friction in development.

## How it works

- `components/LoginButton.tsx` performs Google Sign-In via `@react-oauth/google`
  (`useGoogleLogin`). The resulting access token is stored by `auth/login.ts` and sent as a
  bearer token on every API request.
- `components/BoundarySelector.tsx` sets the geographical limit (level + value) sent with every message.
- `components/ChatWindow.tsx` owns the conversation. It posts to `/api/chat` and reads the
  Server-Sent Events stream via `api/chat.ts`, appending assistant text, showing tool activity,
  and lifting the final itinerary up to `App`.
- `components/ItineraryView.tsx` renders the structured itinerary day by day with estimated costs.
- `App.tsx` wires login, the top bar, the chat panel and the itinerary panel together.

## Notes

The itinerary is rendered from a structured `itinerary` event (not parsed from prose), so there
is no brittle text parsing. The backend emits that event when the agent calls `finalizeItinerary`.
