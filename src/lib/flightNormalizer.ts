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
 * Common airline code to name mapping
 * This maps IATA codes to human-readable airline names
 */
const AIRLINE_NAMES: Record<string, string> = {
  AA: "American Airlines",
  AC: "Air Canada",
  AF: "Air France",
  AS: "Alaska Airlines",
  AY: "Finnair",
  AZ: "ITA Airways",
  BA: "British Airways",
  CX: "Cathay Pacific",
  DE: "Condor",
  DL: "Delta Air Lines",
  EK: "Emirates",
  EW: "Eurowings",
  EY: "Etihad Airways",
  F9: "Frontier Airlines",
  IB: "Iberia",
  JL: "Japan Airlines",
  KL: "KLM",
  LH: "Lufthansa",
  LO: "LOT Polish Airlines",
  LX: "SWISS",
  NK: "Spirit Airlines",
  OS: "Austrian Airlines",
  QF: "Qantas",
  QR: "Qatar Airways",
  SK: "SAS",
  SQ: "Singapore Airlines",
  TK: "Turkish Airlines",
  UA: "United Airlines",
  VS: "Virgin Atlantic",
  WN: "Southwest Airlines",
  WS: "WestJet",
  X3: "TUI fly",
};

/**
 * Get human-readable airline name from IATA code
 */
function getAirlineName(code: string): string {
  const upperCode = code?.toUpperCase() || "";
  return AIRLINE_NAMES[upperCode] || upperCode;
}

/**
 * Return leg info for roundtrip flights
 */
export interface ReturnLegInfo {
  departureTime: string;
  arrivalTime: string;
  originIata: string;
  destinationIata: string;
  duration: string;
  durationMinutes: number;
  stops: number;
  stopAirports: string[];
}

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

  // Route info (outbound)
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

  // Return leg (for roundtrip)
  returnLeg?: ReturnLegInfo;

  // Price
  price: number;
  currency: string;
  
  // Deals count - number of providers offering this itinerary
  dealsCount: number;
  
  // Price confidence - used to determine if price should be trusted
  isPriceValid: boolean; // true if price > 0 and is finite
  
  // Booking metadata - required for click action
  searchId: string;
  resultsUrl: string;
  proposalId: string;
  signature: string;

  // Validity flag - true when all booking metadata is present AND URL is valid
  hasValidBookingUrl: boolean;
}

/**
 * Validate a price value
 * Returns true only if price is a finite positive number
 */
export function isValidPrice(price: unknown): price is number {
  return typeof price === 'number' && 
         Number.isFinite(price) && 
         price > 0 && 
         !Number.isNaN(price);
}

/**
 * Validate a booking URL
 * Must exist and start with http:// or https://
 */
export function isValidBookingUrl(url: unknown): url is string {
  if (typeof url !== 'string' || !url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Calculate price confidence score for sorting
 * Returns a penalty to add to the sort score if price is unreliable
 * Stale or invalid prices get deprioritized slightly
 */
export function getPriceConfidencePenalty(
  flight: NormalizedFlight,
  fetchedAt?: number,
  staleThresholdMs: number = 120000 // 2 minutes
): number {
  let penalty = 0;
  
  // Invalid price = big penalty
  if (!flight.isPriceValid) {
    penalty += 10000;
  }
  
  // No valid booking URL = medium penalty
  if (!flight.hasValidBookingUrl) {
    penalty += 5000;
  }
  
  // Stale price = small penalty
  if (fetchedAt && Date.now() - fetchedAt > staleThresholdMs) {
    penalty += 500;
  }
  
  return penalty;
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
 * Parse return leg from a ticket (second segment for roundtrip)
 */
function parseReturnLeg(
  ticket: Ticket,
  flightInfoMap: FlightInfoMap
): ReturnLegInfo | undefined {
  const segments = ticket.segments;
  if (!Array.isArray(segments) || segments.length < 2) {
    return undefined; // One-way or no return segment
  }

  const returnSegment = segments[1];
  const returnFlights = returnSegment?.flights;
  
  if (!Array.isArray(returnFlights) || returnFlights.length === 0) {
    return undefined;
  }

  const firstFlightIdx = returnFlights[0];
  const lastFlightIdx = returnFlights[returnFlights.length - 1];
  
  const firstFlightInfo = firstFlightIdx !== undefined ? flightInfoMap[firstFlightIdx] : undefined;
  const lastFlightInfo = lastFlightIdx !== undefined ? flightInfoMap[lastFlightIdx] : undefined;

  // Return leg origin/destination
  const originIata = (firstFlightInfo?.departure || "").toUpperCase();
  const destinationIata = (lastFlightInfo?.arrival || "").toUpperCase();
  
  // Times - formatTime now returns empty string for invalid timestamps
  const departureTime = firstFlightInfo?.departureTime || "";
  const arrivalTime = lastFlightInfo?.arrivalTime || "";

  // Stops
  const stops = Math.max(0, returnFlights.length - 1);
  
  // Stop airports
  const stopAirports: string[] = [];
  if (returnFlights.length > 2) {
    for (let i = 1; i < returnFlights.length - 1; i++) {
      const stopInfo = flightInfoMap[returnFlights[i]];
      if (stopInfo?.departure) {
        stopAirports.push(stopInfo.departure.toUpperCase());
      }
    }
  } else if (returnFlights.length === 2) {
    const stopInfo = flightInfoMap[returnFlights[0]];
    if (stopInfo?.arrival) {
      stopAirports.push(stopInfo.arrival.toUpperCase());
    }
  }

  // Duration
  let totalDuration = 0;
  for (const flightIdx of returnFlights) {
    const info = flightInfoMap[flightIdx];
    if (info?.duration) totalDuration += info.duration;
  }
  const durationText = totalDuration > 0 ? formatDuration(totalDuration) : "";

  return {
    departureTime,
    arrivalTime,
    originIata,
    destinationIata,
    duration: durationText,
    durationMinutes: totalDuration,
    stops,
    stopAirports,
  };
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

  // Times - formatTime now returns empty string for invalid timestamps
  const departureTime = firstFlightInfo?.departureTime || "";
  const arrivalTime = lastFlightInfo?.arrivalTime || "";

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

    // Get raw price value - DO NOT convert, trust backend
    const rawPrice = proposal.price_per_person?.value ?? proposal.price?.value ?? 0;
    const priceValue = typeof rawPrice === 'number' ? rawPrice : Number(rawPrice) || 0;
    
    // Validate price using our helper
    const isPriceValid = isValidPrice(priceValue);
    
    // Skip flights with completely invalid prices (0 or negative)
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
    const upperCarrierCode = carrierCode.toUpperCase();

    // Validate booking metadata - all fields must be non-empty strings
    const hasValidBooking = Boolean(
      searchId && 
      typeof searchId === "string" && 
      searchId.length > 0 &&
      resultsUrl && 
      typeof resultsUrl === "string" && 
      resultsUrl.length > 0 &&
      proposal.id && 
      typeof proposal.id === "string" &&
      ticket.signature && 
      typeof ticket.signature === "string"
    );

    results.push({
      id,
      airlineCode: upperCarrierCode,
      airlineName: getAirlineName(upperCarrierCode),
      airlineLogo:
        upperCarrierCode && upperCarrierCode !== "XX"
          ? `https://pics.avs.io/60/60/${upperCarrierCode}.png`
          : "",
      flightNumber: flightNumber ? `${upperCarrierCode}${flightNumber}` : "",
      originIata,
      destinationIata,
      departureTime,
      arrivalTime,
      duration: durationText,
      durationMinutes: totalDuration,
      stops,
      stopAirports,
      // Return leg - parsed from second segment if roundtrip
      returnLeg: parseReturnLeg(ticket, flightInfoMap),
      // Round to 0 decimals like Skyscanner - only once, no double conversion
      price: Math.round(priceValue),
      currency: proposal.price_per_person?.currency_code || proposal.price?.currency_code || "EUR",
      // Deals count - number of proposals for this ticket
      dealsCount: proposals.length,
      isPriceValid,
      searchId,
      resultsUrl,
      proposalId: proposal.id,
      signature: ticket.signature,
      hasValidBookingUrl: hasValidBooking,
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
 * Optionally takes fetchedAt to factor in price freshness
 */
export function sortFlights(
  flights: NormalizedFlight[],
  sortBy: "best" | "cheapest" | "fastest",
  fetchedAt?: number
): NormalizedFlight[] {
  const sorted = [...flights];

  switch (sortBy) {
    case "cheapest":
      sorted.sort((a, b) => {
        // Valid prices first, then by price
        if (a.isPriceValid !== b.isPriceValid) {
          return a.isPriceValid ? -1 : 1;
        }
        return a.price - b.price;
      });
      break;
    case "fastest":
      sorted.sort((a, b) => a.durationMinutes - b.durationMinutes);
      break;
    case "best":
    default:
      // Weighted score: price + stops penalty + duration penalty + confidence penalty
      sorted.sort((a, b) => {
        const penaltyA = getPriceConfidencePenalty(a, fetchedAt);
        const penaltyB = getPriceConfidencePenalty(b, fetchedAt);
        const scoreA = a.price + a.stops * 80 + a.durationMinutes * 0.5 + penaltyA;
        const scoreB = b.price + b.stops * 80 + b.durationMinutes * 0.5 + penaltyB;
        return scoreA - scoreB;
      });
      break;
  }

  return sorted;
}

/**
 * Check if a flight is eligible to be "Best Value"
 * Must have valid price, valid booking URL, and not be stale
 */
export function isEligibleForBestValue(
  flight: NormalizedFlight,
  fetchedAt?: number,
  staleThresholdMs: number = 120000
): boolean {
  // Must have valid price
  if (!flight.isPriceValid || flight.price <= 0) return false;
  
  // Must have valid booking URL metadata
  if (!flight.hasValidBookingUrl) return false;
  
  // Must not be stale
  if (fetchedAt && Date.now() - fetchedAt > staleThresholdMs) return false;
  
  return true;
}

/**
 * Get summary stats for the flight list
 * Only considers flights with valid prices for "best" calculation
 */
export function getFlightStats(flights: NormalizedFlight[], fetchedAt?: number) {
  if (flights.length === 0) return null;

  // Filter to only valid-priced flights for cheapest calculation
  const validPriceFlights = flights.filter(f => f.isPriceValid && f.price > 0);
  
  // If no valid prices, use all flights but mark as uncertain
  const priceFlights = validPriceFlights.length > 0 ? validPriceFlights : flights;

  const cheapest = priceFlights.reduce((min, f) => (f.price < min.price ? f : min), priceFlights[0]);
  const fastest = flights.reduce(
    (min, f) => (f.durationMinutes < min.durationMinutes ? f : min),
    flights[0]
  );

  // Best uses weighted score with confidence penalty
  const eligibleForBest = flights.filter(f => isEligibleForBestValue(f, fetchedAt));
  const bestCandidates = eligibleForBest.length > 0 ? eligibleForBest : priceFlights;
  
  const best = bestCandidates.reduce((best, f) => {
    const penaltyA = getPriceConfidencePenalty(f, fetchedAt);
    const penaltyB = getPriceConfidencePenalty(best, fetchedAt);
    const scoreA = f.price + f.stops * 80 + f.durationMinutes * 0.5 + penaltyA;
    const scoreB = best.price + best.stops * 80 + best.durationMinutes * 0.5 + penaltyB;
    return scoreA < scoreB ? f : best;
  }, bestCandidates[0]);

  return { 
    cheapest, 
    fastest, 
    best,
    hasValidPrices: validPriceFlights.length > 0 
  };
}
