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

/** Try to parse a departure/arrival timestamp from a leg */
function extractTime(leg: any, keys: string[]): string {
  for (const k of keys) {
    const v = leg?.[k];
    if (!v) continue;
    if (typeof v === "string" && v.length >= 10) {
      // "2025-06-15 14:30" or ISO
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
  const segments: any[] = (flight as any).segments || [];

  // No segment data available — fall back to top-level stopsCount
  if (segments.length === 0) {
    const stops = Math.max(0, flight.stopsCount ?? 0);
    return {
      ...flight,
      outboundStopsTotal: stops,
      returnStopsTotal: 0,
      stopsTotal: stops,
      isDirectOutbound: stops === 0,
      isDirectReturn: true,
      isDirectItinerary: stops === 0,
      outboundStopsAirports: flight.stopsAirports || [],
      returnStopsAirports: [],
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

  // Build return leg info if we have return segments
  let returnLegInfo: ReturnLegInfo | undefined;
  if (returnLegs.length > 0) {
    const firstReturn = returnLegs[0];
    const lastReturn = returnLegs[returnLegs.length - 1];

    const retOrigin = pickStr(firstReturn, ["origin", "departure"]) || dest;
    const retDest = pickStr(lastReturn, ["destination", "arrival"]) || origin;

    const retDepTime = extractTime(firstReturn, [
      "departure_at", "departureAt", "departure_time", "departure_date",
      "departure_timestamp", "departureTimestamp",
      "local_departure", "local_departure_datetime",
      "dep", "depart",
    ]);
    const retArrTime = extractTime(lastReturn, [
      "arrival_at", "arrivalAt", "arrival_time", "arrival_date",
      "arrival_timestamp", "arrivalTimestamp",
      "local_arrival", "local_arrival_datetime",
      "arr", "arrive",
    ]);

    // Duration: try to compute from timestamps, else use 0
    let retDuration = 0;
    const retDepRaw = firstReturn?.departure_at || firstReturn?.departureAt || firstReturn?.departure_time || firstReturn?.departure_date || firstReturn?.departure_timestamp || firstReturn?.local_departure;
    const retArrRaw = lastReturn?.arrival_at || lastReturn?.arrivalAt || lastReturn?.arrival_time || lastReturn?.arrival_date || lastReturn?.arrival_timestamp || lastReturn?.local_arrival;
    if (retDepRaw && retArrRaw) {
      try {
        const d1 = typeof retDepRaw === "number" ? retDepRaw * 1000 : new Date(retDepRaw).getTime();
        const d2 = typeof retArrRaw === "number" ? retArrRaw * 1000 : new Date(retArrRaw).getTime();
        if (!isNaN(d1) && !isNaN(d2) && d2 > d1) {
          retDuration = Math.round((d2 - d1) / 60000);
        }
      } catch { /* ignore */ }
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
    };
  }

  // Compute outbound departure/arrival from the outbound legs
  const outboundDepTime = extractTime(outboundLegs[0], [
    "departure_at", "departureAt", "departure_time", "departure_date",
    "departure_timestamp", "departureTimestamp",
    "local_departure", "local_departure_datetime",
    "dep", "depart",
  ]) || flight.departureTime;

  const outboundArrTime = extractTime(outboundLegs[outboundLegs.length - 1], [
    "arrival_at", "arrivalAt", "arrival_time", "arrival_date",
    "arrival_timestamp", "arrivalTimestamp",
    "local_arrival", "local_arrival_datetime",
    "arr", "arrive",
  ]) || flight.arrivalTime;

  // Compute outbound duration
  let outboundDuration = flight.durationMinutes;
  const obDepRaw = outboundLegs[0]?.departure_at || outboundLegs[0]?.departureAt || outboundLegs[0]?.departure_time || outboundLegs[0]?.departure_date || outboundLegs[0]?.departure_timestamp || outboundLegs[0]?.local_departure;
  const obArrRaw = outboundLegs[outboundLegs.length - 1]?.arrival_at || outboundLegs[outboundLegs.length - 1]?.arrivalAt || outboundLegs[outboundLegs.length - 1]?.arrival_time || outboundLegs[outboundLegs.length - 1]?.arrival_date || outboundLegs[outboundLegs.length - 1]?.arrival_timestamp || outboundLegs[outboundLegs.length - 1]?.local_arrival;
  if (obDepRaw && obArrRaw) {
    try {
      const d1 = typeof obDepRaw === "number" ? obDepRaw * 1000 : new Date(obDepRaw).getTime();
      const d2 = typeof obArrRaw === "number" ? obArrRaw * 1000 : new Date(obArrRaw).getTime();
      if (!isNaN(d1) && !isNaN(d2) && d2 > d1) {
        outboundDuration = Math.round((d2 - d1) / 60000);
      }
    } catch { /* ignore */ }
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
