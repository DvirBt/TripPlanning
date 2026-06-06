/**
 * Constraint validation: a simple, transparent feasibility heuristic so the
 * agent can catch impossible requests (the PRD's "$200 USA to Africa" case)
 * and suggest realistic alternatives.
 *
 * These numbers are deliberately rough, illustrative floors - not a pricing
 * engine. They exist to give the agent a defensible reason to push back.
 */
export interface ConstraintInput {
  origin?: string;
  destination?: string;
  budget: number;
  days: number;
  partySize: number;
}

export interface ConstraintResult {
  feasible: boolean;
  minEstimate: number;
  currency: string;
  reasons: string[];
  alternatives: string[];
}

/** Very rough per-person round-trip travel floor based on how far the trip is. */
function travelFloorPerPerson(origin?: string, destination?: string): number {
  if (!origin || !destination) return 0;
  const o = origin.toLowerCase();
  const d = destination.toLowerCase();
  // Same place mentioned -> assume local, no travel cost.
  if (o && d && (o.includes(d) || d.includes(o))) return 0;

  const continentOf = (s: string): string => {
    if (/(usa|united states|canada|mexico)/.test(s)) return "na";
    if (/(uk|france|spain|portugal|italy|germany|europe)/.test(s)) return "eu";
    if (/(japan|china|thailand|korea|asia)/.test(s)) return "asia";
    if (/(africa|kenya|egypt|morocco|nigeria)/.test(s)) return "africa";
    if (/(australia|new zealand)/.test(s)) return "oceania";
    return "other";
  };
  const co = continentOf(o);
  const cd = continentOf(d);
  if (co === cd && co !== "other") return 150; // domestic / regional
  return 900; // intercontinental round-trip floor per person
}

const LODGING_FLOOR_PER_NIGHT = 40; // per person, cheapest realistic bed
const DAILY_LIVING_FLOOR = 25; // per person per day, food + local transit

export function validateConstraints(input: ConstraintInput): ConstraintResult {
  const days = Math.max(1, input.days);
  const partySize = Math.max(1, input.partySize);
  const nights = Math.max(1, days - 1);

  const travel = travelFloorPerPerson(input.origin, input.destination) * partySize;
  const lodging = LODGING_FLOOR_PER_NIGHT * nights * partySize;
  const living = DAILY_LIVING_FLOOR * days * partySize;
  const minEstimate = travel + lodging + living;

  const feasible = input.budget >= minEstimate;
  const reasons: string[] = [];
  const alternatives: string[] = [];

  if (!feasible) {
    reasons.push(
      `A realistic floor for ${partySize} traveller(s), ${days} day(s)` +
        `${input.destination ? ` to ${input.destination}` : ""} is about ` +
        `$${minEstimate} (travel $${travel}, lodging $${lodging}, ` +
        `daily costs $${living}), which exceeds the $${input.budget} budget.`,
    );
    alternatives.push(`Increase the budget to roughly $${minEstimate} or more.`);
    if (travel > 0) {
      alternatives.push(
        "Pick a closer destination to cut the largest cost (travel).",
      );
    }
    if (days > 2) {
      alternatives.push(`Shorten the trip to ${Math.max(1, days - 2)} day(s).`);
    }
    alternatives.push("Travel with fewer people.");
  }

  return { feasible, minEstimate, currency: "USD", reasons, alternatives };
}