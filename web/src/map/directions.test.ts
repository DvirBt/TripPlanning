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
