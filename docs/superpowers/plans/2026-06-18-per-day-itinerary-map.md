# Per-day Itinerary Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an interactive map to the itinerary panel that shows, per day, the real-road route through that day's stops, with a travel-mode toggle.

**Architecture:** Carry optional `lat`/`lng` through `finalizeItinerary` (the agent already has them from `searchPlaces`). The frontend adds an Itinerary/Map toggle in the itinerary panel; the Map view uses `@vis.gl/react-google-maps` to render one day at a time with numbered markers and a Directions route. Geofencing and the finalize boundary check are unchanged — coords are optional and never affect boundary enforcement.

**Tech Stack:** TypeScript, Express (server), React + Vite (web), `@vis.gl/react-google-maps`, Google Maps JavaScript API + Directions API, node `--test` via `tsx`.

## Global Constraints

- Geofencing stays a deterministic case-insensitive country/state/city string match in `server/src/geo/geofence.ts`; the boundary guarantee must not depend on the map or on coords. (CLAUDE.md invariant 1)
- Tool *schemas* have a single source of truth: `FUNCTION_DECLARATIONS` in `server/src/agent/geminiService.ts`; the OpenAI shape is derived by `agent/openaiTools.ts`. Do not hand-edit OpenAI tool shapes. (CLAUDE.md invariant 2)
- Agent behavior rules live in `server/prompts/*.md`, not in prompt-building code.
- `lat`/`lng` are **optional** everywhere and must never be added to any `required` list.
- Server tests run with `tsx --test`. The web workspace will reuse root-hoisted `tsx`.
- New browser env var name (exact): `VITE_GOOGLE_MAPS_API_KEY`. Library (exact): `@vis.gl/react-google-maps`.

---

### Task 1: Carry lat/lng through finalize (server)

**Files:**
- Modify: `server/src/itinerary/types.ts` (the `ItineraryItem` interface, lines 47-57)
- Modify: `server/src/agent/geminiService.ts` (finalize item `properties`, lines 99-109)
- Modify: `server/src/agent/toolHandlers.ts` (`handleFinalizeItinerary`, lines 67-84)
- Modify: `server/prompts/itinerary-guide.md` (the "Finishing the plan" section)
- Test: `server/src/agent/toolHandlers.test.ts` (create)

**Interfaces:**
- Produces: `ItineraryItem` gains `lat?: number; lng?: number;`. `handleFinalizeItinerary(ctx, itinerary)` now strips non-finite `lat`/`lng` to `undefined` before calling `ctx.onItinerary`, and still returns `{ ok: false, ... }` for boundary violations (unchanged).

- [ ] **Step 1: Write the failing test**

Create `server/src/agent/toolHandlers.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { handleFinalizeItinerary } from "./toolHandlers";
import type { Boundary, Itinerary } from "../itinerary/types";

const boundary: Boundary = { level: "country", value: "Japan" };

function makeItinerary(overrides: Partial<Itinerary["days"][0]["items"][0]> = {}): Itinerary {
  return {
    destination: "Japan",
    summary: "s",
    totalEstimatedCost: 100,
    currency: "USD",
    days: [
      {
        date: "2026-07-01",
        items: [
          {
            time: "09:00",
            placeName: "Senso-ji",
            placeType: "attraction",
            city: "Tokyo",
            state: "Tokyo",
            country: "Japan",
            note: "temple",
            estimatedCost: 0,
            lat: 35.7148,
            lng: 139.7967,
            ...overrides,
          },
        ],
      },
    ],
  };
}

function capture() {
  const calls: Itinerary[] = [];
  return { calls, ctx: { userId: "u1", boundary, onItinerary: (it: Itinerary) => calls.push(it) } };
}

test("valid coords pass through to onItinerary", () => {
  const { calls, ctx } = capture();
  const res = handleFinalizeItinerary(ctx, makeItinerary());
  assert.equal(res.ok, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].days[0].items[0].lat, 35.7148);
  assert.equal(calls[0].days[0].items[0].lng, 139.7967);
});

test("non-finite coords are stripped to undefined", () => {
  const { calls, ctx } = capture();
  const res = handleFinalizeItinerary(ctx, makeItinerary({ lat: NaN, lng: 139.7967 }));
  assert.equal(res.ok, true);
  assert.equal(calls[0].days[0].items[0].lat, undefined);
  assert.equal(calls[0].days[0].items[0].lng, undefined);
});

test("missing coords do not break finalize", () => {
  const { calls, ctx } = capture();
  const it = makeItinerary();
  delete (it.days[0].items[0] as Record<string, unknown>).lat;
  delete (it.days[0].items[0] as Record<string, unknown>).lng;
  const res = handleFinalizeItinerary(ctx, it);
  assert.equal(res.ok, true);
  assert.equal(calls[0].days[0].items[0].lat, undefined);
});

test("out-of-boundary place is still rejected regardless of coords", () => {
  const { calls, ctx } = capture();
  const res = handleFinalizeItinerary(ctx, makeItinerary({ country: "France", city: "Paris", state: "" }));
  assert.equal(res.ok, false);
  assert.equal(calls.length, 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -w server -- src/agent/toolHandlers.test.ts`
Expected: FAIL — coords are not stripped yet (the NaN test fails: `lat` is `NaN`, not `undefined`), and/or type errors on `lat`/`lng`.

- [ ] **Step 3: Add lat/lng to the shared type**

In `server/src/itinerary/types.ts`, inside `ItineraryItem` (after `note` / before or after `estimatedCost`), add the two optional fields:

```ts
/** One scheduled stop within a day. */
export interface ItineraryItem {
  time: string;
  placeName: string;
  placeType: PlaceType;
  city: string;
  state: string;
  country: string;
  note: string;
  estimatedCost: number;
  /** Optional coordinates copied from the searchPlaces result, used by the map. */
  lat?: number;
  lng?: number;
}
```

- [ ] **Step 4: Add lat/lng to the finalize tool schema**

In `server/src/agent/geminiService.ts`, in the finalize item `properties` block (lines 99-109), add `lat`/`lng` as NUMBER props. Do NOT add them to `required`:

```ts
                  properties: {
                    time: { type: Type.STRING },
                    placeName: { type: Type.STRING },
                    placeType: { type: Type.STRING, enum: ["hotel", "restaurant", "attraction"] },
                    city: { type: Type.STRING },
                    state: { type: Type.STRING },
                    country: { type: Type.STRING },
                    note: { type: Type.STRING },
                    estimatedCost: { type: Type.NUMBER },
                    lat: { type: Type.NUMBER, description: "Latitude from the searchPlaces result" },
                    lng: { type: Type.NUMBER, description: "Longitude from the searchPlaces result" },
                  },
                  required: ["time", "placeName", "placeType", "city", "state", "country", "note", "estimatedCost"],
```

- [ ] **Step 5: Sanitize coords in the finalize handler**

In `server/src/agent/toolHandlers.ts`, replace `handleFinalizeItinerary` (lines 67-84) so it strips non-finite coords before pushing to the UI. The boundary check is unchanged and stays first:

```ts
export function handleFinalizeItinerary(ctx: TripContext, itinerary: Itinerary) {
  const violations = findBoundaryViolations(itinerary, ctx.boundary);
  if (violations.length > 0) {
    return {
      ok: false,
      error:
        `Rejected: ${violations.length} place(s) fall outside the ` +
        `${ctx.boundary.level} of ${ctx.boundary.value}. Replace them with ` +
        `in-boundary options and finalize again.`,
      violations,
    };
  }
  ctx.onItinerary(sanitizeCoords(itinerary));
  return {
    ok: true,
    message: "Itinerary delivered to the user's screen. Briefly summarise it in chat.",
  };
}

/** Drops any lat/lng that is not a finite number, so the map never receives junk coords. */
function sanitizeCoords(itinerary: Itinerary): Itinerary {
  return {
    ...itinerary,
    days: (itinerary.days ?? []).map((day) => ({
      ...day,
      items: (day.items ?? []).map((item) => {
        const lat = Number.isFinite(item.lat) ? item.lat : undefined;
        const lng = Number.isFinite(item.lng) ? item.lng : undefined;
        return { ...item, lat, lng };
      }),
    })),
  };
}
```

- [ ] **Step 6: Tell the agent to copy coords**

In `server/prompts/itinerary-guide.md`, under "Finishing the plan", add a bullet after the "Every place ... MUST come from a searchPlaces result" line:

```md
- For each item, copy the chosen place's `lat` and `lng` from its searchPlaces result into the item so it can be shown on the map. If a place has no coordinates, omit them.
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `npm test -w server -- src/agent/toolHandlers.test.ts`
Expected: PASS (4 tests). Then `npm run typecheck` → no errors.

- [ ] **Step 8: Commit**

```bash
git add server/src/itinerary/types.ts server/src/agent/geminiService.ts server/src/agent/toolHandlers.ts server/prompts/itinerary-guide.md server/src/agent/toolHandlers.test.ts
git commit -m "feat(server): carry optional lat/lng through finalizeItinerary"
```

---

### Task 2: Frontend scaffolding — types, dependency, env

**Files:**
- Modify: `web/src/types.ts` (`ItineraryItem`, lines 7-16)
- Modify: `web/package.json` (dependencies + test script)
- Modify: `web/src/vite-env.d.ts`
- Modify: `.env.example` (append a Maps key block)

**Interfaces:**
- Produces: web `ItineraryItem` gains `lat?: number; lng?: number;`; `import.meta.env.VITE_GOOGLE_MAPS_API_KEY` typed as `string | undefined`; `@vis.gl/react-google-maps` and `@types/google.maps` installed; `npm test -w web` available.

- [ ] **Step 1: Mirror lat/lng on the web type**

In `web/src/types.ts`, update `ItineraryItem`:

```ts
export interface ItineraryItem {
  time: string;
  placeName: string;
  placeType: "hotel" | "restaurant" | "attraction";
  city: string;
  state: string;
  country: string;
  note: string;
  estimatedCost: number;
  lat?: number;
  lng?: number;
}
```

- [ ] **Step 2: Add the dependency, types, and test script**

In `web/package.json`, add to `dependencies`:

```json
    "@vis.gl/react-google-maps": "^1.5.0",
```

Add to `devDependencies`:

```json
    "@types/google.maps": "^3.58.1",
```

Add to `scripts`:

```json
    "test": "tsx --test \"src/**/*.test.ts\""
```

- [ ] **Step 3: Install**

Run: `npm install`
Expected: installs `@vis.gl/react-google-maps` and `@types/google.maps` into `web`.

- [ ] **Step 4: Type the env var**

Replace `web/src/vite-env.d.ts` with:

```ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID: string;
  readonly VITE_GOOGLE_MAPS_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

- [ ] **Step 5: Document the env var**

Append to `.env.example`:

```
# --- Google Maps (browser, used by the itinerary map) ---
# Enable "Maps JavaScript API" + "Directions API" in Google Cloud, then create a
# browser key restricted by HTTP referrer (http://localhost:5173 in dev).
# This is exposed to the browser, so keep it referrer-restricted.
VITE_GOOGLE_MAPS_API_KEY=
```

- [ ] **Step 6: Verify build still type-checks**

Run: `npm run build`
Expected: build succeeds (no usage yet, just the new types compile).

- [ ] **Step 7: Commit**

```bash
git add web/src/types.ts web/package.json web/src/vite-env.d.ts .env.example package-lock.json
git commit -m "chore(web): add maps deps, env var, and lat/lng on ItineraryItem"
```

---

### Task 3: Directions request helper (pure, unit-tested)

**Files:**
- Create: `web/src/map/directions.ts`
- Test: `web/src/map/directions.test.ts`

**Interfaces:**
- Consumes: `ItineraryItem` from `../types`.
- Produces:
  - `type TravelMode = "DRIVING" | "WALKING" | "TRANSIT"`
  - `interface LatLng { lat: number; lng: number }`
  - `interface DirectionsRequestData { origin: LatLng; destination: LatLng; waypoints: LatLng[]; travelMode: TravelMode }`
  - `mappableStops(items: ItineraryItem[]): Array<ItineraryItem & LatLng>` — items with finite lat/lng, order preserved.
  - `buildDirectionsRequest(items: ItineraryItem[], travelMode: TravelMode): DirectionsRequestData | null` — null when fewer than 2 mappable stops.

- [ ] **Step 1: Write the failing test**

Create `web/src/map/directions.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildDirectionsRequest, mappableStops } from "./directions";
import type { ItineraryItem } from "../types";

function item(name: string, lat?: number, lng?: number): ItineraryItem {
  return {
    time: "09:00", placeName: name, placeType: "attraction",
    city: "Tokyo", state: "Tokyo", country: "Japan",
    note: "", estimatedCost: 0, lat, lng,
  };
}

test("mappableStops keeps only finite coords in order", () => {
  const stops = mappableStops([item("A", 1, 1), item("B"), item("C", 3, 3)]);
  assert.deepEqual(stops.map((s) => s.placeName), ["A", "C"]);
});

test("buildDirectionsRequest builds origin/destination/waypoints in order", () => {
  const req = buildDirectionsRequest(
    [item("A", 1, 1), item("B", 2, 2), item("C", 3, 3)],
    "WALKING",
  );
  assert.ok(req);
  assert.deepEqual(req!.origin, { lat: 1, lng: 1 });
  assert.deepEqual(req!.destination, { lat: 3, lng: 3 });
  assert.deepEqual(req!.waypoints, [{ lat: 2, lng: 2 }]);
  assert.equal(req!.travelMode, "WALKING");
});

test("two stops produce empty waypoints", () => {
  const req = buildDirectionsRequest([item("A", 1, 1), item("B", 2, 2)], "DRIVING");
  assert.deepEqual(req!.waypoints, []);
});

test("fewer than two mappable stops returns null", () => {
  assert.equal(buildDirectionsRequest([item("A", 1, 1), item("B")], "DRIVING"), null);
  assert.equal(buildDirectionsRequest([], "DRIVING"), null);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -w web -- src/map/directions.test.ts`
Expected: FAIL — `Cannot find module './directions'`.

- [ ] **Step 3: Implement the helper**

Create `web/src/map/directions.ts`:

```ts
import type { ItineraryItem } from "../types";

export type TravelMode = "DRIVING" | "WALKING" | "TRANSIT";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface DirectionsRequestData {
  origin: LatLng;
  destination: LatLng;
  waypoints: LatLng[];
  travelMode: TravelMode;
}

/** Items that have finite coordinates, in their original visit order. */
export function mappableStops(items: ItineraryItem[]): Array<ItineraryItem & LatLng> {
  return items.filter(
    (i): i is ItineraryItem & LatLng =>
      Number.isFinite(i.lat) && Number.isFinite(i.lng),
  );
}

/**
 * Builds a Directions request for one day's stops, or null when there are fewer
 * than two mappable stops (nothing to route between).
 */
export function buildDirectionsRequest(
  items: ItineraryItem[],
  travelMode: TravelMode,
): DirectionsRequestData | null {
  const stops = mappableStops(items);
  if (stops.length < 2) return null;
  const toLatLng = (s: LatLng): LatLng => ({ lat: s.lat, lng: s.lng });
  return {
    origin: toLatLng(stops[0]),
    destination: toLatLng(stops[stops.length - 1]),
    waypoints: stops.slice(1, -1).map(toLatLng),
    travelMode,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -w web -- src/map/directions.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add web/src/map/directions.ts web/src/map/directions.test.ts
git commit -m "feat(web): add pure directions-request helper for the day map"
```

---

### Task 4: ItineraryMap component

**Files:**
- Create: `web/src/components/ItineraryMap.tsx`

**Interfaces:**
- Consumes: `Itinerary` from `../types`; `buildDirectionsRequest`, `mappableStops`, `TravelMode`, `DirectionsRequestData` from `../map/directions`; `import.meta.env.VITE_GOOGLE_MAPS_API_KEY`.
- Produces: `export function ItineraryMap({ itinerary }: { itinerary: Itinerary }): JSX.Element`.

- [ ] **Step 1: Implement the component**

Create `web/src/components/ItineraryMap.tsx`:

```tsx
import { useEffect, useState } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";
import type { Itinerary } from "../types";
import {
  buildDirectionsRequest,
  mappableStops,
  type DirectionsRequestData,
  type LatLng,
  type TravelMode,
} from "../map/directions";

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const MAP_ID = "trip_planner_day_map";
const TRAVEL_MODES: TravelMode[] = ["DRIVING", "WALKING", "TRANSIT"];

export function ItineraryMap({ itinerary }: { itinerary: Itinerary }) {
  const [dayIndex, setDayIndex] = useState(0);
  const [travelMode, setTravelMode] = useState<TravelMode>("DRIVING");

  if (!API_KEY) {
    return (
      <div className="map-missing-key">
        Set <code>VITE_GOOGLE_MAPS_API_KEY</code> to enable the map.
      </div>
    );
  }

  const day = itinerary.days[dayIndex] ?? itinerary.days[0];
  const items = day?.items ?? [];
  const stops = mappableStops(items);
  const unmapped = items.length - stops.length;
  const request = buildDirectionsRequest(items, travelMode);
  const center = stops[0] ?? { lat: 0, lng: 0 };

  return (
    <div className="itinerary-map">
      <div className="map-controls">
        <div className="day-pills">
          {itinerary.days.map((_, i) => (
            <button
              key={i}
              className={i === dayIndex ? "pill active" : "pill"}
              onClick={() => setDayIndex(i)}
            >
              Day {i + 1}
            </button>
          ))}
        </div>
        <div className="mode-toggle">
          {TRAVEL_MODES.map((m) => (
            <button
              key={m}
              className={m === travelMode ? "mode active" : "mode"}
              onClick={() => setTravelMode(m)}
            >
              {m[0] + m.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {unmapped > 0 && (
        <p className="map-notice">
          {unmapped} stop{unmapped > 1 ? "s" : ""} on this day {unmapped > 1 ? "have" : "has"} no
          location and {unmapped > 1 ? "are" : "is"} not shown on the map.
        </p>
      )}

      <div className="map-canvas">
        <APIProvider apiKey={API_KEY}>
          <Map
            mapId={MAP_ID}
            defaultCenter={center}
            defaultZoom={12}
            gestureHandling="greedy"
            disableDefaultUI={false}
          >
            {stops.map((s, i) => (
              <AdvancedMarker key={i} position={{ lat: s.lat, lng: s.lng }} title={s.placeName}>
                <div className="map-pin">{i + 1}</div>
              </AdvancedMarker>
            ))}
            <FitBounds stops={stops} />
            <DayRoute request={request} />
          </Map>
        </APIProvider>
      </div>
    </div>
  );
}

/** Fits the map to the day's stops (or centres + zooms when there is only one). */
function FitBounds({ stops }: { stops: LatLng[] }) {
  const map = useMap();
  useEffect(() => {
    if (!map || stops.length === 0) return;
    if (stops.length === 1) {
      map.setCenter(stops[0]);
      map.setZoom(13);
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    stops.forEach((s) => bounds.extend(s));
    map.fitBounds(bounds, 64);
  }, [map, stops]);
  return null;
}

/** Draws the real-road route for the day; shows an inline notice on failure. */
function DayRoute({ request }: { request: DirectionsRequestData | null }) {
  const map = useMap();
  const routesLib = useMapsLibrary("routes");
  const [service, setService] = useState<google.maps.DirectionsService>();
  const [renderer, setRenderer] = useState<google.maps.DirectionsRenderer>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!routesLib || !map) return;
    setService(new routesLib.DirectionsService());
    const r = new routesLib.DirectionsRenderer({ map, suppressMarkers: true });
    setRenderer(r);
    return () => r.setMap(null);
  }, [routesLib, map]);

  useEffect(() => {
    if (!service || !renderer) return;
    if (!request) {
      renderer.set("directions", null);
      setFailed(false);
      return;
    }
    let cancelled = false;
    service
      .route({
        origin: request.origin,
        destination: request.destination,
        waypoints: request.waypoints.map((location) => ({ location, stopover: true })),
        travelMode: request.travelMode as unknown as google.maps.TravelMode,
        optimizeWaypoints: false,
      })
      .then((result) => {
        if (cancelled) return;
        setFailed(false);
        renderer.setDirections(result);
      })
      .catch(() => {
        if (cancelled) return;
        setFailed(true);
        renderer.set("directions", null);
      });
    return () => {
      cancelled = true;
    };
  }, [service, renderer, request]);

  if (failed) {
    return <div className="map-error">No route available for this day in this mode — showing stops only.</div>;
  }
  return null;
}
```

- [ ] **Step 2: Verify it type-checks and builds**

Run: `npm run build`
Expected: build succeeds. (Component is not yet rendered anywhere; this only confirms it compiles against the SDK types.)

- [ ] **Step 3: Commit**

```bash
git add web/src/components/ItineraryMap.tsx
git commit -m "feat(web): add per-day ItineraryMap with directions route and mode toggle"
```

---

### Task 5: Itinerary/Map toggle in ItineraryView + styling

**Files:**
- Modify: `web/src/components/ItineraryView.tsx`
- Modify: `web/src/App.css` (append map + toggle styles)

**Interfaces:**
- Consumes: `ItineraryMap` from `./ItineraryMap`.
- Produces: `ItineraryView` renders a segmented Itinerary/Map toggle (local state) above the content; the Map option renders `<ItineraryMap itinerary={itinerary} />`.

- [ ] **Step 1: Add the toggle to ItineraryView**

Replace `web/src/components/ItineraryView.tsx` with:

```tsx
import { useState } from "react";
import type { Itinerary } from "../types";
import { ItineraryMap } from "./ItineraryMap";

const TYPE_ICON: Record<string, string> = {
  hotel: "Stay",
  restaurant: "Eat",
  attraction: "See",
};

type Tab = "itinerary" | "map";

/** Renders the structured itinerary the agent submits via finalizeItinerary. */
export function ItineraryView({ itinerary }: { itinerary: Itinerary | null }) {
  const [tab, setTab] = useState<Tab>("itinerary");

  if (!itinerary) {
    return (
      <div className="itinerary empty">
        <h2>Your itinerary</h2>
        <p>Once you and the agent agree on a plan, it appears here.</p>
      </div>
    );
  }

  return (
    <div className="itinerary">
      <div className="itinerary-header">
        <h2>{itinerary.destination}</h2>
        <div className="view-toggle">
          <button
            className={tab === "itinerary" ? "active" : ""}
            onClick={() => setTab("itinerary")}
          >
            Itinerary
          </button>
          <button className={tab === "map" ? "active" : ""} onClick={() => setTab("map")}>
            Map
          </button>
        </div>
      </div>

      {tab === "map" ? (
        <ItineraryMap itinerary={itinerary} />
      ) : (
        <>
          <p className="summary">{itinerary.summary}</p>
          <p className="total">
            Estimated total: {itinerary.currency} {itinerary.totalEstimatedCost}
          </p>
          {itinerary.days.map((day, i) => (
            <div key={i} className="day">
              <h3>
                Day {i + 1} - {day.date}
              </h3>
              {day.items.map((item, j) => (
                <div key={j} className="item">
                  <span className="tag">{TYPE_ICON[item.placeType] ?? item.placeType}</span>
                  <div className="item-body">
                    <strong>{item.time} - {item.placeName}</strong>
                    <div className="loc">{item.city}, {item.country}</div>
                    <div className="note">{item.note}</div>
                  </div>
                  <span className="cost">
                    {itinerary.currency} {item.estimatedCost}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add styles**

Append to `web/src/App.css`:

```css
/* Itinerary header + Itinerary/Map toggle */
.itinerary-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.view-toggle {
  display: inline-flex;
  border: 1px solid #ccc;
  border-radius: 8px;
  overflow: hidden;
}
.view-toggle button {
  border: none;
  background: #f4f4f5;
  padding: 6px 14px;
  cursor: pointer;
  font: inherit;
}
.view-toggle button.active {
  background: #2563eb;
  color: #fff;
}

/* Map view */
.itinerary-map {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.map-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.day-pills,
.mode-toggle {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.day-pills .pill,
.mode-toggle .mode {
  border: 1px solid #ccc;
  background: #fff;
  border-radius: 999px;
  padding: 4px 12px;
  cursor: pointer;
  font: inherit;
}
.day-pills .pill.active,
.mode-toggle .mode.active {
  background: #111827;
  color: #fff;
  border-color: #111827;
}
.map-canvas {
  width: 100%;
  height: 460px;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid #e5e7eb;
}
.map-canvas > * {
  width: 100%;
  height: 100%;
}
.map-pin {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: #2563eb;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  border: 2px solid #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
}
.map-notice,
.map-error,
.map-missing-key {
  font-size: 13px;
  color: #6b7280;
}
.map-error {
  color: #b45309;
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Manual verification**

Run: `npm run dev`, sign in, fill the trip form, run "Start planning", then switch to the **Map** tab. Confirm: day pills switch days, markers are numbered in order, a road route is drawn, the Driving/Walking/Transit toggle re-routes, and an empty `VITE_GOOGLE_MAPS_API_KEY` shows the fallback message.

- [ ] **Step 5: Commit**

```bash
git add web/src/components/ItineraryView.tsx web/src/App.css
git commit -m "feat(web): add Itinerary/Map view toggle to the itinerary panel"
```

---

## Self-Review

**Spec coverage:**
- Data model change (optional lat/lng, schema, prompt, sanity check) → Task 1; web mirror → Task 2. ✓
- View toggle in itinerary panel → Task 5. ✓
- Map screen (APIProvider/Map, day pills one-at-a-time, numbered markers, Directions route, travel-mode toggle, fit bounds, unmapped notice, directions-failure fallback) → Task 4. ✓
- Config (`VITE_GOOGLE_MAPS_API_KEY` in `.env.example`, dependency) → Task 2. ✓
- Pure helper unit-tested → Task 3; server finalize tests → Task 1. ✓
- Invariants preserved (geofencing unchanged, single schema source) → Task 1 keeps the boundary check first and edits only `FUNCTION_DECLARATIONS`. ✓

**Placeholder scan:** No TBD/TODO; every code step is complete.

**Type consistency:** `buildDirectionsRequest` / `mappableStops` / `TravelMode` / `DirectionsRequestData` / `LatLng` signatures in Task 3 match their use in Task 4. `ItineraryItem.lat/lng` optional in server (Task 1) and web (Task 2). `handleFinalizeItinerary` signature unchanged. `ItineraryMap({ itinerary })` prop matches the call in Task 5.
