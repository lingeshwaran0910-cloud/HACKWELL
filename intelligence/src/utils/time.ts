/**
 * SafeCity AI — Time Utilities
 */

/**
 * Calculates age in seconds relative to a reference ISO timestamp.
 */
export function calculateAgeSeconds(timestampIso: string, referenceIso?: string): number {
  const refTime = referenceIso ? new Date(referenceIso).getTime() : Date.now();
  const eventTime = new Date(timestampIso).getTime();
  if (isNaN(eventTime)) return 999999;
  return Math.max(0, Math.floor((refTime - eventTime) / 1000));
}

/**
 * Checks if a string is a valid ISO 8601 timestamp string.
 */
export function isValidIsoTimestamp(isoString: string): boolean {
  if (typeof isoString !== "string" || !isoString.trim()) return false;
  const d = new Date(isoString);
  return !isNaN(d.getTime());
}
