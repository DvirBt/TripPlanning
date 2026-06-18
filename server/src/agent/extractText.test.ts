import assert from "node:assert/strict";
import { test } from "node:test";
import { extractText } from "./geminiService";

/** Builds a minimal Gemini-shaped response from a list of parts. */
function resp(parts: unknown[]) {
  return { candidates: [{ content: { parts } }] } as never;
}

test("returns concatenated text from text parts", () => {
  assert.equal(extractText(resp([{ text: "Hello " }, { text: "world" }])), "Hello world");
});

test("ignores functionCall parts and does not warn", () => {
  const warnings: unknown[] = [];
  const original = console.warn;
  console.warn = (...args: unknown[]) => warnings.push(args);
  try {
    const out = extractText(
      resp([{ functionCall: { name: "searchPlaces", args: {} } }, { text: "ok" }]),
    );
    assert.equal(out, "ok");
  } finally {
    console.warn = original;
  }
  assert.equal(warnings.length, 0, "extractText must not trigger the SDK non-text-parts warning");
});

test("returns empty string when there are only function calls", () => {
  assert.equal(extractText(resp([{ functionCall: { name: "x", args: {} } }])), "");
});

test("skips thought parts", () => {
  assert.equal(extractText(resp([{ text: "reasoning", thought: true }, { text: "answer" }])), "answer");
});

test("handles missing candidates safely", () => {
  assert.equal(extractText({} as never), "");
});
