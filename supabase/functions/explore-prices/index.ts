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
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

function getCached(key: string): unknown | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) { cache.delete(key); return null; }
  return entry.data;
}

function setCache(key: string, data: unknown) {
  if (cache.size > 200) {
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
  const currency = (body.currency || "USD").toUpperCase();
  const direct = body.direct === true;

  if (!origin) {
    return json({ ok: false, error: "origin is required" }, 400);
  }

  const cacheKey = `explore:${origin}:${direct}:${currency}`;
  const hit = getCached(cacheKey);
  if (hit) {
    console.log(`[explore-prices] cache hit for ${cacheKey}`);
    return json(hit);
  }

  // Use Travelpayouts Data API v1 — /v1/prices/cheap (cheapest tickets)
  // This endpoint returns cheapest prices from origin to all popular destinations
  const params = new URLSearchParams({
    origin,
    currency,
    token,
  });
  if (direct) params.set("direct", "true");

  const url = `https://api.travelpayouts.com/v1/prices/cheap?${params.toString()}`;
  console.log(`[explore-prices] fetching: ${url.slice(0, 200)}`);

  try {
    const resp = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error(`[explore-prices] API error ${resp.status}: ${text.slice(0, 300)}`);
      return json({ ok: false, error: `API error (${resp.status})` }, 502);
    }

    const raw = await resp.json();

    // raw.data is keyed by destination IATA:
    // { "BCN": { "0": { price: 120, airline: "U2", departure_at: "...", return_at: "...", transfers: 0 } } }
    const dataObj = raw?.data || {};
    const results: any[] = [];

    for (const [destIata, offers] of Object.entries(dataObj)) {
      const offerMap = offers as Record<string, any>;
      // Pick the cheapest offer (key "0" = direct, or lowest)
      let best: any = null;
      for (const offer of Object.values(offerMap)) {
        if (!best || (offer.price && offer.price < best.price)) {
          best = offer;
        }
      }
      if (best && best.price > 0) {
        results.push({
          destinationIata: destIata,
          destinationName: "",
          country: "",
          lat: null,
          lon: null,
          price: Number(best.price),
          departDate: best.departure_at?.slice(0, 10) || null,
          returnDate: best.return_at?.slice(0, 10) || null,
          transfers: best.transfers,
          airline: best.airline,
        });
      }
    }

    // Sort by price
    results.sort((a, b) => a.price - b.price);

    const response = {
      ok: true,
      origin,
      currency,
      count: results.length,
      results,
    };

    setCache(cacheKey, response);
    console.log(`[explore-prices] returning ${results.length} destinations`);
    return json(response);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[explore-prices] error: ${msg}`);
    return json({ ok: false, error: msg }, 502);
  }
});
