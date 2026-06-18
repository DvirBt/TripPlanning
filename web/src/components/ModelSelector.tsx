import { LLM_PROVIDERS, type LlmProvider } from "../types";

/**
 * The model picker shown at the top-right of the screen. Lets the user choose
 * which LLM backend (Gemini or ChatGPT) powers the agent; the choice is sent
 * with every chat turn.
 */
export function ModelSelector({
  value,
  onChange,
}: {
  value: LlmProvider;
  onChange: (provider: LlmProvider) => void;
}) {
  return (
    <label className="model-selector">
      <span className="model-selector__label">Model</span>
      <select value={value} onChange={(e) => onChange(e.target.value as LlmProvider)}>
        {LLM_PROVIDERS.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </select>
    </label>
  );
}
