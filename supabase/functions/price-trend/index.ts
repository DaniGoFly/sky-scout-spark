import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/* ── In-memory cache ── */
interface CacheEntry { data: unknown; ts: number }
const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours

function getCached(key: string): unknown | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) { cache.delete(key); return null; }
  return entry.data;
}

function setCache(key: string, data: unknown) {
  if (cache.size > 500) {
    const now = Date.now();
    for (const [k, v] of cache) {
      if (now - v.ts > CACHE_TTL) cache.delete(k);
    }
  }
  cache.set(key, { data, ts: Date.now() });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const token = Deno.env.get("TP_API_KEY") || Deno.env.get("TRAVELPAYOUTS_API_TOKEN") || "";
  if (!token) {
    return json({ ok: false, error: "Missing API credentials" }, 500);
  }

  let body: any = {};
  try { body = await req.json(); } catch { /* empty */ }

  const origin = (body.origin || "").toUpperCase().slice(0, 3);
  const destination = (body.destination || "").toUpperCase().slice(0, 3);
  const currency = (body.currency || "USD").toUpperCase();
  const month = body.month || ""; // YYYY-MM

  if (!origin || !destination) {
    return json({ ok: false, error: "origin and destination are required" }, 400);
  }

  const cacheKey = `trend:${origin}:${destination}:${month}:${currency}`;
  const hit = getCached(cacheKey);
  if (hit) {
    console.log(`[price-trend] cache hit for ${cacheKey}`);
    return json(hit);
  }

  // Travelpayouts Data API — prices for each day of month
  // GET /v1/prices/calendar?origin=X&destination=Y&calendar_type=departure_date&depart_date=YYYY-MM
  const params = new URLSearchParams({
    origin,
    destination,
    calendar_type: "departure_date",
    currency,
    token,
  });
  if (month) params.set("depart_date", month);

  const url = `https://api.travelpayouts.com/v1/prices/calendar?${params.toString()}`;
  console.log(`[price-trend] fetching: ${url.slice(0, 180)}`);

  try {
    const resp = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error(`[price-trend] API error ${resp.status}: ${text.slice(0, 300)}`);
      return json({ ok: false, error: `API error (${resp.status})` }, 502);
    }

    const raw = await resp.json();

    // raw.data is keyed by date: { "2026-03-01": { price: 300, transfers: 1, ... }, ... }
    const dataObj = raw?.data || {};
    const points: { date: string; price: number; transfers?: number }[] = [];

    for (const [date, info] of Object.entries(dataObj)) {
      const d = info as any;
      if (d.price && d.price > 0) {
        points.push({
          date,
          price: Number(d.price),
          transfers: d.transfers ?? d.number_of_changes ?? undefined,
        });
      }
    }

    // Sort by date
    points.sort((a, b) => a.date.localeCompare(b.date));

    if (points.length === 0) {
      const emptyResponse = {
        ok: true,
        currency,
        origin,
        destination,
        typicalMin: 0,
        typicalMax: 0,
        points: [],
        updatedAt: new Date().toISOString(),
        confidence: "low" as const,
      };
      return json(emptyResponse);
    }

    // Compute stats
    const prices = points.map(p => p.price);
    const sorted = [...prices].sort((a, b) => a - b);
    const typicalMin = sorted[Math.floor(sorted.length * 0.1)] || sorted[0];
    const typicalMax = sorted[Math.floor(sorted.length * 0.9)] || sorted[sorted.length - 1];

    let confidence: "low" | "medium" | "high" = "low";
    if (points.length >= 20) confidence = "high";
    else if (points.length >= 10) confidence = "medium";

    const response = {
      ok: true,
      currency,
      origin,
      destination,
      typicalMin: Math.round(typicalMin),
      typicalMax: Math.round(typicalMax),
      points,
      updatedAt: new Date().toISOString(),
      confidence,
    };

    setCache(cacheKey, response);
    console.log(`[price-trend] returning ${points.length} data points, range ${typicalMin}-${typicalMax}`);
    return json(response);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[price-trend] error: ${msg}`);
    return json({ ok: false, error: msg }, 502);
  }
});
