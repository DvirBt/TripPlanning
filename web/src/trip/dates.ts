/**
 * Date display helpers. The form shows and accepts dates as dd/mm/yyyy, but the
 * backend contract (and `validateTrip`) uses ISO `yyyy-mm-dd`, so we convert at
 * the form boundary.
 */

const DISPLAY_RE = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Converts dd/mm/yyyy to ISO yyyy-mm-dd, or null if the string isn't a real date. */
export function displayToIso(display: string): string | null {
  const m = DISPLAY_RE.exec(display.trim());
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const d = Number(dd);
  const mo = Number(mm);
  const y = Number(yyyy);
  // Reject impossible dates like 31/02/2026.
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) {
    return null;
  }
  return `${yyyy}-${mm}-${dd}`;
}

/** Converts ISO yyyy-mm-dd to dd/mm/yyyy for display, or returns the input unchanged. */
export function isoToDisplay(iso: string): string {
  const m = ISO_RE.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}
