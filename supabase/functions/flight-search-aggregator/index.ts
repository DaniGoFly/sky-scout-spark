import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getEnabledProviders, getProviderByName } from "./providers/registry.ts";
import { dedupe, sortFlights } from "./merge.ts";
import type { SearchParams } from "./types.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function safeStr(x: unknown, max = 500): string {
  const s = typeof x === "string" ? x : "";
  return s.length > max ? s.slice(0, max) : s;
}

function userIpFrom(req: Request, body: any): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    safeStr(body?.user_ip, 50) ||
    "127.0.0.1"
  );
}

function buildDirections(body: any): SearchParams["directions"] {
  if (Array.isArray(body?.directions) && body.directions.length) {
    return body.directions.map((d: any) => ({
      origin: safeStr(d?.origin, 10).toUpperCase().slice(0, 3),
      destination: safeStr(d?.destination, 10).toUpperCase().slice(0, 3),
      date: safeStr(d?.date, 20),
    }));
  }
  const origin = safeStr(body?.origin, 10).toUpperCase().slice(0, 3);
  const destination = safeStr(body?.destination, 10).toUpperCase().slice(0, 3);
  const date = safeStr(body?.depart_date, 20);
  const ret = safeStr(body?.return_date, 20);
  const dirs: SearchParams["directions"] = [{ origin, destination, date }];
  if (ret) dirs.push({ origin: destination, destination: origin, date: ret });
  return dirs;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let body: any = {};
  try { body = await req.json(); } catch { body = {}; }

  const action = safeStr(body?.action, 50);

  // ---- action: click — route to originating provider by id prefix ----
  if (action === "click" || action === "resolve_deal") {
    const flightId = safeStr(body?.flight_id ?? body?.flightId ?? "", 300);
    const explicit = safeStr(body?.provider, 50).toLowerCase();
    const providerName = explicit || flightId.split(":")[0] || "aviasales";
    const provider = getProviderByName(providerName);
    if (!provider) return json({ ok: false, error: `unknown provider: ${providerName}` }, 400);
    const result = await provider.getClickUrl({
      flightId,
      extra: {
        search_id: body?.search_id,
        proposal_id: body?.proposal_id,
        results_base: body?.results_base,
      },
    });
    return json({ ok: result.ok, step: "click", deal_url: result.deal_url, error: result.error });
  }

  // ---- action: search — fan-out to all enabled providers ----
  if (action === "search" || !action) {
    const providers = getEnabledProviders();
    if (providers.length === 0) {
      return json({ ok: false, error: "No providers enabled" }, 500);
    }

    const params: SearchParams = {
      directions: buildDirections(body),
      adults: Math.max(1, Math.min(9, Number(body?.adults ?? 1))),
      children: Math.max(0, Math.min(6, Number(body?.children ?? 0))),
      infants: Math.max(0, Math.min(6, Number(body?.infants ?? 0))),
      currency: safeStr(body?.currency_code ?? body?.currency ?? "EUR", 10).toUpperCase(),
      market: safeStr(body?.market_code ?? body?.market ?? "US", 10).toUpperCase(),
      locale: safeStr(body?.locale ?? "en", 10).toLowerCase(),
      tripClass: safeStr(body?.trip_class ?? body?.cabin_class ?? "Y", 20),
      limit: Math.max(1, Math.min(200, Number(body?.limit ?? 100))),
      sort: (safeStr(body?.sort, 20) as SearchParams["sort"]) || "best",
      userIp: userIpFrom(req, body),
    };

    const settled = await Promise.allSettled(
      providers.map(async (p) => {
        const res = await p.searchFlights(params);
        if (!res.ok) return { provider: p.name, flights: [], error: res.error, context: null };
        const flights = p.normalizeResults(res.raw, res.context);
        return { provider: p.name, flights, error: null, context: res.context ?? null };
      }),
    );

    const providerReports: Array<Record<string, unknown>> = [];
    let merged: any[] = [];
    let envelopeSearchId = "";
    let envelopeResultsBase = "";

    for (const s of settled) {
      if (s.status !== "fulfilled") {
        providerReports.push({ provider: "unknown", ok: false, error: String(s.reason) });
        continue;
      }
      const r = s.value;
      providerReports.push({
        provider: r.provider,
        ok: !r.error,
        count: r.flights.length,
        error: r.error ?? undefined,
      });
      merged = merged.concat(r.flights);
      if (r.provider === "aviasales" && r.context && !envelopeSearchId) {
        envelopeSearchId = String((r.context as any).search_id ?? "");
        envelopeResultsBase = String((r.context as any).results_base ?? "");
      }
    }

    const deduped = dedupe(merged);
    const sorted = sortFlights(deduped, params.sort).slice(0, params.limit);

    // Re-hydrate legacy price shape expected by SkyscannerFlightCard / flightNormalizer.
    const flightsOut = sorted.map((f) => ({
      ...f,
      price: f.price_legacy ?? { amount: f.price, currency: f.currency },
    }));

    return json({
      ok: true,
      step: "search",
      search_id: envelopeSearchId,
      results_base: envelopeResultsBase,
      flights: flightsOut,
      providers: providerReports,
    });
  }

  return json({ ok: false, error: `Invalid action: ${action}` }, 400);
});