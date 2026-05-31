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
