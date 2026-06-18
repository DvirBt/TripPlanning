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
  delete (it.days[0].items[0] as unknown as Record<string, unknown>).lat;
  delete (it.days[0].items[0] as unknown as Record<string, unknown>).lng;
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

/** Builds an itinerary spanning `n` days (all in-boundary). */
function makeMultiDay(n: number): Itinerary {
  const it = makeItinerary();
  it.days = Array.from({ length: n }, (_, i) => ({
    date: `2026-07-0${i + 1}`,
    items: [{ ...it.days[0].items[0] }],
  }));
  return it;
}

test("an itinerary covering fewer days than expected is rejected", () => {
  const { calls, ctx } = capture();
  const res = handleFinalizeItinerary({ ...ctx, expectedDays: 10 }, makeMultiDay(1));
  assert.equal(res.ok, false);
  assert.equal(calls.length, 0);
});

test("an itinerary covering every expected day is accepted", () => {
  const { calls, ctx } = capture();
  const res = handleFinalizeItinerary({ ...ctx, expectedDays: 3 }, makeMultiDay(3));
  assert.equal(res.ok, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].days.length, 3);
});

test("no day enforcement when expectedDays is unset", () => {
  const { calls, ctx } = capture();
  const res = handleFinalizeItinerary(ctx, makeMultiDay(1));
  assert.equal(res.ok, true);
  assert.equal(calls.length, 1);
});
