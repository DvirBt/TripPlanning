# Structured Trip Intake Form + Validation — Design

Date: 2026-06-17
Linear: TRI-18

## Goal

Replace the free-text "tell me about your trip (incl. budget)" flow with a
structured intake form that captures the minimum information the agent needs
before it acts: **where**, **when** (start/end dates), **how many people**,
**budget**, and a **free-text details** field. Validate input both in the UI
and on the backend, returning field-level errors when invalid.

## Layout

The left panel becomes a vertical stack — **TripForm on top, Chat at the
bottom**. The ItineraryView stays in the right panel.

## Form fields & validation rules

Enforced identically in the UI and on the backend (backend is source of truth):

| Field | Input | Rule |
|---|---|---|
| Where | text | required, non-empty (trip starting location) |
| Start date | date | required, valid date, today-or-later |
| End date | date | required, valid date, ≥ start date |
| People | number | required, positive integer ≥ 1 |
| Budget (USD) | number | required, positive number > 0 |
| Details | textarea | optional free text (trip type / wider scope) |

## Boundary derivation — "country-level soft anchor"

"Where" is the trip's starting city, but the in-code geofence is set to that
city's **country**. The trip can roam the whole country; the free-text field is
where the user expands scope (specifics, neighbouring countries).

- The backend resolves the country of "where" via a `resolveCountry()` method
  added behind the existing Places adapter interface.
- The hard finalize-time gate (`findBoundaryViolations`) stays, now at country
  level — the 100% adherence guarantee is preserved, just widened from city to
  country.
- The resolved boundary is stored server-side per `chatId` (mirroring the
  in-memory `histories` map) so chat follow-ups reuse it.
- If `resolveCountry` fails, fall back to a city-level boundary on the raw
  input (no worse than today's behaviour) rather than failing the submit.
- The brittle `extractDestination` regex in ChatWindow is deleted.

## Data flow / API

`POST /api/chat` accepts an optional `trip` object:
`{ where, startDate, endDate, partySize, budget, details }`.

- **Form submit** sends `{ chatId, trip }`. Backend runs the pure
  `validateTripParams(trip)`. Invalid → `400 { errors: { field: message } }`
  (no SSE stream). Valid → resolve + store boundary, compose a structured seed
  message, run the agent and stream as today.
- **Chat follow-up** sends `{ chatId, message }`. Boundary is looked up from the
  per-chat store. The composer is disabled until a valid trip is submitted, so
  "only then will the agent start working".
- Frontend `streamChat` gains an `onValidationError(errors)` handler; the 400
  JSON body maps errors back to the form fields inline.

## New / changed files

**New:**
- `server/src/trip/tripParams.ts` — types + `validateTripParams` (pure).
- `server/src/trip/tripParams.test.ts` — unit tests.
- `web/src/components/TripForm.tsx`.

**Changed:**
- `server/src/index.ts` — accept/validate `trip`, boundary store, seed message.
- `server/src/places/placesAdapter.ts` + `googlePlaces.ts` — `resolveCountry`.
- `server/prompts/*.md` — don't re-ask budget; explain starting-anchor model.
- `web/src/components/ChatWindow.tsx` — drop regex, gate composer.
- `web/src/api/chat.ts`, `web/src/types.ts` — `trip` payload + validation error.
- `web/src/App.tsx`, `web/src/App.css` — layout.
- `CLAUDE.md` — document the country-level boundary change.

## Testing

- Unit tests for `validateTripParams`: each rule (missing fields, past start
  date, end < start, zero/negative/non-integer people, zero/negative budget) and
  a valid case, via the existing `tsx --test`.
- Manual end-to-end verification of the form flow.
