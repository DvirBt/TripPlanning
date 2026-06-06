import assert from "node:assert/strict";
import { test } from "node:test";
import { validateConstraints } from "./constraints";

test("flags the impossible $200 USA-to-Africa week as infeasible", () => {
  const result = validateConstraints({
    origin: "USA",
    destination: "Africa",
    budget: 200,
    days: 7,
    partySize: 1,
  });
  assert.equal(result.feasible, false);
  assert.ok(result.minEstimate > 200);
  assert.ok(result.alternatives.length > 0);
});

test("accepts a comfortable local trip", () => {
  const result = validateConstraints({
    origin: "Kyoto",
    destination: "Kyoto",
    budget: 1500,
    days: 3,
    partySize: 2,
  });
  assert.equal(result.feasible, true);
});
