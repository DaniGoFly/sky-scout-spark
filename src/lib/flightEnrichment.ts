/**
 * Flight Enrichment — canonical stop computation
 *
 * The edge function returns `stopsCount = totalLegs - 1` combining outbound
 * AND return segments.  For a direct roundtrip this gives stopsCount = 1,
 * which breaks "direct only" filtering.
 *
 * This module splits the raw `segments` array into outbound / return using
 * the search destination, then computes per-direction stop totals.
 */

import type { Flight, ReturnLegInfo } from "./flightNormalizer";

/* ------------------------------------------------------------------ */
/*  Enriched Flight type                                               */
/* ------------------------------------------------------------------ */

export interface EnrichedFlight extends Flight {
  /** Stops on the outbound journey (0 = direct) */
  outboundStopsTotal: number;
  /** Stops on the return journey (0 = direct, 0 for one-way) */
  returnStopsTotal: number;
  /** Sum of outbound + return stops */
  stopsTotal: number;
  /** True when outbound has 0 stops */
  isDirectOutbound: boolean;
  /** True when return has 0 stops (always true for one-way) */
  isDirectReturn: boolean;
  /** True when BOTH legs are direct */
  isDirectItinerary: boolean;
  /** Stop airports for outbound only */
  outboundStopsAirports: string[];
  /** Stop airports for return only */
  returnStopsAirports: string[];
  /** Human-readable stop label for outbound ("Direct", "1 stop · LHR", etc.) */
  outboundStopLabel: string;
  /** Human-readable stop label for return leg */
  returnStopLabel: string;
  /** Total layover minutes on outbound (sum of connection waits between segments) */
  outboundLayoverMinutes: number;
  /** Total layover minutes on return */
  returnLayoverMinutes: number;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function pickStr(obj: any, keys: string[]): string {
  for (const k of keys) {
    const v = obj?.[k];
    if (typeof v === "string" && v.trim()) return v.trim().toUpperCase();
  }
  return "";
}

function extractAirports(legs: any[], skipLast: boolean): string[] {
  const slice = skipLast ? legs.slice(0, Math.max(0, legs.length - 1)) : legs;
  return slice
    .map((l) => pickStr(l, ["destination", "arrival"]))
    .filter((s) => s && s !== "UNDEFINED" && s !== "NULL");
}

function extractAirlines(legs: any[]): string[] {
  return legs
    .map((l) => pickStr(l, ["carrier", "marketing_carrier"]))
    .filter(Boolean);
}

function extractFlightNumbers(legs: any[]): string[] {
  return legs
    .map((l) => pickStr(l, ["flight_number", "number"]))
    .filter(Boolean);
}

const TIME_KEYS_DEP = [
  "departure_at", "departureAt", "departure_time", "departure_date",
  "departure_timestamp", "departureTimestamp",
  "local_departure", "local_departure_datetime",
  "dep", "depart",
];
const TIME_KEYS_ARR = [
  "arrival_at", "arrivalAt", "arrival_time", "arrival_date",
  "arrival_timestamp", "arrivalTimestamp",
  "local_arrival", "local_arrival_datetime",
  "arr", "arrive",
];

/** Try to parse a timestamp from a leg — returns ms epoch or null */
function extractTimestampMs(leg: any, keys: string[]): number | null {
  for (const k of keys) {
    const v = leg?.[k];
    if (!v) continue;
    if (typeof v === "number" && v > 1e9) return v * 1000; // Unix seconds
    if (typeof v === "string") {
      const d = new Date(v);
      if (!isNaN(d.getTime())) return d.getTime();
    }
  }
  return null;
}

/** Try to parse a HH:mm time string from a leg */
function extractTime(leg: any, keys: string[]): string {
  for (const k of keys) {
    const v = leg?.[k];
    if (!v) continue;
    if (typeof v === "string") {
      const match = v.match(/(\d{2}:\d{2})/);
      if (match) return match[1];
    }
    if (typeof v === "number") {
      try {
        const d = new Date(v * 1000);
        if (!isNaN(d.getTime())) {
          return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
        }
      } catch { /* ignore */ }
    }
  }
  return "";
}

/**
 * Compute total layover minutes between consecutive segments.
 * Layover = arrival of segment[i] → departure of segment[i+1].
 */
function computeLayoverMinutes(legs: any[]): number {
  if (legs.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < legs.length - 1; i++) {
    const arrMs = extractTimestampMs(legs[i], TIME_KEYS_ARR);
    const depMs = extractTimestampMs(legs[i + 1], TIME_KEYS_DEP);
    if (arrMs !== null && depMs !== null && depMs > arrMs) {
      total += Math.round((depMs - arrMs) / 60000);
    }
  }
  return total;
}

/** Build human-readable stop label from segment count + stop airports */
function buildStopLabel(stops: number, stopsAirports: string[]): string {
  const airports = stopsAirports.filter(
    (s) => s && s !== "UNDEFINED" && s !== "NULL"
  );
  if (stops === 0) return "Direct";
  if (stops === 1) {
    const via = airports.length > 0 ? ` · ${airports[0]}` : "";
    return `1 stop${via}`;
  }
  const shown = airports.slice(0, 2).join(", ");
  const overflow = airports.length > 2 ? ` +${airports.length - 2}` : "";
  const via = shown ? ` · ${shown}${overflow}` : "";
  return `${stops} stops${via}`;
}

/* ------------------------------------------------------------------ */
/*  Main enrichment                                                    */
/* ------------------------------------------------------------------ */

/**
 * Enrich a single flight with canonical per-direction stop data.
 *
 * @param flight         Raw flight from the API
 * @param searchOrigin   IATA origin of the search (e.g. "ZRH")
 * @param searchDest     IATA destination of the search (e.g. "SEA")
 * @param isRoundtrip    Whether this is a roundtrip search
 */
export function enrichFlightStops(
  flight: Flight,
  searchOrigin: string,
  searchDest: string,
  isRoundtrip: boolean,
): EnrichedFlight {
  const anyFlight = flight as any;

  // Resolve segments from multiple possible shapes
  const segments: any[] =
    anyFlight.segments ||
    anyFlight.segment ||
    anyFlight.itineraries?.[0]?.segments ||
    anyFlight.segments_outbound /* rarely present */ ||
    [];

  // No segment data — fall back to top-level stopsCount, but NEVER default to 0
  // stopsCount=0 is only safe when explicitly provided; null=unknown
  if (segments.length === 0) {
    const rawStops = flight.stopsCount;
    // If stopsCount is explicitly 0, honour it; otherwise treat as unknown
    const stops = typeof rawStops === "number" && Number.isFinite(rawStops) && rawStops >= 0
      ? rawStops
      : null;

    // Safety: long flights with no segment data should never claim "Direct"
    const isDirect = stops === 0 && (flight.durationMinutes == null || flight.durationMinutes <= 600);

    // Build stop label — "Stops unknown" when we can't determine count
    const outboundStopLabel = stops === null
      ? "Stops unknown"
      : buildStopLabel(stops, flight.stopsAirports || []);

    return {
      ...flight,
      outboundStopsTotal: stops ?? -1, // -1 = unknown, handled by card
      returnStopsTotal: 0,
      stopsTotal: stops ?? 0,
      isDirectOutbound: isDirect,
      isDirectReturn: true,
      isDirectItinerary: isDirect,
      outboundStopsAirports: flight.stopsAirports || [],
      returnStopsAirports: [],
      outboundStopLabel,
      returnStopLabel: "",
      outboundLayoverMinutes: 0,
      returnLayoverMinutes: 0,
    };
  }

  const dest = searchDest.toUpperCase();
  const origin = searchOrigin.toUpperCase();

  // ---- Split segments into outbound / return ----
  let splitIdx = -1;

  if (isRoundtrip && segments.length >= 2) {
    // Find the first segment whose destination matches the search destination
    for (let i = 0; i < segments.length; i++) {
      const segDest = pickStr(segments[i], ["destination", "arrival"]);
      if (segDest === dest) {
        splitIdx = i;
        break;
      }
    }

    // Fallback: if we can't find the destination, try to find a segment
    // whose origin matches the destination (start of return journey)
    if (splitIdx < 0) {
      for (let i = 1; i < segments.length; i++) {
        const segOrigin = pickStr(segments[i], ["origin", "departure"]);
        if (segOrigin === dest) {
          splitIdx = i - 1;
          break;
        }
      }
    }

    // Last-resort fallback: split in the middle
    if (splitIdx < 0) {
      splitIdx = Math.floor(segments.length / 2) - 1;
    }
  }

  let outboundLegs: any[];
  let returnLegs: any[];

  if (splitIdx >= 0) {
    outboundLegs = segments.slice(0, splitIdx + 1);
    returnLegs = segments.slice(splitIdx + 1);
  } else {
    // One-way or can't split
    outboundLegs = segments;
    returnLegs = [];
  }

  const outboundStops = Math.max(0, outboundLegs.length - 1);
  const returnStops = returnLegs.length > 0 ? Math.max(0, returnLegs.length - 1) : 0;
  const outboundStopsAirports = extractAirports(outboundLegs, true);
  const returnStopsAirports = returnLegs.length > 1 ? extractAirports(returnLegs, true) : [];

  // Compute layover times from segment timestamps
  const outboundLayoverMinutes = computeLayoverMinutes(outboundLegs);
  const returnLayoverMinutes = computeLayoverMinutes(returnLegs);

  // Build stop labels from segment data (authoritative source)
  const outboundStopLabel = buildStopLabel(outboundStops, outboundStopsAirports);
  const returnStopLabel = returnLegs.length > 0
    ? buildStopLabel(returnStops, returnStopsAirports)
    : "";

  // Build return leg info if we have return segments
  let returnLegInfo: ReturnLegInfo | undefined;
  if (returnLegs.length > 0) {
    const firstReturn = returnLegs[0];
    const lastReturn = returnLegs[returnLegs.length - 1];

    const retOrigin = pickStr(firstReturn, ["origin", "departure"]) || dest;
    const retDest = pickStr(lastReturn, ["destination", "arrival"]) || origin;

    const retDepTime = extractTime(firstReturn, TIME_KEYS_DEP);
    const retArrTime = extractTime(lastReturn, TIME_KEYS_ARR);

    // Duration: try to compute from timestamps, else use 0
    let retDuration = 0;
    const retDepMs = extractTimestampMs(firstReturn, TIME_KEYS_DEP);
    const retArrMs = extractTimestampMs(lastReturn, TIME_KEYS_ARR);
    if (retDepMs !== null && retArrMs !== null && retArrMs > retDepMs) {
      retDuration = Math.round((retArrMs - retDepMs) / 60000);
    }

    returnLegInfo = {
      origin: retOrigin,
      destination: retDest,
      departureTime: retDepTime,
      arrivalTime: retArrTime,
      durationMinutes: retDuration,
      stopsCount: returnStops,
      stopsAirports: returnStopsAirports,
      airlines: extractAirlines(returnLegs),
      flightNumbers: extractFlightNumbers(returnLegs),
      stopLabel: returnStopLabel,
      totalLayoverMinutes: returnLayoverMinutes,
    };
  }

  // Compute outbound departure/arrival from the outbound legs
  const outboundDepTime = extractTime(outboundLegs[0], TIME_KEYS_DEP) || flight.departureTime;
  const outboundArrTime = extractTime(outboundLegs[outboundLegs.length - 1], TIME_KEYS_ARR) || flight.arrivalTime;

  // Compute outbound duration from timestamps
  let outboundDuration = flight.durationMinutes;
  const obDepMs = extractTimestampMs(outboundLegs[0], TIME_KEYS_DEP);
  const obArrMs = extractTimestampMs(outboundLegs[outboundLegs.length - 1], TIME_KEYS_ARR);
  if (obDepMs !== null && obArrMs !== null && obArrMs > obDepMs) {
    outboundDuration = Math.round((obArrMs - obDepMs) / 60000);
  }

  return {
    ...flight,
    // Override top-level fields with outbound-only values
    origin: pickStr(outboundLegs[0], ["origin", "departure"]) || flight.origin,
    destination: pickStr(outboundLegs[outboundLegs.length - 1], ["destination", "arrival"]) || flight.destination,
    departureTime: outboundDepTime,
    arrivalTime: outboundArrTime,
    durationMinutes: outboundDuration || flight.durationMinutes,
    stopsCount: outboundStops,
    stopsAirports: outboundStopsAirports,
    // Top-level stop label and layover for direct card consumption
    stopLabel: outboundStopLabel,
    totalLayoverMinutes: outboundLayoverMinutes || undefined,
    // Return leg
    return: returnLegInfo,
    // Enriched stop fields
    outboundStopsTotal: outboundStops,
    returnStopsTotal: returnStops,
    stopsTotal: outboundStops + returnStops,
    isDirectOutbound: outboundStops === 0,
    isDirectReturn: returnStops === 0,
    isDirectItinerary: outboundStops === 0 && returnStops === 0,
    outboundStopsAirports,
    returnStopsAirports,
    outboundStopLabel,
    returnStopLabel,
    outboundLayoverMinutes,
    returnLayoverMinutes,
  };
}

/**
 * Batch-enrich an array of flights.
 */
export function enrichFlights(
  flights: Flight[],
  searchOrigin: string,
  searchDest: string,
  isRoundtrip: boolean,
): EnrichedFlight[] {
  return flights.map((f) => enrichFlightStops(f, searchOrigin, searchDest, isRoundtrip));
}
