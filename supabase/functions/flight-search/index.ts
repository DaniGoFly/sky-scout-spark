import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

/* ── MD5 implementation for signature computation ── */
function md5(input: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  function toWord(b: Uint8Array, i: number) { return b[i] | (b[i+1] << 8) | (b[i+2] << 16) | (b[i+3] << 24); }
  const K = new Uint32Array([
    0xd76aa478,0xe8c7b756,0x242070db,0xc1bdceee,0xf57c0faf,0x4787c62a,0xa8304613,0xfd469501,
    0x698098d8,0x8b44f7af,0xffff5bb1,0x895cd7be,0x6b901122,0xfd987193,0xa679438e,0x49b40821,
    0xf61e2562,0xc040b340,0x265e5a51,0xe9b6c7aa,0xd62f105d,0x02441453,0xd8a1e681,0xe7d3fbc8,
    0x21e1cde6,0xc33707d6,0xf4d50d87,0x455a14ed,0xa9e3e905,0xfcefa3f8,0x676f02d9,0x8d2a4c8a,
    0xfffa3942,0x8771f681,0x6d9d6122,0xfde5380c,0xa4beea44,0x4bdecfa9,0xf6bb4b60,0xbebfbc70,
    0x289b7ec6,0xeaa127fa,0xd4ef3085,0x04881d05,0xd9d4d039,0xe6db99e5,0x1fa27cf8,0xc4ac5665,
    0xf4292244,0x432aff97,0xab9423a7,0xfc93a039,0x655b59c3,0x8f0ccc92,0xffeff47d,0x85845dd1,
    0x6fa87e4f,0xfe2ce6e0,0xa3014314,0x4e0811a1,0xf7537e82,0xbd3af235,0x2ad7d2bb,0xeb86d391,
  ]);
  const S = [7,12,17,22,7,12,17,22,7,12,17,22,7,12,17,22,5,9,14,20,5,9,14,20,5,9,14,20,5,9,14,20,4,11,16,23,4,11,16,23,4,11,16,23,4,11,16,23,6,10,15,21,6,10,15,21,6,10,15,21,6,10,15,21];
  const bitLen = data.length * 8;
  const padLen = ((56 - (data.length + 1) % 64) + 64) % 64;
  const padded = new Uint8Array(data.length + 1 + padLen + 8);
  padded.set(data); padded[data.length] = 0x80;
  const dv = new DataView(padded.buffer);
  dv.setUint32(padded.length - 8, bitLen >>> 0, true);
  let a0 = 0x67452301>>>0, b0 = 0xefcdab89>>>0, c0 = 0x98badcfe>>>0, d0 = 0x10325476>>>0;
  for (let offset = 0; offset < padded.length; offset += 64) {
    const M = new Uint32Array(16);
    for (let j = 0; j < 16; j++) M[j] = toWord(padded, offset + j * 4);
    let A = a0, B = b0, C = c0, D = d0;
    for (let i = 0; i < 64; i++) {
      let F: number, g: number;
      if (i < 16) { F = (B & C) | (~B & D); g = i; }
      else if (i < 32) { F = (D & B) | (~D & C); g = (5*i+1) % 16; }
      else if (i < 48) { F = B ^ C ^ D; g = (3*i+5) % 16; }
      else { F = C ^ (B | ~D); g = (7*i) % 16; }
      F = (F + A + K[i] + M[g]) >>> 0;
      A = D; D = C; C = B;
      B = (B + ((F << S[i]) | (F >>> (32 - S[i])))) >>> 0;
    }
    a0 = (a0+A)>>>0; b0 = (b0+B)>>>0; c0 = (c0+C)>>>0; d0 = (d0+D)>>>0;
  }
  function toLEHex(n: number) { return [(n&0xff),(n>>8&0xff),(n>>16&0xff),(n>>24&0xff)].map(b=>b.toString(16).padStart(2,"0")).join(""); }
  return toLEHex(a0) + toLEHex(b0) + toLEHex(c0) + toLEHex(d0);
}

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

function safeStr(x: unknown, max = 500): string {
  const s = typeof x === "string" ? x : "";
  return s.length > max ? s.slice(0, max) : s;
}

function pick(obj: any, keys: string[]): any {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null) return v;
  }
  return undefined;
}

function toYyyyMmDdHhMm(isoOrTs: unknown): string {
  try {
    const d =
      typeof isoOrTs === "string"
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

function buildResultsBase(resultsUrl: unknown): string {
  const raw = safeStr(resultsUrl, 500);
  if (!raw) return "https://tickets-api.travelpayouts.com";
  try {
    if (raw.startsWith("http")) return new URL(raw).origin;
    return `https://${raw.replace(/^https?:\/\//, "")}`;
  } catch {
    return "https://tickets-api.travelpayouts.com";
  }
}

/* ── Signature per Travelpayouts docs ── */
/* Collect all primitive values from nested object, sort alphabetically with token+marker, join with ":", MD5 */

function collectValues(obj: any): string[] {
  const vals: string[] = [];
  if (obj === null || obj === undefined) return vals;
  if (typeof obj !== "object") {
    vals.push(String(obj));
    return vals;
  }
  if (Array.isArray(obj)) {
    for (const item of obj) vals.push(...collectValues(item));
    return vals;
  }
  for (const key of Object.keys(obj).sort()) {
    vals.push(...collectValues(obj[key]));
  }
  return vals;
}

function computeSignature(token: string, marker: string, params: any): string {
  const allVals = [token, marker, ...collectValues(params)];
  allVals.sort();
  const str = allVals.join(":");
  return md5(str);
}

function getUserIp(req: Request, body: any): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    safeStr(body?.user_ip, 50) ||
    "127.0.0.1"
  );
}

/** Map frontend cabin class names to Travelpayouts trip_class codes */
function mapTripClass(cls: string): string {
  const map: Record<string, string> = {
    economy: "Y", premium_economy: "W", business: "C", first: "F",
    y: "Y", w: "W", c: "C", f: "F",
  };
  return map[cls.toLowerCase()] || "Y";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const token = Deno.env.get("TRAVELPAYOUTS_API_TOKEN") || "";
  const marker = Deno.env.get("TRAVELPAYOUTS_MARKER") || "694224";
  const tpHost = Deno.env.get("TP_HOST") || "goflyfinder.com";

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
  const userIp = getUserIp(req, body);

  // ============ ACTION: click ============
  if (action === "click" || action === "resolve_deal") {
    const search_id = safeStr(body?.search_id ?? body?.searchId, 200);
    const proposal_id = safeStr(body?.proposal_id ?? body?.proposalId ?? body?.click_id ?? body?.clickId, 200);
    const rb = safeStr(body?.results_base ?? body?.resultsBase, 500) || null;

    if (!search_id || !proposal_id) {
      return json({ ok: false, error: "missing search_id or proposal_id" }, 400);
    }

    const base = rb && rb.startsWith("http") ? rb.replace(/\/$/, "") : "https://tickets-api.travelpayouts.com";
    const clickUrl = `${base}/searches/${encodeURIComponent(search_id)}/clicks/${encodeURIComponent(proposal_id)}?marker=${encodeURIComponent(marker)}`;

    console.log("[flight-search] click URL:", clickUrl.slice(0, 120));

    try {
      const resp = await fetch(clickUrl, {
        method: "GET",
        headers: { Accept: "application/json", "x-affiliate-user-id": token },
      });
      const text = await resp.text();
      if (!resp.ok) {
        console.error("[flight-search] click failed", resp.status, text.slice(0, 300));
        return json({ ok: false, error: `click failed (${resp.status})` }, 502);
      }

      let data: any;
      try { data = JSON.parse(text); } catch {
        return json({ ok: false, error: "invalid click response" }, 502);
      }

      const bookingUrl = data?.url ?? data?.booking_url ?? data?.redirect_url ?? null;
      if (!bookingUrl || typeof bookingUrl !== "string" || !bookingUrl.startsWith("http")) {
        return json({ ok: false, error: "no booking url returned" }, 502);
      }

      console.log("[flight-search] click resolved:", bookingUrl.slice(0, 100));
      return json({ ok: true, deal_url: bookingUrl, booking_url: bookingUrl });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[flight-search] click error:", msg);
      return json({ ok: false, error: msg }, 502);
    }
  }

  // ============ ACTION: search ============
  if (action === "search") {
    const originRaw = safeStr(body?.origin, 50).toUpperCase();
    const destRaw = safeStr(body?.destination, 50).toUpperCase();
    // If comma-separated (nearby airports), pick first valid IATA
    const origin = originRaw.split(",")[0]?.trim().slice(0, 3) || "";
    const destination = destRaw.split(",")[0]?.trim().slice(0, 3) || "";
    const depart_date = safeStr(body?.depart_date, 20);
    const return_date = safeStr(body?.return_date, 20) || undefined;
    const adults = Math.max(1, Math.min(9, Number(body?.adults ?? 1)));
    const children = Math.max(0, Math.min(6, Number(body?.children ?? 0)));
    const infants = Math.max(0, Math.min(6, Number(body?.infants ?? 0)));
    const currency_code = safeStr(body?.currency ?? body?.currency_code ?? "EUR", 10).toUpperCase();
    const locale = safeStr(body?.locale ?? "en", 10).toLowerCase();
    const limit = Math.max(1, Math.min(50, Number(body?.limit ?? 25)));
    const sort = (safeStr(body?.sort, 20) as "best" | "cheapest" | "fastest") || "best";
    const trip_class = mapTripClass(safeStr(body?.trip_class ?? body?.cabin_class ?? "economy", 20));

    if (!origin || !destination || !depart_date) {
      return json({ ok: false, error: "origin, destination, and depart_date are required" }, 400);
    }

    // Build segments — NEVER empty
    const segments: Array<{ origin: string; destination: string; date: string }> = [
      { origin, destination, date: depart_date },
    ];
    if (return_date) {
      segments.push({ origin: destination, destination: origin, date: return_date });
    }

    // ── Try NEW API format first, fallback to OLD API ──

    // NEW format payload (Nov 2025+)
    const search_params = {
      trip_class,
      passengers: { adults, children, infants },
      directions: segments,
    };
    const market_code = locale.length >= 2 ? locale.slice(0, 2).toUpperCase() : "US";

    // Hybrid payload: old-style body fields (host, user_ip for auth) + new search_params structure
    const hybridPayload: any = {
      marker,
      host: tpHost,
      user_ip: userIp,
      locale,
      currency_code,
      market_code,
      search_params,
    };
    const hybridSignature = computeSignature(token, marker, hybridPayload);
    hybridPayload.signature = hybridSignature;

    // Also prepare new-only payload (no host/user_ip in body)
    const newPayloadForSig = { marker, locale, currency_code, market_code, search_params };
    const newSignature = computeSignature(token, marker, newPayloadForSig);
    const newPayload = { signature: newSignature, ...newPayloadForSig };

    console.log(
      `[flight-search] START segments=${segments.length} ` +
        `${origin}→${destination} ${depart_date}${return_date ? " RT " + return_date : ""} ` +
        `class=${trip_class} pax=${adults}a/${children}c/${infants}i cur=${currency_code}`
    );
    console.log("[flight-search] hybridPayload:", JSON.stringify(hybridPayload).slice(0, 600));

    const START_URL = "https://tickets-api.travelpayouts.com/search/affiliate/start";

    const xHeaders = {
      "Content-Type": "application/json",
      Accept: "application/json",
      "x-real-host": tpHost,
      "x-user-ip": userIp,
      "x-affiliate-user-id": token,
      "x-signature": hybridSignature,
    };

    let startResp: Response;
    let usedFormat = "hybrid-bare";
    try {
      // Try 1: Hybrid payload (old auth + new search_params) + bare headers
      startResp = await fetch(START_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(hybridPayload),
      });
      console.log("[flight-search] Try 1 (hybrid+bare) status:", startResp.status);

      // Try 2: New payload + x-headers (official new API)
      if (startResp.status === 403 || startResp.status === 401) {
        usedFormat = "new-xheaders";
        startResp = await fetch(START_URL, {
          method: "POST",
          headers: xHeaders,
          body: JSON.stringify(newPayload),
        });
        console.log("[flight-search] Try 2 (new+xheaders) status:", startResp.status);
      }

      // Try 3: Hybrid payload + x-headers 
      if (startResp.status === 403 || startResp.status === 401) {
        usedFormat = "hybrid-xheaders";
        startResp = await fetch(START_URL, {
          method: "POST",
          headers: xHeaders,
          body: JSON.stringify(hybridPayload),
        });
        console.log("[flight-search] Try 3 (hybrid+xheaders) status:", startResp.status);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[flight-search] start fetch error:", msg);
      return json({ ok: false, error: `Network error: ${msg}` }, 502);
    }

    const startText = await startResp.text();
    console.log("[flight-search] start response status:", startResp.status, "body:", startText.slice(0, 500));

    if (!startResp.ok) {
      return json({ ok: false, error: `Start failed (${startResp.status}): ${startText.slice(0, 200)}` }, 502);
    }

    let startData: any;
    try {
      startData = JSON.parse(startText);
    } catch {
      return json({ ok: false, error: "Invalid start response JSON" }, 502);
    }

    const search_id = safeStr(startData?.search_id ?? startData?.searchId ?? startData?.uuid, 200);
    const results_base = buildResultsBase(startData?.results_url ?? startData?.resultsUrl ?? null);
    if (!search_id) {
      return json({ ok: false, error: "Missing search_id from API", raw: startText.slice(0, 300) }, 502);
    }

    console.log("[flight-search] search_id:", search_id, "results_base:", results_base);

    // ── Poll for results ──
    const RESULTS_URL = `${results_base.replace(/\/$/, "")}/search/affiliate/results?search_id=${encodeURIComponent(search_id)}`;
    let resultsData: any = null;
    let completed = false;

    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, i === 0 ? 800 : 1500));

      const pollHeaders = {
        Accept: "application/json",
        "x-affiliate-user-id": token,
      };

      const pollResp = await fetch(RESULTS_URL, {
        method: "GET",
        headers: pollHeaders,
      });
      const pollText = await pollResp.text();
      if (!pollResp.ok) {
        console.error("[flight-search] poll failed", pollResp.status, pollText.slice(0, 200));
        // Don't fail immediately — might be temporary
        continue;
      }
      try {
        resultsData = JSON.parse(pollText);
      } catch {
        console.error("[flight-search] poll parse error:", pollText.slice(0, 200));
        continue;
      }

      completed = Boolean(
        resultsData?.search_completed === true ||
          resultsData?.completed === true ||
          resultsData?.is_over === true
      );

      const ticketCount = (resultsData?.proposals || resultsData?.tickets || []).length;
      console.log(`[flight-search] poll ${i + 1}: completed=${completed} proposals=${ticketCount}`);

      if (completed && ticketCount > 0) break;
      if (completed) break; // completed but 0 results
    }

    if (!resultsData) {
      return json({ ok: false, error: "Polling timed out with no data" }, 502);
    }

    // ── Normalize results ──
    // The new API returns proposals (each with terms containing price) and segments/flights
    const proposals: any[] = resultsData?.proposals || [];
    const resultSegments: Record<string, any> = resultsData?.segments || {};
    const airlines: Record<string, any> = resultsData?.airlines || {};
    const airports: Record<string, any> = resultsData?.airports || {};
    const flightLegsMap: Record<string, any> = resultsData?.flight_legs || resultsData?.flights || {};
    // Legacy format
    const tickets: any[] = resultsData?.tickets || [];

    let rawFlights: any[] = [];

    if (proposals.length > 0) {
      // ── New API format: proposals with terms ──
      rawFlights = proposals.map((proposal: any, idx: number) => {
        // Each proposal has terms (agent → price info) and segment_ids
        const terms = proposal?.terms || {};
        const termEntries = Object.entries(terms);

        // Find cheapest term
        let cheapestPrice = Infinity;
        let cheapestTerm: any = null;
        for (const [_agentId, termData] of termEntries) {
          const td = termData as any;
          const price = Number(td?.unified_price ?? td?.price ?? td?.amount ?? 0);
          if (price > 0 && price < cheapestPrice) {
            cheapestPrice = price;
            cheapestTerm = td;
          }
        }

        if (!cheapestTerm || cheapestPrice === Infinity) return null;

        // Get segment IDs for this proposal
        const segmentIds: string[] = proposal?.segment_ids || proposal?.segments || [];
        const allLegs: any[] = [];

        for (const segId of segmentIds) {
          const seg = resultSegments[String(segId)];
          if (seg) {
            // Each segment has flight_ids or flights
            const flightIds = seg?.flight_ids || seg?.flights || [];
            for (const fId of flightIds) {
              const leg = typeof fId === "object" ? fId : (flightLegsMap[String(fId)] || null);
              if (leg) allLegs.push(leg);
            }
            // If segment itself has origin/destination, treat as a single leg
            if (flightIds.length === 0 && seg.origin) {
              allLegs.push(seg);
            }
          }
        }

        const firstLeg = allLegs[0] || {};
        const lastLeg = allLegs[allLegs.length - 1] || firstLeg;

        const depCode = safeStr(pick(firstLeg, ["origin", "departure", "origin_airport"]) || "", 10).toUpperCase();
        const arrCode = safeStr(pick(lastLeg, ["destination", "arrival", "destination_airport"]) || "", 10).toUpperCase();

        const depAt = pick(firstLeg, ["departure_at", "departureAt", "departure_time", "local_departure", "departure"]);
        const arrAt = pick(lastLeg, ["arrival_at", "arrivalAt", "arrival_time", "local_arrival", "arrival"]);
        const depTs = pick(firstLeg, ["departure_timestamp", "departureTimestamp", "departure_unix"]);
        const arrTs = pick(lastLeg, ["arrival_timestamp", "arrivalTimestamp", "arrival_unix"]);

        const departureTime = toYyyyMmDdHhMm(depAt ?? depTs);
        const arrivalTime = toYyyyMmDdHhMm(arrAt ?? arrTs);

        // Duration
        let durationMinutes = 0;
        const totalDuration = pick(proposal, ["total_duration", "duration"]) ||
          pick(cheapestTerm, ["duration"]);
        if (totalDuration) {
          durationMinutes = Number(totalDuration) || 0;
        }
        if (!durationMinutes && departureTime && arrivalTime) {
          try {
            const d1 = new Date(departureTime.replace(" ", "T")).getTime();
            const d2 = new Date(arrivalTime.replace(" ", "T")).getTime();
            if (!isNaN(d1) && !isNaN(d2) && d2 > d1) {
              durationMinutes = Math.round((d2 - d1) / 60000);
            }
          } catch { /* ignore */ }
        }

        const stopsAirports = allLegs
          .slice(0, Math.max(0, allLegs.length - 1))
          .map((l: any) => safeStr(pick(l, ["destination", "arrival", "destination_airport"]) || "", 10).toUpperCase())
          .filter(Boolean);

        const flightAirlines = allLegs
          .map((l: any) => {
            const code = safeStr(
              pick(l, ["marketing_carrier", "carrier", "operating_carrier", "airline"]) || "",
              10
            ).toUpperCase();
            return code;
          })
          .filter(Boolean);

        // Dedupe airlines
        const uniqueAirlines = [...new Set(flightAirlines)];

        const flightNumbers = allLegs
          .map((l: any) => {
            const carrier = safeStr(pick(l, ["marketing_carrier", "carrier"]) || "", 5).toUpperCase();
            const num = safeStr(pick(l, ["flight_number", "number"]) || "", 20);
            return carrier && num ? `${carrier}${num}` : num;
          })
          .filter(Boolean);

        const proposalId = String(proposal?.id ?? proposal?.sign ?? idx);

        return {
          id: `${search_id}-${proposalId}`,
          origin: depCode || origin,
          destination: arrCode || destination,
          departureTime,
          arrivalTime,
          durationMinutes,
          stopsCount: Math.max(0, allLegs.length - 1),
          stopsAirports,
          airlines: uniqueAirlines.length > 0 ? uniqueAirlines : ["XX"],
          flightNumbers,
          price: { amount: cheapestPrice, currency: currency_code },
          search_id,
          click_id: proposalId,
          results_base,
          segments: allLegs,
          booking_url: "",
        };
      }).filter(Boolean);
    } else if (tickets.length > 0) {
      // ── Legacy format: tickets with proposals ──
      const proposalsArr: any[] = resultsData?.data?.proposals || [];
      const legsList: any[] = resultsData?.flight_legs || resultsData?.data?.flight_legs || [];

      const proposalsById = new Map<string, any>();
      for (const p of proposalsArr) {
        if (p?.id != null) proposalsById.set(String(p.id), p);
      }
      const legsById = new Map<string, any>();
      for (const l of legsList) {
        if (l?.id != null) legsById.set(String(l.id), l);
      }

      rawFlights = tickets.map((ticket: any, idx: number) => {
        const ticketProposalsRaw = ticket?.proposals || ticket?.proposal_ids || [];
        let tProposals: any[] = [];
        if (Array.isArray(ticketProposalsRaw)) {
          tProposals = ticketProposalsRaw
            .map((x: any) => (typeof x === "object" ? x : proposalsById.get(String(x))))
            .filter(Boolean);
        }

        const cheapest = tProposals.reduce((best: any, p: any) => {
          const price = Number(p?.price ?? p?.price_per_person ?? p?.amount ?? 0);
          if (!best) return { p, price };
          return price > 0 && price < best.price ? { p, price } : best;
        }, null);

        const tProposal = cheapest?.p || null;
        const priceAmount = Number(cheapest?.price || 0);
        const proposalId = tProposal?.id != null ? String(tProposal.id) : "";

        const segs = ticket?.segments || ticket?.segment || ticket?.flight_legs || ticket?.legs || [];
        let legs: any[] = [];
        if (Array.isArray(segs)) {
          legs = segs.map((x: any) => (typeof x === "object" ? x : legsById.get(String(x)))).filter(Boolean);
        }

        const firstLeg = legs[0] || {};
        const lastLeg = legs[legs.length - 1] || firstLeg;

        const depCode = safeStr(pick(firstLeg, ["origin", "departure"]) || "", 10).toUpperCase();
        const arrCode = safeStr(pick(lastLeg, ["destination", "arrival"]) || "", 10).toUpperCase();
        const depAt = pick(firstLeg, ["departure_at", "departureAt", "departure_time", "local_departure"]);
        const arrAt = pick(lastLeg, ["arrival_at", "arrivalAt", "arrival_time", "local_arrival"]);
        const depTs = pick(firstLeg, ["departure_timestamp", "departureTimestamp"]);
        const arrTs = pick(lastLeg, ["arrival_timestamp", "arrivalTimestamp"]);

        return {
          id: `${search_id}-${proposalId || idx}`,
          origin: depCode || origin,
          destination: arrCode || destination,
          departureTime: toYyyyMmDdHhMm(depAt ?? depTs),
          arrivalTime: toYyyyMmDdHhMm(arrAt ?? arrTs),
          durationMinutes: Number(pick(tProposal, ["duration"]) ?? pick(ticket, ["duration"]) ?? 0) || 0,
          stopsCount: Math.max(0, legs.length - 1),
          stopsAirports: legs.slice(0, Math.max(0, legs.length - 1))
            .map((l: any) => safeStr(pick(l, ["destination", "arrival"]) || "", 10).toUpperCase())
            .filter(Boolean),
          airlines: legs
            .map((l: any) => safeStr(pick(l, ["carrier", "marketing_carrier"]) || "", 10).toUpperCase())
            .filter(Boolean),
          flightNumbers: legs
            .map((l: any) => safeStr(pick(l, ["flight_number", "number"]) || "", 20).toUpperCase())
            .filter(Boolean),
          price: { amount: priceAmount, currency: currency_code },
          search_id,
          click_id: proposalId,
          results_base,
          segments: legs,
          booking_url: "",
        };
      }).filter((f: any) => f && f.click_id);
    }

    // Dedupe by click_id
    const seen = new Set<string>();
    const deduped = rawFlights.filter((f: any) => {
      if (!f.click_id || seen.has(f.click_id)) return false;
      seen.add(f.click_id);
      return true;
    });

    // Sort
    const sorted = [...deduped];
    if (sort === "cheapest") {
      sorted.sort((a: any, b: any) => (a.price?.amount ?? 0) - (b.price?.amount ?? 0));
    } else if (sort === "fastest") {
      sorted.sort((a: any, b: any) => (a.durationMinutes ?? 0) - (b.durationMinutes ?? 0));
    } else {
      sorted.sort((a: any, b: any) => {
        const sa = (a.price?.amount ?? 0) * 0.6 + (a.stopsCount ?? 0) * 100 + (a.durationMinutes ?? 0) * 0.3;
        const sb = (b.price?.amount ?? 0) * 0.6 + (b.stopsCount ?? 0) * 100 + (b.durationMinutes ?? 0) * 0.3;
        return sa - sb;
      });
    }

    const flights = sorted.slice(0, limit);

    // Resolve booking URLs concurrently (best effort)
    const concurrency = 5;
    let cursor = 0;
    async function worker() {
      while (cursor < flights.length) {
        const i = cursor++;
        const f = flights[i] as any;
        try {
          const base = f.results_base && f.results_base.startsWith("http")
            ? f.results_base.replace(/\/$/, "")
            : "https://tickets-api.travelpayouts.com";
          const clickUrl = `${base}/searches/${encodeURIComponent(f.search_id)}/clicks/${encodeURIComponent(f.click_id)}?marker=${encodeURIComponent(marker)}`;
          const resp = await fetch(clickUrl, {
            method: "GET",
            headers: { Accept: "application/json", "x-affiliate-user-id": token },
          });
          const text = await resp.text();
          if (resp.ok) {
            try {
              const d = JSON.parse(text);
              const url = d?.url ?? d?.booking_url ?? d?.redirect_url ?? "";
              if (typeof url === "string" && url.startsWith("http")) {
                f.booking_url = url;
              }
            } catch { /* ignore */ }
          }
        } catch { /* ignore */ }
      }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, flights.length) }, () => worker()));

    const uniqueAirlines = [...new Set(flights.flatMap((f: any) => f.airlines || []))];
    console.log(`[flight-search] returning ${flights.length} flights, airlines: ${uniqueAirlines.join(",")}`);

    return json({
      ok: true,
      step: "search",
      search_id,
      results_base,
      flights,
    });
  }

  // ============ ACTION: price_calendar ============
  if (action === "price_calendar") {
    const origin = safeStr(body?.origin, 10).toUpperCase();
    const destination = safeStr(body?.destination, 10).toUpperCase();
    const month = safeStr(body?.month, 10);
    const currency_code = safeStr(body?.currency ?? "EUR", 10).toUpperCase();

    if (!origin || !destination || !month) {
      return json({ ok: false, error: "origin, destination, and month are required" }, 400);
    }

    try {
      const calUrl = `https://api.travelpayouts.com/v1/prices/calendar?depart_date=${encodeURIComponent(month)}&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&currency=${encodeURIComponent(currency_code)}&token=${encodeURIComponent(token)}`;
      const calResp = await fetch(calUrl, { method: "GET", headers: { Accept: "application/json" } });
      const calText = await calResp.text();

      if (!calResp.ok) {
        return json({ ok: false, error: "Failed to fetch price calendar", currency: currency_code, days: [] });
      }

      let calData: any;
      try { calData = JSON.parse(calText); } catch {
        return json({ ok: false, error: "Invalid calendar response", currency: currency_code, days: [] });
      }

      const rawDays = calData?.data || {};
      const days: Array<{ date: string; price: number | null }> = [];
      for (const [dateStr, info] of Object.entries(rawDays)) {
        const priceVal = (info as any)?.value ?? (info as any)?.price ?? null;
        days.push({ date: dateStr, price: typeof priceVal === "number" ? priceVal : null });
      }
      days.sort((a, b) => a.date.localeCompare(b.date));

      return json({ ok: true, currency: currency_code, days });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return json({ ok: false, error: msg, currency: currency_code, days: [] });
    }
  }

  // ============ ACTION: explore ============
  if (action === "explore") {
    const origin = safeStr(body?.origin, 10).toUpperCase();
    const currency_code = safeStr(body?.currency ?? "EUR", 10).toUpperCase();

    if (!origin) {
      return json({ ok: false, error: "origin is required" }, 400);
    }

    try {
      const cheapUrl = `https://api.travelpayouts.com/v1/prices/cheap?origin=${encodeURIComponent(origin)}&currency=${encodeURIComponent(currency_code)}&token=${encodeURIComponent(token)}`;
      const cheapResp = await fetch(cheapUrl, { method: "GET", headers: { Accept: "application/json" } });
      const cheapText = await cheapResp.text();

      if (!cheapResp.ok) {
        return json({ ok: false, error: "Failed to fetch explore data", currency: currency_code, results: [] });
      }

      let cheapData: any;
      try { cheapData = JSON.parse(cheapText); } catch {
        return json({ ok: false, error: "Invalid explore response", currency: currency_code, results: [] });
      }

      const rawData = cheapData?.data || {};
      const results: Array<{ destination: string; price: number; depart_date?: string; return_date?: string; airline?: string; stops?: number }> = [];

      for (const [dest, routes] of Object.entries(rawData)) {
        const routeObj: any = routes;
        const firstKey = Object.keys(routeObj)[0];
        const route = routeObj[firstKey];
        if (!route?.price) continue;
        results.push({
          destination: dest,
          price: route.price,
          depart_date: route.depart_date || route.departure_at || undefined,
          return_date: route.return_date || route.return_at || undefined,
          airline: route.airline || undefined,
          stops: typeof route.number_of_changes === "number" ? route.number_of_changes : undefined,
        });
      }
      results.sort((a, b) => a.price - b.price);

      return json({ ok: true, currency: currency_code, results: results.slice(0, 50) });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return json({ ok: false, error: msg, currency: currency_code, results: [] });
    }
  }

  return json({ ok: false, error: 'Invalid action. Use "search", "click", "price_calendar", or "explore".' }, 400);
});
