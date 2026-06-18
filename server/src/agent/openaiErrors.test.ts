import assert from "node:assert/strict";
import { test } from "node:test";
import { isOpenAIQuotaError, isOpenAIRetryable } from "./openaiService";

test("classifies 429 insufficient_quota as a quota error, not retryable", () => {
  const err = { status: 429, code: "insufficient_quota" };
  assert.equal(isOpenAIQuotaError(err), true);
  assert.equal(isOpenAIRetryable(err), false);
});

test("treats a 429 rate_limit_exceeded as retryable, not quota", () => {
  const err = { status: 429, code: "rate_limit_exceeded" };
  assert.equal(isOpenAIQuotaError(err), false);
  assert.equal(isOpenAIRetryable(err), true);
});

test("treats 5xx as retryable", () => {
  assert.equal(isOpenAIRetryable({ status: 503 }), true);
  assert.equal(isOpenAIRetryable({ status: 500 }), true);
});

test("ordinary 4xx errors are neither quota nor retryable", () => {
  const err = { status: 400, code: "invalid_request_error" };
  assert.equal(isOpenAIQuotaError(err), false);
  assert.equal(isOpenAIRetryable(err), false);
});
