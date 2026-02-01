/**
 * Travelpayouts Affiliate Results Resolver
 *
 * The flight-search backend may return Travelpayouts affiliate JSON where:
 *  - tickets[].segments[].flights is an array of flight IDs/indices
 *  - the actual flight objects live in lookup collections (flights/airports/airlines)
 *
 * This module builds lookup maps and produces a FlightInfoMap compatible with
 * the existing UI normalizer (src/lib/flightNormalizer.ts).
 */

import type { FlightInfoMap, NormalizedFlight } from "@/lib/flightNormalizer";
import { formatTime } from "@/lib/flightSearchApi";

export type AirlineMeta = {
  name?: string;
  logoUrl?: string;
};

type AnyRecord = Record<string, any>;

function getByPath(obj: any, path: string): any {
  if (!obj) return undefined;
  const parts = path.split(".");
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

function firstDefined<T>(...values: T[]): T | undefined {
  for (const v of values) {
    if (v !== undefined && v !== null) return v;
  }
  return undefined;
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function parseTimestampSeconds(value: unknown): number | undefined {
  const n = toNumber(value);
  if (n !== undefined) {
    // Heuristic: if it's ms (13 digits-ish), convert to seconds.
    if (n > 1e12) return Math.floor(n / 1000);
    // If it's already seconds
    if (n > 0) return Math.floor(n);
  }

  if (typeof value === "string" && value.trim() !== "") {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return Math.floor(d.getTime() / 1000);
  }

  return undefined;
}

function normalizeIata(code: unknown): string {
  if (typeof code !== "string") return "";
  const c = code.trim().toUpperCase();
  return c.length === 3 ? c : c;
}

type AirportsIndex = {
  byId: Record<string, AnyRecord>;
  byIata: Record<string, AnyRecord>;
};

function buildAirportsIndex(raw: any): AirportsIndex {
  const byId: Record<string, AnyRecord> = {};
  const byIata: Record<string, AnyRecord> = {};

  const airports =
    firstDefined<any[]>(
      raw?.airports,
      getByPath(raw, "data.airports"),
      getByPath(raw, "result.airports")
    ) ?? [];

  if (Array.isArray(airports)) {
    for (const a of airports) {
      if (!a || typeof a !== "object") continue;
      const id = firstDefined(a.id, a.airport_id, a.value);
      const code = normalizeIata(firstDefined(a.iata, a.code, a.airport_code, a.short_code));
      if (id != null) byId[String(id)] = a;
      if (code) byIata[code] = a;
    }
  } else if (airports && typeof airports === "object") {
    // Sometimes airports are already keyed by IATA.
    for (const [k, v] of Object.entries(airports)) {
      if (!v || typeof v !== "object") continue;
      const code = normalizeIata((v as AnyRecord).iata ?? (v as AnyRecord).code ?? k);
      byIata[code || normalizeIata(k)] = v as AnyRecord;
      const id = firstDefined((v as AnyRecord).id, (v as AnyRecord).airport_id);
      if (id != null) byId[String(id)] = v as AnyRecord;
    }
  }

  return { byId, byIata };
}

type AirlinesIndex = {
  byId: Record<string, AnyRecord>;
  byCode: Record<string, AnyRecord>;
  metaByCode: Record<string, AirlineMeta>;
};

function buildAirlinesIndex(raw: any): AirlinesIndex {
  const byId: Record<string, AnyRecord> = {};
  const byCode: Record<string, AnyRecord> = {};
  const metaByCode: Record<string, AirlineMeta> = {};

  const airlines =
    firstDefined<any[]>(
      raw?.airlines,
      getByPath(raw, "data.airlines"),
      getByPath(raw, "result.airlines")
    ) ?? [];

  if (Array.isArray(airlines)) {
    for (const a of airlines) {
      if (!a || typeof a !== "object") continue;
      const id = firstDefined(a.id, a.airline_id, a.value);
      const code = normalizeIata(firstDefined(a.iata, a.code, a.airline_code));
      if (id != null) byId[String(id)] = a;
      if (code) {
        byCode[code] = a;
        metaByCode[code] = {
          name: firstDefined(a.name, a.title, a.short_name),
          logoUrl: firstDefined(a.logo, a.logo_url, a.icon, a.image, a.image_url),
        };
      }
    }
  } else if (airlines && typeof airlines === "object") {
    for (const [k, v] of Object.entries(airlines)) {
      if (!v || typeof v !== "object") continue;
      const code = normalizeIata((v as AnyRecord).iata ?? (v as AnyRecord).code ?? k);
      const id = firstDefined((v as AnyRecord).id, (v as AnyRecord).airline_id);
      if (id != null) byId[String(id)] = v as AnyRecord;
      if (code) {
        byCode[code] = v as AnyRecord;
        metaByCode[code] = {
          name: firstDefined((v as AnyRecord).name, (v as AnyRecord).title, (v as AnyRecord).short_name),
          logoUrl: firstDefined((v as AnyRecord).logo, (v as AnyRecord).logo_url, (v as AnyRecord).icon, (v as AnyRecord).image, (v as AnyRecord).image_url),
        };
      }
    }
  }

  return { byId, byCode, metaByCode };
}

function resolveAirportIata(ref: unknown, airports: AirportsIndex): string {
  // Already an IATA code
  if (typeof ref === "string") {
    const c = normalizeIata(ref);
    if (c.length === 3) return c;
    // If it's a string ID, try lookup
    const byId = airports.byId[ref];
    const code = normalizeIata(firstDefined(byId?.iata, byId?.code, byId?.airport_code));
    if (code.length === 3) return code;
  }

  const id = toNumber(ref);
  if (id !== undefined) {
    const a = airports.byId[String(id)];
    const code = normalizeIata(firstDefined(a?.iata, a?.code, a?.airport_code));
    if (code.length === 3) return code;
  }

  return "";
}

function resolveAirlineCode(ref: unknown, airlines: AirlinesIndex): string {
  if (typeof ref === "string") {
    const c = normalizeIata(ref);
    if (c.length >= 2 && c.length <= 3) return c;
    const aById = airlines.byId[ref];
    const code = normalizeIata(firstDefined(aById?.iata, aById?.code, aById?.airline_code));
    if (code) return code;
  }

  const id = toNumber(ref);
  if (id !== undefined) {
    const a = airlines.byId[String(id)];
    const code = normalizeIata(firstDefined(a?.iata, a?.code, a?.airline_code));
    if (code) return code;
  }

  return "";
}

function durationToMinutes(value: unknown): number | undefined {
  const n = toNumber(value);
  if (n === undefined || n <= 0) return undefined;

  // Heuristic: if it looks like seconds, convert
  // Typical minutes are < 2000. Typical seconds can be 3k-100k.
  if (n > 2000) return Math.round(n / 60);
  return Math.round(n);
}

/**
 * Build a FlightInfoMap from a Travelpayouts affiliate-like response.
 * Returns null when no flight lookup collection is present.
 */
export function buildFlightInfoMapFromAffiliate(raw: any): FlightInfoMap | null {
  const flights =
    firstDefined<any[]>(raw?.flights, getByPath(raw, "data.flights"), getByPath(raw, "result.flights")) ??
    null;

  if (!Array.isArray(flights) || flights.length === 0) return null;

  const airportsIdx = buildAirportsIndex(raw);
  const airlinesIdx = buildAirlinesIndex(raw);

  const map: FlightInfoMap = {};

  for (let arrayIndex = 0; arrayIndex < flights.length; arrayIndex++) {
    const f = flights[arrayIndex];
    if (!f || typeof f !== "object") continue;

    const id =
      toNumber(firstDefined(f.id, f.flight_id, f.idx, f.index, f.i, f.num, f.number)) ??
      // Some Travelpayouts shapes use the array index as the flight reference.
      arrayIndex;
    if (id === undefined) continue;

    const depTs = parseTimestampSeconds(firstDefined(f.departure_timestamp, f.departure_ts, f.departure_time, f.departure_at, f.departure_datetime));
    const arrTs = parseTimestampSeconds(firstDefined(f.arrival_timestamp, f.arrival_ts, f.arrival_time, f.arrival_at, f.arrival_datetime));

    const departure = resolveAirportIata(firstDefined(f.departure, f.origin, f.departure_airport, f.departure_airport_id, f.origin_airport, f.origin_airport_id, f.departure_iata, f.origin_iata), airportsIdx);
    const arrival = resolveAirportIata(firstDefined(f.arrival, f.destination, f.arrival_airport, f.arrival_airport_id, f.destination_airport, f.destination_airport_id, f.arrival_iata, f.destination_iata), airportsIdx);

    const airlineCode = resolveAirlineCode(
      firstDefined(
        f.operating_carrier,
        f.operating_airline,
        f.marketing_carrier,
        f.marketing_airline,
        f.airline,
        f.airline_code,
        f.carrier,
        f.carrier_code,
        f.airline_id
      ),
      airlinesIdx
    );

    const durationMinutes =
      durationToMinutes(firstDefined(f.duration, f.duration_minutes, f.flight_duration)) ??
      (depTs && arrTs && arrTs > depTs ? Math.round((arrTs - depTs) / 60) : 0);

    map[id] = {
      departure: departure || "",
      arrival: arrival || "",
      departureTime: depTs ? formatTime(depTs) : "",
      arrivalTime: arrTs ? formatTime(arrTs) : "",
      airline: airlineCode || "",
      duration: durationMinutes || 0,
    };
  }

  return map;
}

/**
 * Build an airline meta map (name/logo) by IATA code from affiliate response.
 */
export function buildAirlineMetaByCodeFromAffiliate(raw: any): Record<string, AirlineMeta> {
  return buildAirlinesIndex(raw).metaByCode;
}

/**
 * Apply airline meta to normalized flights (without touching layout/styling).
 */
export function applyAirlineMetaToFlights(
  flights: NormalizedFlight[],
  metaByCode: Record<string, AirlineMeta>
): NormalizedFlight[] {
  if (!flights.length) return flights;
  if (!metaByCode || Object.keys(metaByCode).length === 0) return flights;

  return flights.map((f) => {
    const meta = metaByCode[(f.airlineCode || "").toUpperCase()];
    if (!meta) return f;

    return {
      ...f,
      airlineName: meta.name || f.airlineName,
      airlineLogo: meta.logoUrl || f.airlineLogo,
    };
  });
}

/**
 * Strict-ish readiness check: ensure at least one ticket has at least one segment
 * with at least one flight reference.
 */
export function hasResolvableTicketData(tickets: any[]): boolean {
  if (!Array.isArray(tickets) || tickets.length === 0) return false;
  return tickets.some((t) =>
    Array.isArray(t?.segments) &&
    t.segments.some((s: any) => Array.isArray(s?.flights) && s.flights.length > 0)
  );
}
