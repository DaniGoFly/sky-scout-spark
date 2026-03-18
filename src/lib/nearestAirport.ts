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

/**
 * Airport importance tiers — major hubs get a big boost so they're preferred
 * over small regional airports even when slightly further away.
 * Tier 1 = global/continental hub, Tier 2 = national hub, Tier 3 = regional.
 */
const AIRPORT_TIER: Record<string, 1 | 2> = {
  // Tier 1 — major international hubs
  FRA: 1, MUC: 1, LHR: 1, CDG: 1, AMS: 1, IST: 1, MAD: 1, BCN: 1,
  FCO: 1, ZRH: 1, VIE: 1, JFK: 1, LAX: 1, ORD: 1, ATL: 1, DFW: 1,
  DEN: 1, SFO: 1, MIA: 1, SEA: 1, BOS: 1, DXB: 1, SIN: 1, HKG: 1,
  NRT: 1, ICN: 1, SYD: 1, MEL: 1, YYZ: 1, LIS: 1, CPH: 1, OSL: 1,
  ARN: 1, HEL: 1, BRU: 1, DUB: 1, MAN: 1,
  // Tier 2 — national / large secondary
  BER: 2, DUS: 2, HAM: 2, STR: 2, CGN: 2, HAJ: 2, MXP: 2, LIN: 2,
  NAP: 2, ORY: 2, LYS: 2, NCE: 2, TXL: 2, EWR: 2, LGA: 2, OAK: 2,
  SJC: 2, MDW: 2, FLL: 2, PHL: 2, IAD: 2, DCA: 2, BWI: 2, MSP: 2,
  DTW: 2, CLT: 2, PHX: 2, IAH: 2, MCO: 2, TPA: 2, SAN: 2, PDX: 2,
  EDI: 2, GLA: 2, BHX: 2, STN: 2, LGW: 2, LTN: 2, AGP: 2, PMI: 2,
  PRG: 2, WAW: 2, BUD: 2, OTP: 2, SOF: 2, ATH: 2, SKG: 2,
};

function getAirportTier(code: string): 1 | 2 | 3 {
  return AIRPORT_TIER[code] ?? 3;
}

/** Size score: tier 1 = 1.0, tier 2 = 0.7, tier 3 = 0.3 */
function sizeScore(code: string): number {
  const tier = getAirportTier(code);
  if (tier === 1) return 1.0;
  if (tier === 2) return 0.7;
  return 0.3;
}

export interface RankedAirport {
  airport: AirportData;
  distanceKm: number;
  score: number;
  tier: 1 | 2 | 3;
}

/**
 * Find the BEST nearby airport using distance + size scoring.
 * Returns top candidates within 200 km, scored 50% distance + 50% size.
 */
export function findBestAirport(
  lat: number,
  lon: number,
  radiusKm = 200,
): { best: RankedAirport; candidates: RankedAirport[] } | null {
  console.log(`[GoFlyFinder] findBestAirport lat=${lat} lon=${lon} radius=${radiusKm}km`);

  const within = AIRPORTS.map((airport) => ({
    airport,
    dist: calculateDistance(lat, lon, airport.lat, airport.lon),
  }))
    .filter((a) => a.dist <= radiusKm)
    .sort((a, b) => a.dist - b.dist);

  if (within.length === 0) {
    // Fallback: take absolute closest regardless of radius
    const all = AIRPORTS.map((a) => ({
      airport: a,
      dist: calculateDistance(lat, lon, a.lat, a.lon),
    })).sort((a, b) => a.dist - b.dist);
    if (all.length === 0) return null;
    const closest = all[0];
    const ranked: RankedAirport = {
      airport: closest.airport,
      distanceKm: Math.round(closest.dist),
      score: 1,
      tier: getAirportTier(closest.airport.code),
    };
    return { best: ranked, candidates: [ranked] };
  }

  // Normalize distance: closest = 1.0, furthest in radius = 0.0
  const maxDist = Math.max(...within.map((a) => a.dist), 1);

  const scored: RankedAirport[] = within.map((a) => {
    const distNorm = 1 - a.dist / maxDist; // closer = higher
    const size = sizeScore(a.airport.code);
    const score = distNorm * 0.5 + size * 0.5;
    return {
      airport: a.airport,
      distanceKm: Math.round(a.dist),
      score: Math.round(score * 1000) / 1000,
      tier: getAirportTier(a.airport.code),
    };
  });

  scored.sort((a, b) => b.score - a.score);

  const top3 = scored.slice(0, 3);
  console.log(
    "[GoFlyFinder] Top 3 scored airports:\n" +
      top3
        .map(
          (c, i) =>
            `  ${i + 1}. ${c.airport.code} (${c.airport.city}) — ${c.distanceKm}km, tier=${c.tier}, score=${c.score}`,
        )
        .join("\n"),
  );

  return { best: scored[0], candidates: top3 };
}

/** Legacy wrapper — still returns nearest by distance only */
export function findNearestAirport(lat: number, lon: number): NearestAirportResult | null {
  const result = findBestAirport(lat, lon);
  if (!result) return null;

  return {
    airport: result.best.airport,
    distanceKm: result.best.distanceKm,
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
