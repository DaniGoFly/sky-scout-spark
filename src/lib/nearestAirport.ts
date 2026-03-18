/**
 * Nearest Airport Finder — silent, retryable, Safari-compatible.
 * Never shows error UI. Fails silently so the user can type manually.
 */
import { AIRPORTS, calculateDistance, type AirportData } from "./airports";

export interface NearestAirportResult {
  airport: AirportData;
  distanceKm: number;
}

export function findNearestAirport(lat: number, lon: number): NearestAirportResult | null {
  console.log(`[GoFlyFinder] findNearestAirport called with lat=${lat} lon=${lon}`);

  const ranked = AIRPORTS.map(a => ({
    airport: a,
    dist: calculateDistance(lat, lon, a.lat, a.lon),
  })).sort((a, b) => a.dist - b.dist);

  // Debug: log top 10 candidates with exact distances
  console.log(
    "[GoFlyFinder] Top 10 nearest airports:\n" +
    ranked.slice(0, 10).map((r, i) =>
      `  ${i + 1}. ${r.airport.code} (${r.airport.city}, ${r.airport.country}) — ${Math.round(r.dist)}km [lat=${r.airport.lat} lon=${r.airport.lon}]`
    ).join("\n")
  );

  if (ranked.length === 0) return null;

  const winner = ranked[0];
  console.log(`[GoFlyFinder] ★ Winner: ${winner.airport.code} (${winner.airport.city}) at ${Math.round(winner.dist)}km`);
  return { airport: winner.airport, distanceKm: Math.round(winner.dist) };
}

/**
 * IP-based fallback: uses a free geolocation API to approximate location.
 * Returns null silently on any failure.
 */
async function ipFallbackLocation(): Promise<{ lat: number; lon: number } | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch("https://ipapi.co/json/", { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    if (typeof data.latitude === "number" && typeof data.longitude === "number") {
      console.log("[GoFlyFinder] IP fallback location:", data.latitude, data.longitude, data.city);
      return { lat: data.latitude, lon: data.longitude };
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
function requestGeoPosition(): Promise<{ lat: number; lon: number; source: "gps" } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.log("[GoFlyFinder] navigator.geolocation unavailable");
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        console.log(
          "[GoFlyFinder] GPS success — lat:", pos.coords.latitude,
          "lon:", pos.coords.longitude,
          "accuracy:", pos.coords.accuracy, "m"
        );
        resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude, source: "gps" });
      },
      (error) => {
        console.log(`[GoFlyFinder] GPS error code=${error.code} message="${error.message}"`);
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
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

  // Always try GPS first — directly from user gesture
  const gpsCoords = await requestGeoPosition();

  let coords: { lat: number; lon: number } | null = null;
  let source = "none";

  if (gpsCoords) {
    // GPS succeeded — use it, NEVER override with IP
    coords = { lat: gpsCoords.lat, lon: gpsCoords.lon };
    source = "gps";
    console.log(`[GoFlyFinder] ✅ Using GPS coordinates: lat=${coords.lat} lon=${coords.lon}`);
  } else {
    // GPS failed — fallback to IP
    console.log("[GoFlyFinder] ⚠️ GPS failed, trying IP fallback...");
    const ipCoords = await ipFallbackLocation();
    if (ipCoords) {
      coords = ipCoords;
      source = "ip-fallback";
      console.log(`[GoFlyFinder] ⚠️ Using IP fallback coordinates: lat=${coords.lat} lon=${coords.lon}`);
      console.log("[GoFlyFinder] ⚠️ IP location is approximate — airport may not be truly nearest");
    }
  }

  if (!coords) {
    console.log("[GoFlyFinder] ❌ All location methods failed — user can type manually");
    return null;
  }

  console.log(`[GoFlyFinder] Final coords: lat=${coords.lat} lon=${coords.lon} source=${source}`);

  try {
    const result = findNearestAirport(coords.lat, coords.lon);
    if (result) {
      console.log(`[GoFlyFinder] ✓ Selected: ${result.airport.code} (${result.airport.city}) — ${result.distanceKm}km away [source: ${source}]`);
    } else {
      console.log("[GoFlyFinder] No airport found for coordinates");
    }
    console.log("[GoFlyFinder] ═══════════════════════════════════════");
    return result;
  } catch (err) {
    console.log("[GoFlyFinder] Airport lookup error:", err);
    return null;
  }
}
