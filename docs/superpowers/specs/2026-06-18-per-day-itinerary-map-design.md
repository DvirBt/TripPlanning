# Per-day interactive itinerary map — design

**Date:** 2026-06-18
**Branch:** `map`

## Goal

After the agent finalizes a trip, give the user an interactive map that shows, for
each day, the real-road path through that day's stops in visit order. The user
toggles between the written itinerary and the map at the top of the itinerary
panel, and picks which day to view.

## Decisions (from brainstorming)

- **Coordinate source:** carry `lat`/`lng` through `finalizeItinerary`. The agent
  already has them from `searchPlaces`; no extra geocoding or API calls.
- **Path style:** real roads via the Google **Directions API**.
- **Travel mode:** user-toggleable (Driving / Walking / Transit).
- **Maps key:** a new browser-exposed `VITE_GOOGLE_MAPS_API_KEY`, separate from the
  server-only `GOOGLE_PLACES_API_KEY`.
- **Layout:** toggle lives in the itinerary panel (not a full-screen takeover);
  one day shown at a time (no multi-day overlay).
- **Library:** `@vis.gl/react-google-maps` (Google's maintained React wrapper).

## Data model change

Add **optional** `lat?: number` and `lng?: number` to `ItineraryItem` in:

- `server/src/itinerary/types.ts`
- `web/src/types.ts` (mirror)

Add the two optional fields to the `finalizeItinerary` tool schema in
`FUNCTION_DECLARATIONS` (Gemini shape) in `server/src/geminiService.ts`. The OpenAI
side follows automatically through `agent/openaiTools.ts` (`toOpenAITools`). A
prompt instruction in `server/prompts/itinerary-guide.md` tells the agent to copy
each chosen place's `lat`/`lng` from the `searchPlaces` result into the
corresponding itinerary item.

**Invariants preserved:**

- Coords are optional. Geofencing is unchanged — it remains the deterministic
  case-insensitive country/state/city string match in `geo/geofence.ts`, and
  `handleFinalizeItinerary` still rejects out-of-boundary places. The map does not
  weaken the "100% boundary adherence" guarantee.
- `handleFinalizeItinerary` adds only a light sanity check: if `lat`/`lng` are
  present they must be finite numbers; otherwise they are dropped (treated as
  absent). Missing coords never block finalize.

## Frontend

### View toggle

A segmented **Itinerary / Map** control at the top of the itinerary panel. State is
local (`useState` in `ItineraryView`). Default = Itinerary. The Map option is
disabled when there is no itinerary.

### `web/src/components/ItineraryMap.tsx` (new)

- `APIProvider` (apiKey = `import.meta.env.VITE_GOOGLE_MAPS_API_KEY`) wrapping a
  `Map` with a `mapId`.
- **Day selector:** a row of pills (Day 1, Day 2, …). One day rendered at a time.
- **For the selected day:**
  - `AdvancedMarker` per mappable stop, numbered in visit order.
  - A route via `useMapsLibrary('routes')` + `DirectionsService` /
    `DirectionsRenderer`: origin = first mappable stop, destination = last,
    intermediate stops as waypoints, in itinerary order.
  - Map fits bounds to the day's stops.
- **Travel-mode toggle:** Driving / Walking / Transit. Changing it re-requests
  directions for the current day.
- **Degenerate / failure handling:**
  - A day with 0–1 mappable stops: show markers only, no route.
  - Stops missing coords: skipped, with a small "N stop(s) not mapped" notice.
  - Directions request failure: inline message, markers still shown (no
    straight-line fallback — real-roads was chosen).

### Pure helper (unit-tested)

A small pure function, e.g. `buildDirectionsRequest(dayItems, travelMode)`, that
turns a day's items into a Directions request (origin / destination / waypoints),
filtering out items without coords. Keeps the React component thin and gives us
something testable without the Google JS SDK.

## Config / setup

- Add `VITE_GOOGLE_MAPS_API_KEY` to `.env.example` with a comment: enable **Maps
  JavaScript API** + **Directions API** in Google Cloud, restrict the key by HTTP
  referrer. Read by Vite (`envDir: ".."`).
- Add `@vis.gl/react-google-maps` to `web/` dependencies.

## Testing

- Server: extend the finalize/types tests to assert (a) coords pass through
  finalize when present and valid, (b) missing/invalid coords don't break finalize
  and geofencing still enforces the boundary.
- Frontend: unit-test `buildDirectionsRequest` (ordering, waypoint extraction,
  filtering of coord-less items, 0/1-stop cases). The map component stays thin.

## Out of scope (YAGNI)

Multi-day overlay, custom map styling, map export/save, marker info-windows with
photos.
