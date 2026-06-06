import assert from "node:assert/strict";
import { test } from "node:test";
import type { Place } from "../itinerary/types";
import { isWithinBoundary, partitionByBoundary } from "./geofence";

const kyoto: Place = {
  id: "k", name: "Fushimi Inari", type: "attraction",
  city: "Kyoto", state: "Kyoto Prefecture", country: "Japan",
  lat: 0, lng: 0, priceLevel: 1, rating: 4.8, description: "", tags: [],
};
const lisbon: Place = {
  id: "l", name: "Belem Tower", type: "attraction",
  city: "Lisbon", state: "Lisbon District", country: "Portugal",
  lat: 0, lng: 0, priceLevel: 1, rating: 4.6, description: "", tags: [],
};

test("matches at city level (case-insensitive)", () => {
  assert.equal(isWithinBoundary(kyoto, { level: "city", value: "kyoto" }), true);
  assert.equal(isWithinBoundary(lisbon, { level: "city", value: "Kyoto" }), false);
});

test("matches at country level", () => {
  assert.equal(isWithinBoundary(kyoto, { level: "country", value: "Japan" }), true);
  assert.equal(isWithinBoundary(lisbon, { level: "country", value: "Japan" }), false);
});

test("partitions a list by boundary", () => {
  const { inside, outside } = partitionByBoundary([kyoto, lisbon], {
    level: "country",
    value: "Japan",
  });
  assert.deepEqual(inside.map((p) => p.id), ["k"]);
  assert.deepEqual(outside.map((p) => p.id), ["l"]);
});
