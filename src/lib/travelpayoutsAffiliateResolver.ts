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

import type { NormalizedFlight } from "@/lib/flightNormalizer";

// Local FlightInfoMap type to avoid circular dependency
export type FlightInfoMap = Record<
  number,
  {
    departure: string;
    arrival: string;
    departureTime: string;
    arrivalTime: string;
    airline: string;
    duration: number;
  }
>;

const DEV_MODE = import.meta.env.DEV;

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

/**
 * Parse a timestamp that could be:
 * - Unix seconds (10 digits)
 * - Unix milliseconds (13 digits)
 * - ISO date string
 * Returns seconds since epoch (for formatTime compatibility)
 */
function parseTimestampSeconds(value: unknown): number | undefined {
  // Handle numeric values
  const n = toNumber(value);
  if (n !== undefined && n > 0) {
    // Heuristic: milliseconds have 13 digits, seconds have 10
    if (n > 1e12) return Math.floor(n / 1000);
    if (n > 1e9) return Math.floor(n);
    // Very small numbers might be relative - skip
    return undefined;
  }

  // Handle ISO date strings like "2025-03-15T06:50:00"
  if (typeof value === "string" && value.trim() !== "") {
    const trimmed = value.trim();
    // Check if it looks like a date string
    if (trimmed.includes("-") || trimmed.includes("T") || trimmed.includes(":")) {
      const d = new Date(trimmed);
      if (!Number.isNaN(d.getTime())) {
        return Math.floor(d.getTime() / 1000);
      }
    }
  }

  return undefined;
}

/**
 * Format timestamp to "6:50 AM" style
 */
function formatTimeLocal(timestampSeconds: number | undefined): string {
  if (!timestampSeconds || timestampSeconds <= 0) return "";
  try {
    const date = new Date(timestampSeconds * 1000);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "";
  }
}

function normalizeIata(code: unknown): string {
  if (typeof code !== "string") return "";
  const c = code.trim().toUpperCase();
  return c;
}

type AirportsIndex = {
  byId: Record<string, AnyRecord>;
  byIata: Record<string, AnyRecord>;
};

function buildAirportsIndex(raw: any): AirportsIndex {
  const byId: Record<string, AnyRecord> = {};
  const byIata: Record<string, AnyRecord> = {};

  const airports =
    firstDefined<any>(
      raw?.airports,
      getByPath(raw, "data.airports"),
      getByPath(raw, "result.airports")
    ) ?? null;

  if (Array.isArray(airports)) {
    for (const a of airports) {
      if (!a || typeof a !== "object") continue;
      const id = firstDefined(a.id, a.airport_id, a.value);
      const code = normalizeIata(firstDefined(a.iata, a.code, a.airport_code, a.short_code));
      if (id != null) byId[String(id)] = a;
      if (code) byIata[code] = a;
    }
  } else if (airports && typeof airports === "object") {
    // Keyed by IATA or ID
    for (const [k, v] of Object.entries(airports)) {
      if (!v || typeof v !== "object") continue;
      const rec = v as AnyRecord;
      const code = normalizeIata(rec.iata ?? rec.code ?? k);
      if (code) byIata[code] = rec;
      const id = firstDefined(rec.id, rec.airport_id);
      if (id != null) byId[String(id)] = rec;
      // Also key by the object key itself
      byId[k] = rec;
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
    firstDefined<any>(
      raw?.airlines,
      getByPath(raw, "data.airlines"),
      getByPath(raw, "result.airlines")
    ) ?? null;

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
      const rec = v as AnyRecord;
      const code = normalizeIata(rec.iata ?? rec.code ?? k);
      const id = firstDefined(rec.id, rec.airline_id);
      if (id != null) byId[String(id)] = rec;
      byId[k] = rec; // Also key by the object key
      if (code) {
        byCode[code] = rec;
        metaByCode[code] = {
          name: firstDefined(rec.name, rec.title, rec.short_name),
          logoUrl: firstDefined(rec.logo, rec.logo_url, rec.icon, rec.image, rec.image_url),
        };
      }
    }
  }

  return { byId, byCode, metaByCode };
}

function resolveAirportIata(ref: unknown, airports: AirportsIndex): string {
  // Already an IATA code (3 letters)
  if (typeof ref === "string") {
    const c = normalizeIata(ref);
    if (c.length === 3) return c;
    // Try lookup by string ID
    const byId = airports.byId[ref];
    if (byId) {
      const code = normalizeIata(firstDefined(byId.iata, byId.code, byId.airport_code));
      if (code.length === 3) return code;
    }
  }

  // Numeric ID lookup
  const id = toNumber(ref);
  if (id !== undefined) {
    const a = airports.byId[String(id)];
    if (a) {
      const code = normalizeIata(firstDefined(a.iata, a.code, a.airport_code));
      if (code.length === 3) return code;
    }
  }

  return "";
}

function resolveAirlineCode(ref: unknown, airlines: AirlinesIndex): string {
  if (typeof ref === "string") {
    const c = normalizeIata(ref);
    if (c.length >= 2 && c.length <= 3) return c;
    const aById = airlines.byId[ref];
    if (aById) {
      const code = normalizeIata(firstDefined(aById.iata, aById.code, aById.airline_code));
      if (code) return code;
    }
  }

  const id = toNumber(ref);
  if (id !== undefined) {
    const a = airlines.byId[String(id)];
    if (a) {
      const code = normalizeIata(firstDefined(a.iata, a.code, a.airline_code));
      if (code) return code;
    }
  }

  return "";
}

function durationToMinutes(value: unknown): number | undefined {
  const n = toNumber(value);
  if (n === undefined || n <= 0) return undefined;

  // Heuristic: if value > 2000, it's likely seconds, convert to minutes
  if (n > 2000) return Math.round(n / 60);
  return Math.round(n);
}

/**
 * Build a FlightInfoMap from a Travelpayouts affiliate-like response.
 * Returns null when no flight lookup collection is present.
 */
export function buildFlightInfoMapFromAffiliate(raw: any): FlightInfoMap | null {
  // Try multiple paths for flights array
  const flights =
    firstDefined<any>(
      raw?.flights,
      getByPath(raw, "data.flights"),
      getByPath(raw, "result.flights")
    ) ?? null;

  // Also check flight_info as an object keyed by flight index
  const flightInfo = raw?.flight_info;

  // If we have flight_info object, build from that
  if (flightInfo && typeof flightInfo === "object" && !Array.isArray(flightInfo)) {
    const airportsIdx = buildAirportsIndex(raw);
    const airlinesIdx = buildAirlinesIndex(raw);
    const map: FlightInfoMap = {};

    for (const [key, f] of Object.entries(flightInfo)) {
      if (!f || typeof f !== "object") continue;
      const idx = toNumber(key);
      if (idx === undefined) continue;

      const fRec = f as AnyRecord;
      
      // Try multiple field names for timestamps
      const depTs = parseTimestampSeconds(
        firstDefined(
          fRec.departure_timestamp,
          fRec.departure_ts,
          fRec.departure_time,
          fRec.departure_at,
          fRec.departure_datetime,
          fRec.local_departure_timestamp,
          fRec.dep_time
        )
      );
      const arrTs = parseTimestampSeconds(
        firstDefined(
          fRec.arrival_timestamp,
          fRec.arrival_ts,
          fRec.arrival_time,
          fRec.arrival_at,
          fRec.arrival_datetime,
          fRec.local_arrival_timestamp,
          fRec.arr_time
        )
      );

      const departure = resolveAirportIata(
        firstDefined(
          fRec.departure,
          fRec.origin,
          fRec.departure_airport,
          fRec.departure_iata,
          fRec.origin_iata,
          fRec.from
        ),
        airportsIdx
      );
      const arrival = resolveAirportIata(
        firstDefined(
          fRec.arrival,
          fRec.destination,
          fRec.arrival_airport,
          fRec.arrival_iata,
          fRec.destination_iata,
          fRec.to
        ),
        airportsIdx
      );

      const airlineCode = resolveAirlineCode(
        firstDefined(
          fRec.operating_carrier,
          fRec.operating_airline,
          fRec.marketing_carrier,
          fRec.marketing_airline,
          fRec.airline,
          fRec.airline_code,
          fRec.carrier,
          fRec.carrier_code
        ),
        airlinesIdx
      );

      const durationMinutes =
        durationToMinutes(firstDefined(fRec.duration, fRec.duration_minutes, fRec.flight_duration)) ??
        (depTs && arrTs && arrTs > depTs ? Math.round((arrTs - depTs) / 60) : 0);

      map[idx] = {
        departure: departure || normalizeIata(fRec.departure) || "",
        arrival: arrival || normalizeIata(fRec.arrival) || "",
        departureTime: formatTimeLocal(depTs),
        arrivalTime: formatTimeLocal(arrTs),
        airline: airlineCode || normalizeIata(fRec.operating_carrier) || "",
        duration: durationMinutes || 0,
      };
    }

    if (DEV_MODE && Object.keys(map).length > 0) {
      const sampleKey = Object.keys(map)[0];
      console.log("[AffiliateResolver] Built FlightInfoMap from flight_info, sample:", sampleKey, map[Number(sampleKey)]);
    }

    return Object.keys(map).length > 0 ? map : null;
  }

  // If we have flights array
  if (!Array.isArray(flights) || flights.length === 0) {
    if (DEV_MODE) {
      console.log("[AffiliateResolver] No flights array found in response");
    }
    return null;
  }

  const airportsIdx = buildAirportsIndex(raw);
  const airlinesIdx = buildAirlinesIndex(raw);

  const map: FlightInfoMap = {};

  for (let arrayIndex = 0; arrayIndex < flights.length; arrayIndex++) {
    const f = flights[arrayIndex];
    if (!f || typeof f !== "object") continue;

    // Determine the flight ID - use explicit id or fall back to array index
    const id =
      toNumber(firstDefined(f.id, f.flight_id, f.idx, f.index, f.i, f.num, f.number)) ??
      arrayIndex;

    const depTs = parseTimestampSeconds(
      firstDefined(
        f.departure_timestamp,
        f.departure_ts,
        f.departure_time,
        f.departure_at,
        f.departure_datetime,
        f.local_departure_timestamp,
        f.dep_time
      )
    );
    const arrTs = parseTimestampSeconds(
      firstDefined(
        f.arrival_timestamp,
        f.arrival_ts,
        f.arrival_time,
        f.arrival_at,
        f.arrival_datetime,
        f.local_arrival_timestamp,
        f.arr_time
      )
    );

    const departure = resolveAirportIata(
      firstDefined(
        f.departure,
        f.origin,
        f.departure_airport,
        f.departure_airport_id,
        f.origin_airport,
        f.origin_airport_id,
        f.departure_iata,
        f.origin_iata,
        f.from
      ),
      airportsIdx
    );
    const arrival = resolveAirportIata(
      firstDefined(
        f.arrival,
        f.destination,
        f.arrival_airport,
        f.arrival_airport_id,
        f.destination_airport,
        f.destination_airport_id,
        f.arrival_iata,
        f.destination_iata,
        f.to
      ),
      airportsIdx
    );

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
      departure: departure || normalizeIata(f.departure) || "",
      arrival: arrival || normalizeIata(f.arrival) || "",
      departureTime: formatTimeLocal(depTs),
      arrivalTime: formatTimeLocal(arrTs),
      airline: airlineCode || normalizeIata(f.operating_carrier) || "",
      duration: durationMinutes || 0,
    };
  }

  if (DEV_MODE && Object.keys(map).length > 0) {
    const sampleKey = Object.keys(map)[0];
    console.log("[AffiliateResolver] Built FlightInfoMap from flights array, sample:", sampleKey, map[Number(sampleKey)]);
  }

  return Object.keys(map).length > 0 ? map : null;
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
