import assert from "node:assert/strict";
import { test } from "node:test";
import { validateTripParams } from "./tripParams";

// Fixed reference "today" so date rules are deterministic.
const TODAY = new Date("2026-06-17T00:00:00Z");

const valid = {
  where: "Kyoto",
  startDate: "2026-07-01",
  endDate: "2026-07-05",
  partySize: 2,
  budget: 3000,
  details: "lots of temples and views",
};

test("accepts a fully valid trip and normalises it", () => {
  const result = validateTripParams(valid, TODAY);
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, {});
  assert.equal(result.value?.where, "Kyoto");
  assert.equal(result.value?.partySize, 2);
  assert.equal(result.value?.budget, 3000);
});

test("details is optional", () => {
  const { details, ...rest } = valid;
  const result = validateTripParams(rest, TODAY);
  assert.equal(result.valid, true);
  assert.equal(result.value?.details, "");
});

test("rejects missing / blank where", () => {
  assert.equal(validateTripParams({ ...valid, where: "" }, TODAY).errors.where !== undefined, true);
  assert.equal(validateTripParams({ ...valid, where: "   " }, TODAY).errors.where !== undefined, true);
  assert.equal(validateTripParams({ ...valid, where: 5 }, TODAY).errors.where !== undefined, true);
});

test("rejects an invalid or missing start date", () => {
  assert.equal(validateTripParams({ ...valid, startDate: "" }, TODAY).errors.startDate !== undefined, true);
  assert.equal(validateTripParams({ ...valid, startDate: "not-a-date" }, TODAY).errors.startDate !== undefined, true);
  assert.equal(validateTripParams({ ...valid, startDate: "2026-13-40" }, TODAY).errors.startDate !== undefined, true);
});

test("rejects a start date in the past", () => {
  const result = validateTripParams({ ...valid, startDate: "2026-06-16", endDate: "2026-06-20" }, TODAY);
  assert.equal(result.errors.startDate !== undefined, true);
});

test("accepts a start date of today", () => {
  const result = validateTripParams({ ...valid, startDate: "2026-06-17", endDate: "2026-06-20" }, TODAY);
  assert.equal(result.errors.startDate, undefined);
});

test("rejects an end date before the start date", () => {
  const result = validateTripParams({ ...valid, startDate: "2026-07-05", endDate: "2026-07-01" }, TODAY);
  assert.equal(result.errors.endDate !== undefined, true);
});

test("accepts an end date equal to the start date (single day)", () => {
  const result = validateTripParams({ ...valid, startDate: "2026-07-01", endDate: "2026-07-01" }, TODAY);
  assert.equal(result.errors.endDate, undefined);
});

test("rejects non-positive or non-integer party size", () => {
  assert.equal(validateTripParams({ ...valid, partySize: 0 }, TODAY).errors.partySize !== undefined, true);
  assert.equal(validateTripParams({ ...valid, partySize: -3 }, TODAY).errors.partySize !== undefined, true);
  assert.equal(validateTripParams({ ...valid, partySize: 2.5 }, TODAY).errors.partySize !== undefined, true);
  assert.equal(validateTripParams({ ...valid, partySize: "two" }, TODAY).errors.partySize !== undefined, true);
});

test("rejects non-positive budget", () => {
  assert.equal(validateTripParams({ ...valid, budget: 0 }, TODAY).errors.budget !== undefined, true);
  assert.equal(validateTripParams({ ...valid, budget: -100 }, TODAY).errors.budget !== undefined, true);
  assert.equal(validateTripParams({ ...valid, budget: "lots" }, TODAY).errors.budget !== undefined, true);
});

test("reports every invalid field at once", () => {
  const result = validateTripParams({ where: "", startDate: "", endDate: "", partySize: 0, budget: 0 }, TODAY);
  assert.equal(result.valid, false);
  assert.deepEqual(
    Object.keys(result.errors).sort(),
    ["budget", "endDate", "partySize", "startDate", "where"],
  );
});

test("computes day count from the date range", () => {
  const result = validateTripParams({ ...valid, startDate: "2026-07-01", endDate: "2026-07-05" }, TODAY);
  assert.equal(result.value?.days, 5);
});
