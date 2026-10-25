/**
 * Pure deduplication key generator.
 * 
 * Generates stable keys to prevent duplicate notifications from being
 * inserted under retry loops, concurrent requests, or double clicks.
 * 
 * Zero dependencies, no Mongoose, no "@/".
 */

/**
 * Builds a deterministic deduplication key for a notification event.
 * 
 * @param {string} type - Notification type (e.g. 'invitation_received')
 * @param {string|number|Array<string|number>|object} parts - Identifier parts
 * @returns {string} - Deterministic deduplication key
 */
export function buildDedupeKey(type, parts) {
  if (!type || typeof type !== "string") {
    throw new Error("Valid notification type string is required to build a dedupe key");
  }

  const cleanType = type.trim();
  let segments = [];

  if (Array.isArray(parts)) {
    segments = parts.map((p) => (p !== null && p !== undefined ? String(p).trim() : "")).filter(Boolean);
  } else if (parts && typeof parts === "object") {
    // Sort object keys for stability
    const keys = Object.keys(parts).sort();
    segments = keys
      .map((k) => {
        const val = parts[k];
        return val !== null && val !== undefined ? `${k}=${String(val).trim()}` : "";
      })
      .filter(Boolean);
  } else if (parts !== null && parts !== undefined) {
    const str = String(parts).trim();
    if (str) segments = [str];
  }

  if (segments.length === 0) {
    return cleanType;
  }

  return `${cleanType}:${segments.join(":")}`;
}
