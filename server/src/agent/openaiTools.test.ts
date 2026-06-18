import assert from "node:assert/strict";
import { test } from "node:test";
import { FUNCTION_DECLARATIONS } from "./geminiService";
import { toOpenAITools } from "./openaiTools";

test("wraps each declaration as an OpenAI function tool", () => {
  const tools = toOpenAITools(FUNCTION_DECLARATIONS);
  assert.equal(tools.length, FUNCTION_DECLARATIONS.length);
  for (const tool of tools) {
    assert.equal(tool.type, "function");
    assert.ok(tool.function.name);
    assert.equal(typeof tool.function.parameters, "object");
  }
});

test("lowercases Gemini's uppercase JSON-schema types recursively", () => {
  const finalize = toOpenAITools(FUNCTION_DECLARATIONS).find(
    (t) => t.function.name === "finalizeItinerary",
  );
  assert.ok(finalize);
  const params = finalize.function.parameters as Record<string, unknown>;
  assert.equal(params.type, "object");
  // days is an array of objects -> nested types must be lowercased too.
  const days = (params.properties as Record<string, { type: string; items?: { type: string } }>).days;
  assert.equal(days.type, "array");
  assert.equal(days.items?.type, "object");
});

test("preserves enum and required constraints", () => {
  const search = toOpenAITools(FUNCTION_DECLARATIONS).find(
    (t) => t.function.name === "searchPlaces",
  );
  assert.ok(search);
  const params = search.function.parameters as {
    required?: string[];
    properties: Record<string, { enum?: string[] }>;
  };
  assert.deepEqual(params.required, ["location", "type"]);
  assert.deepEqual(params.properties.type.enum, ["hotel", "restaurant", "attraction"]);
});

test("preserves an empty-parameter tool (getUserPreferences)", () => {
  const prefs = toOpenAITools(FUNCTION_DECLARATIONS).find(
    (t) => t.function.name === "getUserPreferences",
  );
  assert.ok(prefs);
  assert.equal((prefs.function.parameters as { type: string }).type, "object");
});
