import type {
  FlightProvider,
  NormalizedFlight,
  SearchParams,
  ClickParams,
  ClickResult,
} from "../types.ts";

/**
 * Aviasales / Travelpayouts adapter.
 * Delegates to the existing `flight-search` edge function so we don't
 * duplicate the MD5 signing / polling logic — that stays the single source
 * of truth for the Travelpayouts integration.
 */

const AVIASALES_UPSTREAM_URL =
  Deno.env.get("AVIASALES_UPSTREAM_URL") ||
  "https://ycpqgsjhxzhkljlszbwc.supabase.co/functions/v1/flight-search";

const AVIASALES_UPSTREAM_KEY =
  Deno.env.get("AVIASALES_UPSTREAM_ANON_KEY") ||
  // Public anon key — safe to embed, matches src/lib/flightSearchConfig.ts
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljcHFnc2poeHpoa2xqbHN6YndjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNDI2NzAsImV4cCI6MjA4MzkxODY3MH0.Nbm12ODC2-IWgQMR2o6ekcgy3tFL5c3AGJqvdjTO4IU";

function upstreamHeaders() {
  return {
    "Content-Type": "application/json",
    apikey: AVIASALES_UPSTREAM_KEY,
    Authorization: `Bearer ${AVIASALES_UPSTREAM_KEY}`,
  };
}

export const aviasalesProvider: FlightProvider = {
  name: "aviasales",

  async searchFlights(params: SearchParams) {
    const first = params.directions[0];
    const ret = params.directions[1];
    if (!first) return { ok: false, error: "no directions" };

    const body = {
      action: "search",
      origin: first.origin,
      destination: first.destination,
      depart_date: first.date,
      return_date: ret?.date,
      adults: params.adults,
      children: params.children,
      infants: params.infants,
      trip_class: params.tripClass,
      currency_code: params.currency,
      market_code: params.market,
      locale: params.locale,
      limit: params.limit,
      sort: params.sort,
      user_ip: params.userIp,
    };

    try {
      const resp = await fetch(AVIASALES_UPSTREAM_URL, {
        method: "POST",
        headers: upstreamHeaders(),
        body: JSON.stringify(body),
      });
      const data = await resp.json();
      if (!resp.ok || !data?.ok) {
        return { ok: false, error: data?.error || `upstream ${resp.status}` };
      }
      return {
        ok: true,
        raw: data,
        context: {
          search_id: data.search_id,
          results_base: data.results_base,
        },
      };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  },

  normalizeResults(raw, context) {
    const data = raw as { flights?: any[] } | null;
    if (!data?.flights?.length) return [];
    const search_id = String(context?.search_id ?? "");
    const results_base = String(context?.results_base ?? "");

    return data.flights.map((f: any): NormalizedFlight => {
      const localId = String(f.id ?? `${f.click_id ?? "x"}`);
      const airline = String(f.airlines?.[0] ?? "XX");
      const segments = Array.isArray(f.segments) ? f.segments : [];
      const legs = segments.map((s: any, i: number) => ({
        airlineCode: String(
          s?.marketing_carrier ?? s?.carrier ?? f.airlines?.[i] ?? airline,
        ).toUpperCase(),
        flightNumber: String(s?.flight_number ?? s?.number ?? f.flightNumbers?.[i] ?? ""),
        departureAirport: String(s?.origin ?? s?.departure ?? "").toUpperCase(),
        arrivalAirport: String(s?.destination ?? s?.arrival ?? "").toUpperCase(),
        departureTime: String(s?.departure_at ?? s?.local_departure ?? ""),
        arrivalTime: String(s?.arrival_at ?? s?.local_arrival ?? ""),
        durationMinutes: Number(s?.duration ?? 0) || 0,
      }));

      return {
        id: `aviasales:${localId}`,
        provider: "aviasales",
        price: Number(f.price?.amount ?? 0),
        currency: String(f.price?.currency ?? "USD"),
        airline,
        airlineCode: airline,
        departureAirport: String(f.origin ?? ""),
        arrivalAirport: String(f.destination ?? ""),
        departureTime: String(f.departureTime ?? ""),
        arrivalTime: String(f.arrivalTime ?? ""),
        durationMinutes: Number(f.durationMinutes ?? 0),
        stopsCount: Number(f.stopsCount ?? 0),
        layovers: Array.isArray(f.stopsAirports) ? f.stopsAirports : [],
        segments: legs,
        deepLink: "",   // resolved lazily via getClickUrl
        clickUrl: "",

        // Legacy passthrough — keeps SkyscannerFlightCard / flightNormalizer working
        price_legacy: f.price,
        stopsAirports: f.stopsAirports,
        airlines: f.airlines,
        flightNumbers: f.flightNumbers,
        search_id: f.search_id ?? search_id,
        click_id: f.click_id,
        results_base: f.results_base ?? results_base,
        booking_url: f.booking_url ?? "",
        origin: f.origin,
        destination: f.destination,
      };
    });
  },

  async getClickUrl(params: ClickParams): Promise<ClickResult> {
    const search_id = String(params.extra?.search_id ?? "");
    const proposal_id = String(params.extra?.proposal_id ?? "");
    const results_base = String(params.extra?.results_base ?? "");
    if (!search_id || !proposal_id) {
      return { ok: false, error: "missing search_id or proposal_id" };
    }
    try {
      const resp = await fetch(AVIASALES_UPSTREAM_URL, {
        method: "POST",
        headers: upstreamHeaders(),
        body: JSON.stringify({
          action: "click",
          search_id,
          proposal_id,
          results_base,
        }),
      });
      const data = await resp.json();
      if (!resp.ok || !data?.ok) {
        return { ok: false, error: data?.error || `upstream ${resp.status}` };
      }
      return { ok: true, deal_url: data.deal_url };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  },
};