/**
 * Pure link validation and sanitization module.
 * 
 * Strict security constraints:
 * - Internal relative links only starting with a single '/'
 * - Rejects protocol schemes (http:, https:, javascript:, data:, etc.)
 * - Rejects protocol-relative links starting with '//'
 * - Rejects backslashes '/\'
 * - Rejects whitespace
 * - Maximum 200 characters
 * 
 * Zero dependencies, no Mongoose, no "@/".
 */

/**
 * Checks whether a given string is a safe internal application link.
 * 
 * @param {any} link 
 * @returns {boolean}
 */
export function isSafeInternalLink(link) {
  if (typeof link !== "string") return false;
  const trimmed = link.trim();
  if (!trimmed || trimmed !== link) return false; // Must have no leading/trailing whitespace
  if (link.length > 200) return false;
  if (/\s/.test(link)) return false; // No embedded whitespace

  // Reject backslashes anywhere in the link to prevent Windows/browser path tricks
  if (link.includes("\\")) return false;

  // Reject URL schemes (e.g., http:, https:, javascript:, data:, blob:)
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(link)) return false;

  // Must start with a single '/' followed by a character that is NOT '/' or '\'
  // Or be exactly '/'
  if (link === "/") return true;
  return /^\/[^/\\]/.test(link);
}

/**
 * Sanitizes a link by verifying it with isSafeInternalLink, returning fallback if invalid.
 * 
 * @param {any} link 
 * @param {string|null} [fallback=null] 
 * @returns {string|null}
 */
export function sanitizeLink(link, fallback = null) {
  return isSafeInternalLink(link) ? link : fallback;
}
