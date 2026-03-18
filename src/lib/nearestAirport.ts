/**
 * Nearest Airport Finder — silent, retryable, Safari-compatible.
 * Never shows error UI. Fails silently so the user can type manually.
 */
import { AIRPORTS, calculateDistance, type AirportData } from "./airports";

export type LocationSource = "gps" | "ip-fallback";

export interface NearestAirportResult {
  airport: AirportData;
  distanceKm: number;
  coords: {
    lat: number;
    lon: number;
  };
  source: LocationSource;
}

function readCachedAirportHints() {
  const matchedKeys: string[] = [];
  let matchedValuesPreview: string[] = [];

  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (/(airport|origin|from|location)/i.test(key)) {
        matchedKeys.push(`localStorage:${key}`);
        const value = localStorage.getItem(key);
        if (value) {
          matchedValuesPreview.push(`${key}=${value.slice(0, 80)}`);
        }
      }
    }
  } catch {
    // ignore
  }

  try {
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const key = sessionStorage.key(i);
      if (!key) continue;
      if (/(airport|origin|from|location)/i.test(key)) {
        matchedKeys.push(`sessionStorage:${key}`);
        const value = sessionStorage.getItem(key);
        if (value) {
          matchedValuesPreview.push(`${key}=${value.slice(0, 80)}`);
        }
      }
    }
  } catch {
    // ignore
  }

  matchedValuesPreview = matchedValuesPreview.slice(0, 5);

  return {
    count: matchedKeys.length,
    keys: matchedKeys,
    valuesPreview: matchedValuesPreview,
  };
}

export function findNearestAirport(lat: number, lon: number): NearestAirportResult | null {
  console.log(`[GoFlyFinder] findNearestAirport called with lat=${lat} lon=${lon}`);

  const ranked = AIRPORTS.map((airport) => ({
    airport,
    dist: calculateDistance(lat, lon, airport.lat, airport.lon),
  })).sort((a, b) => a.dist - b.dist);

  console.log(
    "[GoFlyFinder] Top 10 nearest airports:\n" +
      ranked
        .slice(0, 10)
        .map(
          (candidate, index) =>
            `  ${index + 1}. ${candidate.airport.code} (${candidate.airport.name}) — ${candidate.dist.toFixed(2)}km [lat=${candidate.airport.lat} lon=${candidate.airport.lon}]`,
        )
        .join("\n"),
  );

  if (ranked.length === 0) return null;

  const winner = ranked[0];
  console.log(
    `[GoFlyFinder] ★ Winner: ${winner.airport.code} (${winner.airport.city}) at ${winner.dist.toFixed(2)}km`,
  );

  return {
    airport: winner.airport,
    distanceKm: Math.round(winner.dist),
    coords: { lat, lon },
    source: "gps",
  };
}

/**
 * IP-based fallback: uses a free geolocation API to approximate location.
 * Returns null silently on any failure.
 */
async function ipFallbackLocation(): Promise<{ lat: number; lon: number; source: "ip-fallback" } | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch("https://ipapi.co/json/", { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;

    const data = await res.json();
    if (typeof data.latitude === "number" && typeof data.longitude === "number") {
      console.log("[GoFlyFinder] IP fallback location:", data.latitude, data.longitude, data.city);
      return { lat: data.latitude, lon: data.longitude, source: "ip-fallback" };
    }

    return null;
  } catch {
    console.log("[GoFlyFinder] IP fallback failed silently");
    return null;
  }
}

/**
 * Core geolocation request via getCurrentPosition.
 * Returns coordinates or null. Never shows UI errors.
 * Uses maximumAge: 0 to force fresh coordinates every time.
 */
function requestGeoPosition(): Promise<{ lat: number; lon: number; source: "gps"; accuracy: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.log("[GoFlyFinder] navigator.geolocation unavailable");
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        console.log(
          "[GoFlyFinder] GPS success — lat:",
          pos.coords.latitude,
          "lon:",
          pos.coords.longitude,
          "accuracy:",
          pos.coords.accuracy,
          "m",
        );
        resolve({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          source: "gps",
          accuracy: pos.coords.accuracy,
        });
      },
      (error) => {
        console.log(`[GoFlyFinder] GPS error code=${error.code} message=\"${error.message}\"`);
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  });
}

/**
 * Request geolocation and return the nearest airport.
 *
 * Strategy:
 * 1. Try GPS via getCurrentPosition (triggered by user gesture)
 * 2. If GPS fails, try IP-based fallback
 * 3. If both fail, return null silently
 *
 * NEVER shows error toasts/alerts. Always retryable.
 */
export async function requestNearestAirport(): Promise<NearestAirportResult | null> {
  console.log("[GoFlyFinder] ═══════════════════════════════════════");
  console.log("[GoFlyFinder] 'Use my location' tapped — starting fresh lookup");
  console.log("[GoFlyFinder] isSecureContext:", window.isSecureContext);
  console.log("[GoFlyFinder] navigator.geolocation available:", !!navigator.geolocation);

  const cachedHints = readCachedAirportHints();
  console.log("[GoFlyFinder] Cached airport/location keys found:", cachedHints.count, cachedHints.keys);
  if (cachedHints.valuesPreview.length) {
    console.log("[GoFlyFinder] Cached value previews:", cachedHints.valuesPreview);
  }

  const gpsCoords = await requestGeoPosition();

  let coords: { lat: number; lon: number } | null = null;
  let source: LocationSource = "gps";

  if (gpsCoords) {
    coords = { lat: gpsCoords.lat, lon: gpsCoords.lon };
    source = "gps";
    console.log(`[GoFlyFinder] ✅ Using GPS coordinates: lat=${coords.lat} lon=${coords.lon}`);
  } else {
    console.log("[GoFlyFinder] ⚠️ GPS failed, trying IP fallback...");
    const ipCoords = await ipFallbackLocation();
    if (ipCoords) {
      coords = { lat: ipCoords.lat, lon: ipCoords.lon };
      source = "ip-fallback";
      console.log(`[GoFlyFinder] ⚠️ Using IP fallback coordinates: lat=${coords.lat} lon=${coords.lon}`);
      console.log("[GoFlyFinder] ⚠️ Fallback path triggered (GPS unavailable)");
    }
  }

  if (!coords) {
    console.log("[GoFlyFinder] ❌ All location methods failed — user can type manually");
    return null;
  }

  console.log(`[GoFlyFinder] Final coords: lat=${coords.lat} lon=${coords.lon} source=${source}`);

  try {
    const nearest = findNearestAirport(coords.lat, coords.lon);
    if (nearest) {
      const result: NearestAirportResult = {
        ...nearest,
        coords,
        source,
      };
      console.log(
        `[GoFlyFinder] ✓ Selected: ${result.airport.code} (${result.airport.city}) — ${result.distanceKm}km away [source: ${source}]`,
      );
      console.log("[GoFlyFinder] ═══════════════════════════════════════");
      return result;
    }

    console.log("[GoFlyFinder] No airport found for coordinates");
    console.log("[GoFlyFinder] ═══════════════════════════════════════");
    return null;
  } catch (err) {
    console.log("[GoFlyFinder] Airport lookup error:", err);
    return null;
  }
}
