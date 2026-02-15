/**
 * GDPR Cookie Consent Manager
 * Manages user consent for analytics and marketing/affiliate tracking.
 */

const CONSENT_KEY = "gofly_cookie_consent";

export interface ConsentData {
  version: number;
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  ts: number;
}

/** Get stored consent or null if not yet decided */
export function getConsent(): ConsentData | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentData;
    if (parsed.version && typeof parsed.analytics === "boolean") return parsed;
    return null;
  } catch {
    return null;
  }
}

/** Check if user has made any consent decision */
export function hasConsentDecision(): boolean {
  return getConsent() !== null;
}

/** Check if a specific consent type is granted */
export function hasConsent(type: "analytics" | "marketing"): boolean {
  const consent = getConsent();
  if (!consent) return false; // Default OFF until user accepts
  return consent[type] === true;
}

/** Save consent preferences */
export function saveConsent(analytics: boolean, marketing: boolean): void {
  const data: ConsentData = {
    version: 1,
    necessary: true,
    analytics,
    marketing,
    ts: Date.now(),
  };
  localStorage.setItem(CONSENT_KEY, JSON.stringify(data));
  window.dispatchEvent(new CustomEvent("consent-updated", { detail: data }));
}

/** Accept all cookies */
export function acceptAll(): void {
  saveConsent(true, true);
}

/** Reject all non-essential cookies */
export function rejectAll(): void {
  saveConsent(false, false);
}
