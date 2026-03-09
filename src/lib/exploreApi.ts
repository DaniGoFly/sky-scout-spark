/**
 * API layer for explore-prices and price-trend edge functions
 * Uses the YCP Supabase project for all requests
 */

// Edge functions backend configuration — always use the Cloud project where functions are deployed
const CLOUD_URL = "https://kvhykvuvsbmcselojbcn.supabase.co";
const CLOUD_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2aHlrdnV2c2JtY3NlbG9qYmNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0NzEzODAsImV4cCI6MjA4MzA0NzM4MH0.ChYyprBwbeebvr9nr1xGuexrmciMqIsA2irToTCEQUc";

const EXPLORE_URL = `${CLOUD_URL}/functions/v1/explore-prices`;
const TREND_URL = `${CLOUD_URL}/functions/v1/price-trend`;

const headers: Record<string, string> = {
  "Content-Type": "application/json",
  apikey: CLOUD_KEY,
  Authorization: `Bearer ${CLOUD_KEY}`,
};

/* ── Frontend cache ── */
const FE_CACHE_TTL = 10 * 60 * 1000; // 10 min
const feCache = new Map<string, { ts: number; data: any }>();

function getCached<T>(key: string): T | null {
  const e = feCache.get(key);
  if (!e) return null;
  if (Date.now() - e.ts > FE_CACHE_TTL) { feCache.delete(key); return null; }
  return e.data as T;
}

function setFECache(key: string, data: any) {
  feCache.set(key, { ts: Date.now(), data });
}

/* ── Explore Prices ── */

export interface ExploreResult {
  destinationIata: string;
  destinationName: string;
  country: string;
  lat: number | null;
  lon: number | null;
  price: number;
  departDate?: string;
  returnDate?: string;
}

export interface ExploreResponse {
  ok: boolean;
  origin: string;
  currency: string;
  count: number;
  results: ExploreResult[];
  error?: string;
}

export async function fetchExplorePrices(params: {
  origin: string;
  currency: string;
  locale?: string;
  direct?: boolean;
  one_way?: boolean;
  period?: string;
  min_trip_duration?: number;
  max_trip_duration?: number;
}): Promise<ExploreResponse> {
  const cacheKey = `fe:explore:${params.origin}:${params.currency}:${params.direct}:${params.min_trip_duration}:${params.max_trip_duration}`;
  const hit = getCached<ExploreResponse>(cacheKey);
  if (hit) return hit;

  try {
    const resp = await fetch(EXPLORE_URL, { method: "POST", headers, body: JSON.stringify(params) });
    const data = await resp.json();
    if (data.ok) setFECache(cacheKey, data);
    return data;
  } catch {
    return { ok: false, origin: params.origin, currency: params.currency, count: 0, results: [], error: "Network error" };
  }
}

/* ── Price Trend ── */

export interface TrendPoint {
  date: string;
  price: number;
  transfers?: number;
}

export interface PriceTrendResponse {
  ok: boolean;
  currency: string;
  origin: string;
  destination: string;
  typicalMin: number;
  typicalMax: number;
  points: TrendPoint[];
  updatedAt: string;
  confidence: "low" | "medium" | "high";
  error?: string;
}

const TREND_CACHE_TTL = 60 * 60 * 1000; // 1 hour frontend cache
const trendCache = new Map<string, { ts: number; data: PriceTrendResponse }>();

export async function fetchPriceTrend(params: {
  origin: string;
  destination: string;
  month?: string; // YYYY-MM
  currency: string;
}): Promise<PriceTrendResponse> {
  const cacheKey = `fe:trend:${params.origin}:${params.destination}:${params.month}:${params.currency}`;
  const cached = trendCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < TREND_CACHE_TTL) return cached.data;

  try {
    const resp = await fetch(TREND_URL, { method: "POST", headers, body: JSON.stringify(params) });
    const data = await resp.json();
    if (data.ok) trendCache.set(cacheKey, { ts: Date.now(), data });
    return data;
  } catch {
    return {
      ok: false, currency: params.currency, origin: params.origin, destination: params.destination,
      typicalMin: 0, typicalMax: 0, points: [], updatedAt: "", confidence: "low", error: "Network error",
    };
  }
}
