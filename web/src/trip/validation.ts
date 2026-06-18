import type { RawFields, TripErrors, TripIntake } from "../types";
import { displayToIso } from "./dates";

/**
 * Client-side trip validation. Mirrors the backend rules in
 * `server/src/trip/tripParams.ts` so the user gets instant feedback, but the
 * backend remains the source of truth and re-validates every plan request.
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Parses a YYYY-MM-DD string to a UTC date-only Date, or null if invalid. */
function parseIso(value: string): Date | null {
  if (!DATE_RE.test(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d
  ) {
    return null;
  }
  return date;
}

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Validates an already-normalised (ISO-date) trip. */
function validateTrip(trip: TripIntake): TripErrors {
  const errors: TripErrors = {};

  if (!trip.where.trim()) {
    errors.where = "Please enter where the trip starts.";
  }

  const start = parseIso(trip.startDate);
  const end = parseIso(trip.endDate);
  const today = startOfUtcDay(new Date());

  if (!start) {
    errors.startDate = "Please choose a valid start date.";
  } else if (start.getTime() < today.getTime()) {
    errors.startDate = "The start date cannot be in the past.";
  }

  if (!end) {
    errors.endDate = "Please choose a valid end date.";
  } else if (start && end.getTime() < start.getTime()) {
    errors.endDate = "The end date must be on or after the start date.";
  }

  if (!Number.isInteger(trip.partySize) || trip.partySize < 1) {
    errors.partySize = "Number of people must be a whole number of at least 1.";
  }

  if (!Number.isFinite(trip.budget) || trip.budget <= 0) {
    errors.budget = "Budget must be a positive number.";
  }

  return errors;
}

/**
 * Validates the raw form fields (dates as dd/mm/yyyy). Returns the field errors
 * and, when everything is valid, the normalised trip ready to send.
 */
export function validateFields(raw: RawFields): { errors: TripErrors; trip: TripIntake | null } {
  const startIso = displayToIso(raw.startDate);
  const endIso = displayToIso(raw.endDate);

  const trip: TripIntake = {
    where: raw.where.trim(),
    startDate: startIso ?? "",
    endDate: endIso ?? "",
    partySize: Number.parseInt(raw.partySize, 10),
    budget: Number.parseFloat(raw.budget),
  };

  const errors = validateTrip(trip);
  // A non-empty but unparseable date gets a format-specific message.
  if (raw.startDate.trim() && !startIso) errors.startDate = "Use the format dd/mm/yyyy.";
  if (raw.endDate.trim() && !endIso) errors.endDate = "Use the format dd/mm/yyyy.";

  return { errors, trip: Object.keys(errors).length === 0 ? trip : null };
}
