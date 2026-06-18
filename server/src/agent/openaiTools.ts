import type { FunctionDeclaration } from "@google/genai";
import type OpenAI from "openai";

/**
 * Converts the shared Gemini function declarations into OpenAI Chat Completions
 * tool definitions, so both backends stay driven by a single source of truth
 * (FUNCTION_DECLARATIONS). The only real difference is the JSON-Schema `type`
 * casing — Gemini emits uppercase ("OBJECT", "STRING"), OpenAI expects the
 * standard lowercase ("object", "string") — so we deep-lowercase every `type`.
 */
export function toOpenAITools(
  declarations: FunctionDeclaration[],
): OpenAI.Chat.Completions.ChatCompletionFunctionTool[] {
  return declarations.map((decl) => ({
    type: "function",
    function: {
      name: decl.name ?? "",
      description: decl.description,
      parameters: normalizeSchema(decl.parameters ?? { type: "OBJECT" }) as Record<string, unknown>,
    },
  }));
}

/** Recursively lowercases JSON-Schema `type` fields and walks properties/items. */
function normalizeSchema(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(normalizeSchema);
  if (schema === null || typeof schema !== "object") return schema;

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(schema as Record<string, unknown>)) {
    if (key === "type" && typeof value === "string") {
      out[key] = value.toLowerCase();
    } else if (key === "properties" && value && typeof value === "object") {
      const props: Record<string, unknown> = {};
      for (const [propName, propSchema] of Object.entries(value as Record<string, unknown>)) {
        props[propName] = normalizeSchema(propSchema);
      }
      out[key] = props;
    } else if (key === "items") {
      out[key] = normalizeSchema(value);
    } else {
      out[key] = value;
    }
  }
  return out;
}
