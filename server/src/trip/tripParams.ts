/**
 * Trip intake validation: the minimum information the agent needs before it
 * acts. The exact same rules run in the browser (for instant feedback) and
 * here on the backend (the source of truth) so a hand-crafted request can never
 * start a trip with bad input.
 */

/**
 * The trip fields as they currently stand in the form — every field optional,
 * because during discussion the form may be only partly filled. Passed to the
 * agent so the advisor knows what is known and what to ask for.
 */
export interface TripFields {
  where?: string;
  startDate?: string;
  endDate?: string;
  partySize?: number;
  budget?: number;
}

/** Raw intake payload as it arrives from the form (untrusted). */
export interface TripIntake {
  where: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  partySize: number;
  budget: number;
  details?: string;
}

/** A validated, normalised trip the rest of the backend can rely on. */
export interface NormalizedTrip {
  where: string;
  startDate: string;
  endDate: string;
  partySize: number;
  budget: number;
  details: string;
  /** Inclusive day count, derived from the date range (>= 1). */
  days: number;
}

export interface TripValidationResult {
  valid: boolean;
  /** Field name -> human-readable message. Empty when valid. */
  errors: Record<string, string>;
  /** Present only when valid. */
  value?: NormalizedTrip;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Parses a YYYY-MM-DD string into a UTC date-only Date, or null if invalid. */
function parseDate(value: unknown): Date | null {
  if (typeof value !== "string" || !DATE_RE.test(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  // Reject overflow like 2026-13-40 (Date silently rolls those over).
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d
  ) {
    return null;
  }
  return date;
}

/** Midnight-UTC version of a Date, so comparisons ignore the time of day. */
function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Validates a raw trip intake payload. `today` is injectable so the date rules
 * are deterministic in tests; it defaults to the current date.
 */
export function validateTripParams(
  input: unknown,
  today: Date = new Date(),
): TripValidationResult {
  const errors: Record<string, string> = {};
  const raw = (input ?? {}) as Partial<TripIntake>;

  // where
  const where = typeof raw.where === "string" ? raw.where.trim() : "";
  if (!where) {
    errors.where = "Please enter where the trip starts.";
  }

  // dates
  const start = parseDate(raw.startDate);
  const end = parseDate(raw.endDate);
  const todayUtc = startOfUtcDay(today);

  if (!start) {
    errors.startDate = "Please choose a valid start date.";
  } else if (start.getTime() < todayUtc.getTime()) {
    errors.startDate = "The start date cannot be in the past.";
  }

  if (!end) {
    errors.endDate = "Please choose a valid end date.";
  } else if (start && end.getTime() < start.getTime()) {
    errors.endDate = "The end date must be on or after the start date.";
  }

  // partySize
  const partySize = raw.partySize;
  if (typeof partySize !== "number" || !Number.isInteger(partySize) || partySize < 1) {
    errors.partySize = "Number of people must be a whole number of at least 1.";
  }

  // budget
  const budget = raw.budget;
  if (typeof budget !== "number" || !Number.isFinite(budget) || budget <= 0) {
    errors.budget = "Budget must be a positive number.";
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  const days = Math.round((end!.getTime() - start!.getTime()) / MS_PER_DAY) + 1;

  return {
    valid: true,
    errors: {},
    value: {
      where,
      startDate: raw.startDate as string,
      endDate: raw.endDate as string,
      partySize: partySize as number,
      budget: budget as number,
      details: typeof raw.details === "string" ? raw.details.trim() : "",
      days,
    },
  };
}
