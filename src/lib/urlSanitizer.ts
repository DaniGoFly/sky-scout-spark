/**
 * URL sanitization utilities for outbound deal links.
 * Ensures all external URLs use HTTPS and are well-formed.
 */

/**
 * Upgrade http:// to https:// and validate URL format.
 * Returns null if the URL is malformed or missing a scheme.
 */
export function sanitizeDealUrl(url: string | undefined | null): string | null {
  if (!url || typeof url !== "string") return null;

  let cleaned = url.trim();

  // Upgrade http → https
  if (cleaned.startsWith("http://")) {
    cleaned = "https://" + cleaned.slice(7);
  }

  // Must be https at this point
  if (!cleaned.startsWith("https://")) return null;

  try {
    new URL(cleaned); // validate
    return cleaned;
  } catch {
    return null;
  }
}
