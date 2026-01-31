/**
 * Flight Data Normalizer
 * Converts raw API responses into clean, UI-ready flight objects.
 * This is the ONLY source of truth for what the UI renders.
 */

import {
  Ticket,
  FlightInfo,
  formatTime,
  formatDuration,
} from "@/lib/flightSearchApi";

/**
 * Normalized flight object - ONLY these fields are used by the UI
 */
export interface NormalizedFlight {
  // Unique identifier for React keys
  id: string;

  // Airline info
  airlineCode: string;
  airlineName: string;
  airlineLogo: string;
  flightNumber: string;

  // Route info
  originIata: string;
  destinationIata: string;

  // Times (empty string if unavailable - UI will hide)
  departureTime: string;
  arrivalTime: string;

  // Duration (empty string if unavailable)
  duration: string;
  durationMinutes: number;

  // Stops
  stops: number;
  stopAirports: string[]; // e.g., ["FRA", "LHR"]

  // Price
  price: number;
  currency: string;

  // Booking metadata - required for click action
  searchId: string;
  resultsUrl: string;
  proposalId: string;
  signature: string;

  // Validity flag
  hasValidBookingUrl: boolean;
}

/**
 * Flight info map from API response
 */
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

/**
 * Build a flight info map from raw API flight_info
 */
export function buildFlightInfoMap(
  rawFlightInfo: Record<string, FlightInfo> | undefined | null
): FlightInfoMap {
  const map: FlightInfoMap = {};

  if (!rawFlightInfo || typeof rawFlightInfo !== "object") {
    return map;
  }

  for (const [key, info] of Object.entries(rawFlightInfo)) {
    const idx = parseInt(key, 10);
    if (isNaN(idx) || !info) continue;

    map[idx] = {
      departure: info.departure || "",
      arrival: info.arrival || "",
      departureTime: formatTime(info.departure_timestamp),
      arrivalTime: formatTime(info.arrival_timestamp),
      airline: info.operating_carrier || "",
      duration: info.duration || 0,
    };
  }

  return map;
}

/**
 * Normalize a single ticket into multiple flight offers (one per proposal)
 */
function normalizeTicket(
  ticket: Ticket,
  flightInfoMap: FlightInfoMap,
  searchId: string,
  resultsUrl: string,
  defaultOrigin: string,
  defaultDestination: string
): NormalizedFlight[] {
  const results: NormalizedFlight[] = [];

  // VALIDATION: Must have signature
  if (!ticket?.signature || typeof ticket.signature !== "string") {
    return results;
  }

  // VALIDATION: Must have proposals
  const proposals = ticket.proposals;
  if (!Array.isArray(proposals) || proposals.length === 0) {
    return results;
  }

  // Get first segment for route info
  const segments = ticket.segments;
  const firstSegment = Array.isArray(segments) && segments.length > 0 ? segments[0] : null;
  const segmentFlights = firstSegment?.flights;

  // Get flight indices
  const firstFlightIdx =
    Array.isArray(segmentFlights) && segmentFlights.length > 0
      ? segmentFlights[0]
      : undefined;
  const lastFlightIdx =
    Array.isArray(segmentFlights) && segmentFlights.length > 0
      ? segmentFlights[segmentFlights.length - 1]
      : undefined;

  // Get flight info
  const firstFlightInfo = firstFlightIdx !== undefined ? flightInfoMap[firstFlightIdx] : undefined;
  const lastFlightInfo = lastFlightIdx !== undefined ? flightInfoMap[lastFlightIdx] : undefined;

  // Route (always show, use defaults if needed)
  const originIata = (firstFlightInfo?.departure || defaultOrigin).toUpperCase();
  const destinationIata = (lastFlightInfo?.arrival || defaultDestination).toUpperCase();

  // Times (empty if not available)
  const departureTime =
    firstFlightInfo?.departureTime && firstFlightInfo.departureTime !== "--:--"
      ? firstFlightInfo.departureTime
      : "";
  const arrivalTime =
    lastFlightInfo?.arrivalTime && lastFlightInfo.arrivalTime !== "--:--"
      ? lastFlightInfo.arrivalTime
      : "";

  // Stops and stop airports
  const stops =
    firstSegment && Array.isArray(segmentFlights)
      ? Math.max(0, segmentFlights.length - 1)
      : 0;

  // Collect intermediate stop airports
  const stopAirports: string[] = [];
  if (Array.isArray(segmentFlights) && segmentFlights.length > 2) {
    for (let i = 1; i < segmentFlights.length - 1; i++) {
      const stopInfo = flightInfoMap[segmentFlights[i]];
      if (stopInfo?.departure) {
        stopAirports.push(stopInfo.departure.toUpperCase());
      }
    }
  } else if (Array.isArray(segmentFlights) && segmentFlights.length === 2) {
    // For 1 stop, the arrival of first flight is the stop
    const stopInfo = flightInfoMap[segmentFlights[0]];
    if (stopInfo?.arrival) {
      stopAirports.push(stopInfo.arrival.toUpperCase());
    }
  }

  // Calculate total duration
  let totalDuration = 0;
  if (Array.isArray(segmentFlights)) {
    for (const flightIdx of segmentFlights) {
      const info = flightInfoMap[flightIdx];
      if (info?.duration) totalDuration += info.duration;
    }
  }
  const durationText = totalDuration > 0 ? formatDuration(totalDuration) : "";

  // Process each proposal
  for (const proposal of proposals) {
    if (!proposal || typeof proposal !== "object") continue;
    if (!proposal.id) continue;

    // VALIDATION: Must have valid price
    const priceValue = proposal.price_per_person?.value ?? proposal.price?.value ?? 0;
    if (priceValue <= 0) continue;

    // Get airline from flight terms
    const flightTerms = proposal.flight_terms;
    const flightTermKeys =
      flightTerms && typeof flightTerms === "object" ? Object.keys(flightTerms) : [];
    const firstTermKey = flightTermKeys[0];
    const firstTerm = firstTermKey ? flightTerms?.[firstTermKey] : undefined;

    const carrierCode =
      firstTerm?.marketing_carrier_designator?.carrier ||
      firstFlightInfo?.airline ||
      "XX";
    const flightNumber = firstTerm?.marketing_carrier_designator?.number || "";

    const id = `${proposal.id}-${ticket.signature}`;

    results.push({
      id,
      airlineCode: carrierCode.toUpperCase(),
      airlineName: carrierCode.toUpperCase(),
      airlineLogo:
        carrierCode && carrierCode !== "XX"
          ? `https://pics.avs.io/60/60/${carrierCode}.png`
          : "",
      flightNumber: flightNumber ? `${carrierCode}${flightNumber}` : "",
      originIata,
      destinationIata,
      departureTime,
      arrivalTime,
      duration: durationText,
      durationMinutes: totalDuration,
      stops,
      stopAirports,
      price: Math.round(priceValue),
      currency: proposal.price_per_person?.currency_code || proposal.price?.currency_code || "EUR",
      searchId,
      resultsUrl,
      proposalId: proposal.id,
      signature: ticket.signature,
      hasValidBookingUrl: !!(searchId && resultsUrl && proposal.id && ticket.signature),
    });
  }

  return results;
}

/**
 * Normalize all tickets from API response
 */
export function normalizeFlights(
  tickets: Ticket[] | undefined | null,
  flightInfoMap: FlightInfoMap,
  searchId: string,
  resultsUrl: string,
  defaultOrigin: string,
  defaultDestination: string
): NormalizedFlight[] {
  if (!Array.isArray(tickets)) {
    console.warn("[Normalizer] No valid tickets array");
    return [];
  }

  const allFlights: NormalizedFlight[] = [];

  for (const ticket of tickets) {
    const normalized = normalizeTicket(
      ticket,
      flightInfoMap,
      searchId,
      resultsUrl,
      defaultOrigin,
      defaultDestination
    );
    allFlights.push(...normalized);
  }

  console.log(`[Normalizer] Normalized ${allFlights.length} flights from ${tickets.length} tickets`);
  return allFlights;
}

/**
 * Sort flights by different criteria
 */
export function sortFlights(
  flights: NormalizedFlight[],
  sortBy: "best" | "cheapest" | "fastest"
): NormalizedFlight[] {
  const sorted = [...flights];

  switch (sortBy) {
    case "cheapest":
      sorted.sort((a, b) => a.price - b.price);
      break;
    case "fastest":
      sorted.sort((a, b) => a.durationMinutes - b.durationMinutes);
      break;
    case "best":
    default:
      // Weighted score: price + stops penalty + duration penalty
      sorted.sort((a, b) => {
        const scoreA = a.price + a.stops * 80 + a.durationMinutes * 0.5;
        const scoreB = b.price + b.stops * 80 + b.durationMinutes * 0.5;
        return scoreA - scoreB;
      });
      break;
  }

  return sorted;
}

/**
 * Get summary stats for the flight list
 */
export function getFlightStats(flights: NormalizedFlight[]) {
  if (flights.length === 0) return null;

  const cheapest = flights.reduce((min, f) => (f.price < min.price ? f : min), flights[0]);
  const fastest = flights.reduce(
    (min, f) => (f.durationMinutes < min.durationMinutes ? f : min),
    flights[0]
  );

  // Best uses same weighted score
  const best = flights.reduce((best, f) => {
    const scoreA = f.price + f.stops * 80 + f.durationMinutes * 0.5;
    const scoreB = best.price + best.stops * 80 + best.durationMinutes * 0.5;
    return scoreA < scoreB ? f : best;
  }, flights[0]);

  return { cheapest, fastest, best };
}
