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
 */
function requestGeoPosition(): Promise<{ lat: number; lon: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.log("[GoFlyFinder] navigator.geolocation unavailable");
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        console.log("[GoFlyFinder] Geolocation success:", pos.coords.latitude, pos.coords.longitude);
        resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      },
      (error) => {
        // Silent failure — no toasts, no alerts. User can type manually.
        console.log(`[GoFlyFinder] Geolocation error code=${error.code} message="${error.message}"`);
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
  console.log("[GoFlyFinder] Use my location tapped");

  // Try GPS first
  let coords = await requestGeoPosition();

  // Fallback to IP geolocation if GPS failed
  if (!coords) {
    console.log("[GoFlyFinder] GPS failed, trying IP fallback...");
    coords = await ipFallbackLocation();
  }

  if (!coords) {
    console.log("[GoFlyFinder] All location methods failed — user can type manually");
    return null;
  }

  try {
    const result = findNearestAirport(coords.lat, coords.lon);
    if (result) {
      console.log("[GoFlyFinder] Nearest airport:", result.airport.code, result.distanceKm, "km");
    } else {
      console.log("[GoFlyFinder] No airport found for coordinates");
    }
    return result;
  } catch (err) {
    console.log("[GoFlyFinder] Airport lookup error:", err);
    return null;
  }
}
