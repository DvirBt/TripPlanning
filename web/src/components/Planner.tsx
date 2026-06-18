import { useMemo, useRef, useState } from "react";
import { streamChat, type WireFields } from "../api/chat";
import type { ChatMessage, Itinerary, LlmProvider, RawFields, TripErrors } from "../types";
import { displayToIso } from "../trip/dates";
import { validateFields } from "../trip/validation";
import { ChatWindow } from "./ChatWindow";
import { TripForm } from "./TripForm";

const TOOL_LABELS: Record<string, string> = {
  mcp__trip__searchPlaces: "Searching places...",
  mcp__trip__getUserPreferences: "Recalling your preferences...",
  mcp__trip__saveUserPreference: "Saving a preference...",
  mcp__trip__validateTripConstraints: "Checking the budget is realistic...",
  mcp__trip__finalizeItinerary: "Putting the itinerary together...",
};

const EMPTY_FIELDS: RawFields = {
  where: "",
  startDate: "",
  endDate: "",
  partySize: "1",
  budget: "",
};

/** Builds the partial field context sent with every turn (omits blanks/NaN). */
function toWireFields(raw: RawFields): WireFields {
  const partySize = Number.parseInt(raw.partySize, 10);
  const budget = Number.parseFloat(raw.budget);
  return {
    where: raw.where.trim() || undefined,
    startDate: displayToIso(raw.startDate) ?? undefined,
    endDate: displayToIso(raw.endDate) ?? undefined,
    partySize: Number.isFinite(partySize) ? partySize : undefined,
    budget: Number.isFinite(budget) ? budget : undefined,
  };
}

/** Lists the still-empty required fields, for the disabled-button hint. */
function missingFields(raw: RawFields): string[] {
  const missing: string[] = [];
  if (!raw.where.trim()) missing.push("where");
  if (!raw.startDate.trim()) missing.push("start date");
  if (!raw.endDate.trim()) missing.push("end date");
  if (!raw.partySize.trim()) missing.push("people");
  if (!raw.budget.trim()) missing.push("budget");
  return missing;
}

/**
 * Owns one planning session: the structured fields on top, a "Start planning"
 * action, and the advisor chat below. The chat is open from the start and runs
 * in "discuss" mode (the agent advises but never builds an itinerary). Pressing
 * "Start planning" runs a "plan" turn that produces the itinerary on the right.
 */
export function Planner({
  token,
  provider,
  onItinerary,
}: {
  token: string;
  provider: LlmProvider;
  onItinerary: (itinerary: Itinerary) => void;
}) {
  const [fields, setFields] = useState<RawFields>(EMPTY_FIELDS);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      text: "Hi! I'm your trip advisor. Fill in the trip details above and let's talk through what you're after — the vibe, must-sees, pace. When you're happy, hit “Start planning” and I'll build the itinerary.",
    },
  ]);
  const [activity, setActivity] = useState("");
  const [sending, setSending] = useState(false);
  const [serverErrors, setServerErrors] = useState<TripErrors>({});
  const chatId = useRef<string>(`chat-${Math.random().toString(36).slice(2)}`);

  // Live validation drives the inline errors and the Start-planning button.
  const { errors: localErrors, trip } = useMemo(() => validateFields(fields), [fields]);
  const missing = useMemo(() => missingFields(fields), [fields]);
  const canPlan = trip !== null && !sending;

  // Only show an inline error for a field the user has actually typed into, so
  // empty required fields don't nag before the user gets there.
  const visibleErrors: TripErrors = {};
  (Object.keys(localErrors) as (keyof TripErrors)[]).forEach((k) => {
    if (String(fields[k as keyof RawFields] ?? "").trim()) visibleErrors[k] = localErrors[k];
  });
  const errors: TripErrors = { ...serverErrors, ...visibleErrors };

  const setField = (field: keyof RawFields, value: string) => {
    setFields((prev) => ({ ...prev, [field]: value }));
    if (serverErrors[field as keyof TripErrors]) {
      setServerErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const appendToAssistant = (chunk: string) => {
    setMessages((prev) => {
      const next = [...prev];
      const last = next[next.length - 1];
      if (last && last.role === "assistant") {
        next[next.length - 1] = { ...last, text: (last.text ? last.text + "\n\n" : "") + chunk };
      } else {
        next.push({ role: "assistant", text: chunk });
      }
      return next;
    });
  };

  const runTurn = async (params: { mode: "discuss" | "plan"; message?: string }) => {
    setSending(true);
    await streamChat(
      { token, provider, chatId: chatId.current, fields: toWireFields(fields), ...params },
      {
        onText: (t) => appendToAssistant(t),
        onTool: (name) => setActivity(TOOL_LABELS[name] ?? "Working..."),
        onItinerary: (it) => onItinerary(it),
        onValidationError: (errs) => {
          setServerErrors(errs);
          appendToAssistant("(Please fix the highlighted trip details above, then start planning again.)");
        },
        onError: (msg) => appendToAssistant(`(error) ${msg}`),
        onDone: () => {
          setActivity("");
          setSending(false);
        },
      },
    );
  };

  const sendMessage = (text: string) => {
    if (sending) return;
    setMessages((prev) => [...prev, { role: "user", text }, { role: "assistant", text: "" }]);
    void runTurn({ mode: "discuss", message: text });
  };

  const startPlanning = () => {
    if (!canPlan) return;
    setServerErrors({});
    setMessages((prev) => [
      ...prev,
      { role: "user", text: "Start planning." },
      { role: "assistant", text: "" },
    ]);
    void runTurn({ mode: "plan" });
  };

  return (
    <div className="planner">
      <div className="trip-section">
        <TripForm values={fields} errors={errors} onChange={setField} />
        <div className="plan-action">
          <button className="start-planning" onClick={startPlanning} disabled={!canPlan}>
            {sending ? "Working..." : "Start planning"}
          </button>
          {!canPlan && missing.length > 0 && (
            <span className="plan-hint">Add: {missing.join(", ")}</span>
          )}
        </div>
      </div>
      <ChatWindow messages={messages} activity={activity} sending={sending} onSend={sendMessage} />
    </div>
  );
}
