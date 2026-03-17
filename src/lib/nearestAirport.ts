/**
 * Nearest Airport Finder using Haversine formula
 */
import { AIRPORTS, calculateDistance, type AirportData } from "./airports";
import { toast } from "sonner";

const GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 300000,
};

export interface NearestAirportResult {
  airport: AirportData;
  distanceKm: number;
}

export function findNearestAirport(lat: number, lon: number): NearestAirportResult | null {
  let nearest: AirportData | null = null;
  let minDist = Infinity;

  for (const a of AIRPORTS) {
    const d = calculateDistance(lat, lon, a.lat, a.lon);
    if (d < minDist) {
      minDist = d;
      nearest = a;
    }
  }

  if (!nearest) return null;
  return { airport: nearest, distanceKm: Math.round(minDist) };
}

function isPermissionsPolicyBlocked(): boolean {
  const policy = (document as Document & {
    permissionsPolicy?: { allowsFeature: (feature: string) => boolean };
    featurePolicy?: { allowsFeature: (feature: string) => boolean };
  }).permissionsPolicy ??
    (document as Document & {
      permissionsPolicy?: { allowsFeature: (feature: string) => boolean };
      featurePolicy?: { allowsFeature: (feature: string) => boolean };
    }).featurePolicy;

  if (!policy || typeof policy.allowsFeature !== "function") return false;

  try {
    return !policy.allowsFeature("geolocation");
  } catch (error) {
    console.warn("[GoFlyFinder] Could not evaluate Permissions-Policy geolocation status:", error);
    return false;
  }
}

function isInsideIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function isEmbeddedBrowser(): boolean {
  const ua = navigator.userAgent || "";
  return /FBAN|FBAV|Instagram|Line\/|Twitter|LinkedInApp|wv|WebView/i.test(ua);
}

/**
 * Request geolocation and return the nearest airport.
 * Uses getCurrentPosition directly (no navigator.permissions check)
 * for maximum mobile Safari compatibility.
 */
export function requestNearestAirport(): Promise<NearestAirportResult | null> {
  return new Promise((resolve) => {
    console.log("[GoFlyFinder] Use my location button tapped");

    if (!window.isSecureContext) {
      console.error("[GoFlyFinder] Geolocation blocked: insecure context (HTTPS required)");
      toast.error("Geolocation requires HTTPS (secure context).");
      resolve(null);
      return;
    }

    if (isPermissionsPolicyBlocked()) {
      console.error("[GoFlyFinder] Geolocation blocked by Permissions-Policy");
      toast.error("Geolocation blocked by Permissions-Policy.");
      resolve(null);
      return;
    }

    const insideIframe = isInsideIframe();
    const embeddedBrowser = isEmbeddedBrowser();

    if (insideIframe) {
      console.warn("[GoFlyFinder] Running inside an iframe/webview context");
      toast.info("Embedded context detected (iframe/webview): geolocation may be restricted.");
    }

    if (embeddedBrowser) {
      console.warn("[GoFlyFinder] Running inside an embedded browser");
      toast.info("Embedded browser detected: geolocation may be restricted.");
    }

    if (!navigator.geolocation) {
      console.error("[GoFlyFinder] navigator.geolocation is unavailable");
      toast.error("Geolocation is not supported by your browser.");
      resolve(null);
      return;
    }

    console.log("[GoFlyFinder] getCurrentPosition called", GEO_OPTIONS);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        console.log("[GoFlyFinder] Geolocation success");
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        console.log("[GoFlyFinder] Latitude/Longitude received:", lat, lon);

        try {
          const result = findNearestAirport(lat, lon);
          console.log("[GoFlyFinder] Airport lookup result:", result);

          if (!result) {
            console.error("[GoFlyFinder] Airport lookup failed after successful geolocation");
            toast.error("We got your location, but couldn’t find a nearby airport.");
            resolve(null);
            return;
          }

          console.log("[GoFlyFinder] Nearest airport found:", result.airport.code, result.distanceKm, "km");
          resolve(result);
        } catch (lookupError) {
          console.error("[GoFlyFinder] Airport lookup error:", lookupError);
          toast.error("We got your location, but couldn’t find a nearby airport.");
          resolve(null);
        }
      },
      (error) => {
        console.error(`[GoFlyFinder] Geolocation error code=${error.code} message=${error.message}`);

        switch (error.code) {
          case 1:
            toast.error(`Location permission denied (code: ${error.code}, message: ${error.message})`);
            break;
          case 2:
            toast.error(`Position unavailable (code: ${error.code}, message: ${error.message})`);
            break;
          case 3:
            toast.error(`Location request timed out (code: ${error.code}, message: ${error.message})`);
            break;
          default:
            toast.error(`Geolocation error (code: ${error.code}, message: ${error.message})`);
        }

        resolve(null);
      },
      GEO_OPTIONS
    );
  });
}
