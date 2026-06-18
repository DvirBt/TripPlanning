import assert from "node:assert/strict";
import { test } from "node:test";
import { isQuotaError, isRetryable } from "./geminiService";

const QUOTA_429 = JSON.stringify({
  error: { code: 429, status: "RESOURCE_EXHAUSTED", message: "You exceeded your current quota" },
});

test("classifies a 429 RESOURCE_EXHAUSTED as a quota error", () => {
  assert.equal(isQuotaError(new Error(QUOTA_429)), true);
});

test("does not treat a quota error as a transient retryable overload", () => {
  // Quota exhaustion must NOT be retried — a per-day cap won't clear on backoff.
  assert.equal(isRetryable(new Error(QUOTA_429)), false);
});

test("classifies a 503 overload as retryable but not a quota error", () => {
  const overloaded = new Error("503 UNAVAILABLE: model is overloaded");
  assert.equal(isRetryable(overloaded), true);
  assert.equal(isQuotaError(overloaded), false);
});

test("ordinary errors are neither retryable nor quota", () => {
  const err = new Error("TypeError: boom");
  assert.equal(isRetryable(err), false);
  assert.equal(isQuotaError(err), false);
});
