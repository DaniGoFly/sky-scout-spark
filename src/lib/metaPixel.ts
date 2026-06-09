// Meta Pixel helper — safe global wrappers. The actual fbq + window.gffTrack
// are bootstrapped in index.html. These helpers never throw if blocked.

type Params = Record<string, unknown>;

declare global {
  interface Window {
    gffTrack?: (eventName: string, params?: Params) => void;
    gffTrackCustom?: (eventName: string, params?: Params) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

export function metaTrack(eventName: string, params?: Params): void {
  try {
    if (typeof window === "undefined") return;
    if (typeof window.gffTrack === "function") {
      window.gffTrack(eventName, params);
    } else if (typeof window.fbq === "function") {
      window.fbq("track", eventName, params || {});
    }
  } catch (err) {
    // never break the app
    // eslint-disable-next-line no-console
    console.warn("metaTrack failed", err);
  }
}

export function metaTrackCustom(eventName: string, params?: Params): void {
  try {
    if (typeof window === "undefined") return;
    if (typeof window.gffTrackCustom === "function") {
      window.gffTrackCustom(eventName, params);
    } else if (typeof window.fbq === "function") {
      window.fbq("trackCustom", eventName, params || {});
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("metaTrackCustom failed", err);
  }
}

export function metaPageView(): void {
  metaTrack("PageView");
}

// Generic alias matching spec naming: trackMetaEvent(name, params)
export const trackMetaEvent = metaTrack;

// Convenience: fire a "Search" event from a flight-search URLSearchParams.
// Accepts any URLSearchParams-shaped value the search forms produce.
export function trackFlightSearch(params: URLSearchParams): void {
  const origin = params.get("from") || "";
  const destination = params.get("to") || "";
  metaTrack("Search", {
    content_category: "flights",
    search_string: `${origin}-${destination}`,
    origin,
    destination,
    departure_date: params.get("depart") || "",
    return_date: params.get("return") || null,
    adults: Number(params.get("adults")) || 1,
    children: Number(params.get("children")) || 0,
    infants: Number(params.get("infants")) || 0,
    cabin_class: params.get("class") || "economy",
    currency: params.get("currency") || "EUR",
  });
}
