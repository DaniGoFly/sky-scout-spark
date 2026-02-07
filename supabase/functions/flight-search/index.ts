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

function isHttpUrl(url: unknown): url is string {
  return typeof url === "string" && (url.startsWith("https://") || url.startsWith("http://"));
}

function safeStr(x: unknown, max = 500): string {
  const s = typeof x === "string" ? x : "";
  return s.length > max ? s.slice(0, max) : s;
}

async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return await Promise.race([
    p,
    new Promise<T>((_, rej) =>
      setTimeout(() => rej(new Error(`Timeout: ${label}`)), ms)
    ),
  ]);
}

function buildResultsBase(resultsUrl: unknown): string {
  const raw = safeStr(resultsUrl, 500);
  if (!raw) return "https://tickets-api.travelpayouts.com";
  try {
    // results_url can be either host-only or full URL
    if (raw.startsWith("http")) return new URL(raw).origin;
    return `https://${raw.replace(/^https?:\/\//, "")}`;
  } catch {
    return "https://tickets-api.travelpayouts.com";
  }
}

type ResolveDealResult =
  | { ok: true; booking_url: string }
  | { ok: false; error: string; upstream?: string };

async function resolveDealUrl(args: {
  token: string;
  marker: string;
  search_id: string;
  click_id: string;
  results_base?: string | null;
}): Promise<ResolveDealResult> {
  const base = isHttpUrl(args.results_base) ? args.results_base : "https://tickets-api.travelpayouts.com";
  const clickUrl = `${base.replace(/\/$/, "")}/searches/${encodeURIComponent(args.search_id)}/clicks/${encodeURIComponent(args.click_id)}?marker=${encodeURIComponent(args.marker)}`;

  const resp = await fetch(clickUrl, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${args.token}`,
    },
  });

  const text = await resp.text();
  if (!resp.ok) {
    console.error("[flight-search] resolve_deal failed", resp.status, text.slice(0, 250));
    return {
      ok: false,
      error: `upstream failed (${resp.status})`,
      upstream: text.slice(0, 200),
    };
  }

  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    console.error("[flight-search] resolve_deal invalid JSON", text.slice(0, 250));
    return {
      ok: false,
      error: "invalid JSON from upstream",
      upstream: text.slice(0, 200),
    };
  }

  const bookingUrl = data?.url ?? data?.booking_url ?? data?.redirect_url ?? null;
  if (!isHttpUrl(bookingUrl)) {
    return {
      ok: false,
      error: "no booking url from upstream",
      upstream: text.slice(0, 200),
    };
  }

  // Never return the click endpoint itself.
  const lower = bookingUrl.toLowerCase();
  if (lower.includes("travelpayouts.com/searches/") && lower.includes("/clicks/")) {
    return {
      ok: false,
      error: "resolve_deal returned a click endpoint (blocked)",
      upstream: bookingUrl.slice(0, 200),
    };
  }

  return { ok: true, booking_url: bookingUrl };
}

function toYyyyMmDdHhMm(isoOrTs: unknown): string {
  try {
    const d = typeof isoOrTs === "string"
      ? new Date(isoOrTs)
      : typeof isoOrTs === "number"
        ? new Date(isoOrTs * 1000)
        : null;
    if (!d || Number.isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 16).replace("T", " ");
  } catch {
    return "";
  }
}

function pick(obj: any, keys: string[]): any {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null) return v;
  }
  return undefined;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const token = Deno.env.get("TRAVELPAYOUTS_API_TOKEN") || "";
  const marker = Deno.env.get("TRAVELPAYOUTS_MARKER") || "694224";

  if (!token) {
    console.error("[flight-search] Missing TRAVELPAYOUTS_API_TOKEN");
    return json({ ok: false, error: "Missing API credentials" }, 500);
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const action = safeStr(body?.action, 50);

  // ============ ACTION: click ============
  // Resolves a deal using search_id + proposal_id + results_base
  if (action === "click") {
    const search_id = safeStr(body?.search_id ?? body?.searchId, 200);
    const proposal_id = safeStr(body?.proposal_id ?? body?.proposalId ?? body?.click_id ?? body?.clickId, 200);
    const rb = safeStr(body?.results_base ?? body?.resultsBase, 500) || null;

    if (!search_id || !proposal_id) {
      return json({ ok: false, error: "missing search_id or proposal_id" }, 400);
    }

    console.log("[flight-search] click action - search_id:", search_id, "proposal_id:", proposal_id);

    try {
      const result = await withTimeout(
        resolveDealUrl({
          token,
          marker,
          search_id,
          click_id: proposal_id,
          results_base: rb,
        }),
        8000,
        "click_resolve"
      );

      if (!result.ok) {
        console.error("[flight-search] click resolve failed:", result.error);
        return json({
          ok: false,
          error: result.error,
          upstream: result.upstream,
        }, 502);
      }

      console.log("[flight-search] click resolved to:", result.booking_url.slice(0, 100));
      return json({ ok: true, deal_url: result.booking_url });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[flight-search] click error:", msg);
      return json({ ok: false, error: msg }, 502);
    }
  }

  // ============ ACTION: resolve_deal ============
  if (action === "resolve_deal") {
    const search_id = safeStr(body?.search_id ?? body?.searchId ?? body?.searchid, 200);
    const click_id = safeStr(body?.click_id ?? body?.clickId ?? body?.str_click_id, 200);
    const results_base = safeStr(body?.results_base, 500) || null;

    if (!search_id || !click_id) {
      return json(
        {
          ok: false,
          error: "missing search_id or click_id",
          received: body,
        },
        400
      );
    }

    try {
      const result = await withTimeout(
        resolveDealUrl({ token, marker, search_id, click_id, results_base }),
        8000,
        "resolve_deal"
      );

      if (!result.ok) {
        return json(
          {
            ok: false,
            error: result.error,
            upstream: result.upstream,
          },
          502
        );
      }

      return json({ ok: true, booking_url: result.booking_url });
    } catch (e) {
      console.error("[flight-search] resolve_deal error", e);
      return json({ ok: false, error: "resolve_deal exception" }, 502);
    }
  }

  // ============ ACTION: search ============
  if (action === "search") {
    const origin = safeStr(body?.origin, 10).toUpperCase();
    const destination = safeStr(body?.destination, 10).toUpperCase();
    const depart_date = safeStr(body?.depart_date, 20);
    const return_date = safeStr(body?.return_date, 20) || undefined;
    const adults = Number(body?.adults ?? 1);
    const currency_code = safeStr(body?.currency ?? body?.currency_code ?? "EUR", 10).toUpperCase();
    const locale = safeStr(body?.locale ?? "en", 10).toLowerCase();
    const limit = Math.max(1, Math.min(25, Number(body?.limit ?? 25)));
    const sort = (safeStr(body?.sort, 20) as "best" | "cheapest" | "fastest") || "best";

    if (!origin || !destination || !depart_date) {
      return json({ ok: false, error: "origin, destination, and depart_date are required" }, 400);
    }

    // Build segments
    const segments: Array<{ origin: string; destination: string; date: string }> = [
      { origin, destination, date: depart_date },
    ];
    if (return_date) {
      segments.push({ origin: destination, destination: origin, date: return_date });
    }

    const startPayload = {
      marker,
      locale,
      currency_code,
      market_code: "US",
      host: "goflyfinder.com",
      user_ip:
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        req.headers.get("cf-connecting-ip") ||
        req.headers.get("x-real-ip") ||
        "127.0.0.1",
      trip_class: "Y",
      passengers: { adults: Math.max(1, adults), children: 0, infants: 0 },
      segments,
    };

    const START_URL = "https://tickets-api.travelpayouts.com/search/affiliate/start";
    const startResp = await fetch(START_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(startPayload),
    });

    const startText = await startResp.text();
    if (!startResp.ok) {
      console.error("[flight-search] start failed", startResp.status, startText.slice(0, 250));
      return json({ ok: false, error: "Failed to start search" }, 502);
    }

    let startData: any;
    try {
      startData = JSON.parse(startText);
    } catch {
      return json({ ok: false, error: "Invalid start response" }, 502);
    }

    const search_id = safeStr(startData?.search_id ?? startData?.searchId ?? startData?.uuid, 200);
    const results_base = buildResultsBase(startData?.results_url ?? startData?.resultsUrl ?? null);
    if (!search_id) {
      return json({ ok: false, error: "Missing search_id" }, 502);
    }

    // Poll up to ~12s total
    const RESULTS_URL = `${results_base.replace(/\/$/, "")}/search/affiliate/results?search_id=${encodeURIComponent(search_id)}`;
    let resultsData: any = null;
    let completed = false;
    for (let i = 0; i < 8; i++) {
      const pollResp = await fetch(RESULTS_URL, {
        method: "GET",
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      });
      const pollText = await pollResp.text();
      if (!pollResp.ok) {
        console.error("[flight-search] poll failed", pollResp.status, pollText.slice(0, 200));
        return json({ ok: false, error: "Failed to fetch results" }, 502);
      }
      try {
        resultsData = JSON.parse(pollText);
      } catch {
        return json({ ok: false, error: "Invalid poll response" }, 502);
      }

      completed = Boolean(
        resultsData?.completed === true ||
          resultsData?.is_over === true ||
          resultsData?.isOver === true ||
          resultsData?.is_complete === true
      );
      if (completed) break;
      // short sleep (Deno)
      await new Promise((r) => setTimeout(r, 1500));
    }

    // Normalize
    const tickets: any[] = resultsData?.tickets || resultsData?.data?.tickets || [];
    const proposalsArr: any[] = resultsData?.proposals || resultsData?.data?.proposals || [];
    const flightLegs: any[] = resultsData?.flight_legs || resultsData?.data?.flight_legs || [];

    const proposalsById = new Map<string, any>();
    for (const p of proposalsArr) {
      if (p?.id != null) proposalsById.set(String(p.id), p);
    }
    const legsById = new Map<string, any>();
    for (const l of flightLegs) {
      if (l?.id != null) legsById.set(String(l.id), l);
    }

    const rawFlights = tickets
      .map((ticket: any, idx: number) => {
        const ticketProposalsRaw =
          ticket?.proposals || ticket?.proposal_ids || ticket?.proposalIds || [];

        let proposals: any[] = [];
        if (Array.isArray(ticketProposalsRaw)) {
          proposals = ticketProposalsRaw
            .map((x: any) => (typeof x === "object" ? x : proposalsById.get(String(x))))
            .filter(Boolean);
        } else if (typeof ticketProposalsRaw === "object") {
          proposals = [ticketProposalsRaw];
        } else if (ticketProposalsRaw != null) {
          const p = proposalsById.get(String(ticketProposalsRaw));
          if (p) proposals = [p];
        }

        const cheapest = proposals.reduce((best: any, p: any) => {
          const price = Number(p?.price ?? p?.price_per_person ?? p?.amount ?? 0);
          if (!best) return { p, price };
          return price > 0 && price < best.price ? { p, price } : best;
        }, null);

        const proposal = cheapest?.p || null;
        const priceAmount = Number(cheapest?.price || 0);
        const proposalId = proposal?.id != null ? String(proposal.id) : "";

        const segs = ticket?.segments || ticket?.segment || ticket?.flight_legs || ticket?.legs || [];
        let legs: any[] = [];
        if (Array.isArray(segs)) {
          legs = segs.map((x: any) => (typeof x === "object" ? x : legsById.get(String(x)))).filter(Boolean);
        }

        const firstLeg = legs[0] || {};
        const lastLeg = legs[legs.length - 1] || firstLeg;

        const depCode = safeStr(pick(firstLeg, ["origin", "departure"]) || "", 10).toUpperCase();
        const arrCode = safeStr(pick(lastLeg, ["destination", "arrival"]) || "", 10).toUpperCase();

        const depAt = pick(firstLeg, ["departure_at", "departureAt", "departure_time"]);
        const arrAt = pick(lastLeg, ["arrival_at", "arrivalAt", "arrival_time"]);
        const depTs = pick(firstLeg, ["departure_timestamp", "departureTimestamp"]);
        const arrTs = pick(lastLeg, ["arrival_timestamp", "arrivalTimestamp"]);

        const departureTime = toYyyyMmDdHhMm(depAt ?? depTs);
        const arrivalTime = toYyyyMmDdHhMm(arrAt ?? arrTs);

        const durationMinutes =
          Number(pick(proposal, ["duration"]) ?? pick(ticket, ["duration"]) ?? pick(firstLeg, ["duration"]) ?? 0) ||
          0;

        const stopsAirports = legs
          .slice(0, Math.max(0, legs.length - 1))
          .map((l: any) => safeStr(pick(l, ["destination", "arrival"]) || "", 10).toUpperCase())
          .filter(Boolean);

        const airlines = legs
          .map((l: any) => safeStr(pick(l, ["carrier", "marketing_carrier"]) || "", 10).toUpperCase())
          .filter(Boolean);

        const flightNumbers = legs
          .map((l: any) => safeStr(pick(l, ["flight_number", "number"]) || "", 20).toUpperCase())
          .filter(Boolean);

        return {
          id: `${search_id}-${proposalId || idx}`,
          origin: depCode,
          destination: arrCode,
          departureTime,
          arrivalTime,
          durationMinutes,
          stopsCount: Math.max(0, legs.length - 1),
          stopsAirports,
          airlines,
          flightNumbers,
          price: { amount: priceAmount, currency: currency_code },
          // identifiers
          search_id,
          click_id: proposalId,
          results_base,
          // include segments for completeness
          segments: legs,
          // booking_url resolved below
          booking_url: "",
        };
      })
      .filter((f: any) => f && f.click_id);

    // Sort before limit so we resolve only what we return
    const sorted = [...rawFlights];
    if (sort === "cheapest") {
      sorted.sort((a: any, b: any) => (a.price?.amount ?? 0) - (b.price?.amount ?? 0));
    } else if (sort === "fastest") {
      sorted.sort((a: any, b: any) => (a.durationMinutes ?? 0) - (b.durationMinutes ?? 0));
    } else {
      // best (lightweight heuristic)
      sorted.sort((a: any, b: any) => {
        const sa = (a.price?.amount ?? 0) + (a.stopsCount ?? 0) * 80 + (a.durationMinutes ?? 0) * 0.5;
        const sb = (b.price?.amount ?? 0) + (b.stopsCount ?? 0) * 80 + (b.durationMinutes ?? 0) * 0.5;
        return sa - sb;
      });
    }

    const flights = sorted.slice(0, limit);

    // Resolve booking URLs with small concurrency
    const concurrency = 5;
    let cursor = 0;

    async function worker() {
      while (cursor < flights.length) {
        const i = cursor++;
        const f = flights[i];
        try {
          const result = await withTimeout(
            resolveDealUrl({
              token,
              marker,
              search_id: f.search_id,
              click_id: f.click_id,
              results_base,
            }),
            8000,
            `resolve_${i}`
          );

          if (result.ok) {
            f.booking_url = result.booking_url;
          } else {
            console.warn("[flight-search] booking_url resolve failed", i, result.error);
            f.booking_url = "";
          }
        } catch (e: unknown) {
          // Leave empty; frontend will show "No deal available" or resolve on-demand.
          const msg = e instanceof Error ? e.message : String(e);
          console.warn("[flight-search] booking_url resolve failed", i, msg);
          f.booking_url = "";
        }
      }
    }

    await Promise.all(Array.from({ length: Math.min(concurrency, flights.length) }, () => worker()));

    return json({
      ok: true,
      step: "search",
      search_id,
      results_base,
      flights,
    });
  }

  return json({ ok: false, error: 'Invalid action. Use "search" or "resolve_deal".' }, 400);
});
