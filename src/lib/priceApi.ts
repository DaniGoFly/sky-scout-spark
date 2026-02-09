/**
 * Price API — calendar, graph, insight, explore
 * Uses the existing flight-search edge function with new action types
 */

import { FLIGHT_SEARCH_URL, FLIGHT_SEARCH_HEADERS } from "./flightSearchConfig";

/* ── Cache helpers ── */
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

function cached<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return data as T;
  } catch { return null; }
}

function setCache<T>(key: string, data: T) {
  try {
    localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
  } catch { /* ignore */ }
}

/* ── Price Calendar ── */

export interface PriceDay {
  date: string; // YYYY-MM-DD
  price: number | null;
}

export interface PriceCalendarResponse {
  ok: boolean;
  currency: string;
  days: PriceDay[];
  error?: string;
}

export async function fetchPriceCalendar(params: {
  origin: string;
  destination: string;
  month: string; // YYYY-MM
  currency: string;
}): Promise<PriceCalendarResponse> {
  const cacheKey = `gff:priceCalendar:${params.origin}:${params.destination}:${params.month}:${params.currency}`;
  const hit = cached<PriceCalendarResponse>(cacheKey);
  if (hit) return hit;

  try {
    const resp = await fetch(FLIGHT_SEARCH_URL, {
      method: "POST",
      headers: FLIGHT_SEARCH_HEADERS,
      body: JSON.stringify({
        action: "price_calendar",
        origin: params.origin.toUpperCase(),
        destination: params.destination.toUpperCase(),
        month: params.month,
        currency: params.currency,
      }),
    });
    const data = await resp.json();
    if (data.ok) setCache(cacheKey, data);
    return data;
  } catch {
    return { ok: false, currency: params.currency, days: [], error: "Network error" };
  }
}

/* ── Explore destinations ── */

export interface ExploreDestination {
  destination: string;
  price: number;
  depart_date?: string;
  return_date?: string;
  airline?: string;
  stops?: number;
}

export interface ExploreResponse {
  ok: boolean;
  currency: string;
  results: ExploreDestination[];
  error?: string;
}

export async function fetchExploreDestinations(params: {
  origin: string;
  currency: string;
}): Promise<ExploreResponse> {
  const cacheKey = `gff:explore:${params.origin}:${params.currency}`;
  const hit = cached<ExploreResponse>(cacheKey);
  if (hit) return hit;

  try {
    const resp = await fetch(FLIGHT_SEARCH_URL, {
      method: "POST",
      headers: FLIGHT_SEARCH_HEADERS,
      body: JSON.stringify({
        action: "explore",
        origin: params.origin.toUpperCase(),
        currency: params.currency,
      }),
    });
    const data = await resp.json();
    if (data.ok) setCache(cacheKey, data);
    return data;
  } catch {
    return { ok: false, currency: params.currency, results: [], error: "Network error" };
  }
}

/* ── Price Insight ── */

export interface PriceInsightData {
  verdict: "low" | "typical" | "high";
  typicalMin: number;
  typicalMax: number;
  currentPrice: number;
  currency: string;
}

const INSIGHT_KEY_PREFIX = "gff:priceHistory:";

/** Store and analyze price observations to compute insight */
export function computePriceInsight(
  origin: string,
  destination: string,
  currentPrice: number,
  currency: string,
): PriceInsightData | null {
  if (!currentPrice || currentPrice <= 0) return null;

  const key = `${INSIGHT_KEY_PREFIX}${origin}-${destination}`;
  let history: number[] = [];

  try {
    const raw = localStorage.getItem(key);
    if (raw) history = JSON.parse(raw);
  } catch { /* ignore */ }

  // Add current observation
  history.push(currentPrice);
  // Keep last 50 observations
  if (history.length > 50) history = history.slice(-50);

  try {
    localStorage.setItem(key, JSON.stringify(history));
  } catch { /* ignore */ }

  if (history.length < 3) return null;

  const sorted = [...history].sort((a, b) => a - b);
  const p25 = sorted[Math.floor(sorted.length * 0.25)];
  const p75 = sorted[Math.floor(sorted.length * 0.75)];

  let verdict: "low" | "typical" | "high" = "typical";
  if (currentPrice <= p25) verdict = "low";
  else if (currentPrice >= p75) verdict = "high";

  return {
    verdict,
    typicalMin: Math.round(p25),
    typicalMax: Math.round(p75),
    currentPrice: Math.round(currentPrice),
    currency,
  };
}

/* ── Geo detection ── */

export interface GeoData {
  country: string;
  currency: string;
  locale: string;
}

export async function detectGeo(): Promise<GeoData | null> {
  const cacheKey = "gff:geo";
  const hit = cached<GeoData>(cacheKey);
  if (hit) return hit;

  try {
    // Use a free IP geolocation service
    const resp = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(3000) });
    const data = await resp.json();
    const result: GeoData = {
      country: data.country_code || "US",
      currency: data.currency || "USD",
      locale: data.languages?.split(",")[0] || "en",
    };
    setCache(cacheKey, result);
    return result;
  } catch {
    return null;
  }
}
