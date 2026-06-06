import type { HookCallbackMatcher, HookInput } from "@anthropic-ai/claude-agent-sdk";
import type { Boundary, Itinerary } from "../itinerary/types";
import { findBoundaryViolations } from "../geo/geofence";

/**
 * PreToolUse hook enforcement (Claude backend).
 *
 * Boundary adherence must not depend on the model behaving. This hook runs
 * BEFORE the finalizeItinerary tool executes and denies it if any place is
 * outside the active boundary; the agent then receives the reason and corrects
 * the plan. It uses the same findBoundaryViolations check as the shared
 * finalize handler, so both backends enforce borders identically.
 */
export function buildHooks(
  boundary: Boundary,
): Partial<Record<"PreToolUse", HookCallbackMatcher[]>> {
  return {
    PreToolUse: [
      {
        matcher: "mcp__trip__finalizeItinerary",
        hooks: [
          async (input: HookInput) => {
            if (input.hook_event_name !== "PreToolUse") return {};
            const violations = findBoundaryViolations(
              input.tool_input as Itinerary,
              boundary,
            );
            if (violations.length === 0) {
              return {
                hookSpecificOutput: {
                  hookEventName: "PreToolUse" as const,
                  permissionDecision: "allow" as const,
                },
              };
            }
            const detail = violations
              .map((v) => `- ${v.placeName} (${v.location}) is ${v.reason}`)
              .join("\n");
            return {
              hookSpecificOutput: {
                hookEventName: "PreToolUse" as const,
                permissionDecision: "deny" as const,
                permissionDecisionReason:
                  `The itinerary contains ${violations.length} place(s) outside the ` +
                  `${boundary.level} of ${boundary.value}. Replace them with options ` +
                  `inside the boundary, then finalize again:\n${detail}`,
              },
            };
          },
        ],
      },
    ],
  };
}
