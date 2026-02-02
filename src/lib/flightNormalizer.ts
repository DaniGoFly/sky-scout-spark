/**
 * Flight Data Normalizer
 * Converts raw API responses into clean, UI-ready flight objects.
 * This is the ONLY source of truth for what the UI renders.
 */

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
  U2: "easyJet",
  FR: "Ryanair",
  W6: "Wizz Air",
  VY: "Vueling",
  FI: "Icelandair",
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

  // Times (empty string if unavailable - UI will show "—")
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

// =============================
// FLIGHT INFO EXTRACTION HELPERS
// =============================

/**
 * Raw flight info from Travelpayouts API
 * Supports multiple field naming conventions
 * Travelpayouts returns flight_info as an object keyed by numeric flight IDs
 * Each entry contains: departure, arrival, departure_timestamp, arrival_timestamp, duration, operating_carrier
 */
interface RawFlightInfo {
  // IATA codes - Travelpayouts uses "departure" for origin airport, "arrival" for destination
  departure?: string;
  arrival?: string;
  origin?: string;
  destination?: string;
  
  // Timestamps - Travelpayouts uses Unix seconds in departure_timestamp/arrival_timestamp
  departure_at?: string | number;
  arrival_at?: string | number;
  departureAt?: string | number;
  arrivalAt?: string | number;
  departure_timestamp?: number;  // PRIMARY: Unix seconds from Travelpayouts
  arrival_timestamp?: number;    // PRIMARY: Unix seconds from Travelpayouts
  dep_time?: string | number;
  arr_time?: string | number;
  
  // Duration in minutes - Travelpayouts provides this directly
  duration?: number;
  
  // Airline info - Travelpayouts uses operating_carrier
  operating_carrier?: string;  // PRIMARY: e.g., "LH", "UA"
  marketing_carrier?: string;
  airline?: string;
  carrier?: string;
  
  // Flight number
  flight_number?: string | number;
  number?: string | number;
}

/**
 * Resolved leg data from flight IDs
 */
interface ResolvedLeg {
  departAt: string;
  arriveAt: string;
  origin: string;
  destination: string;
  durationMins: number;
  stopAirports: string[];
  stopCount: number;
  marketingCarrier: string;
  flightNumber: string;
}

/**
 * Extract flight_info map from ANY response shape
 * The Travelpayouts API returns flight_info as an object where:
 * - Keys are numeric IDs (matching ticket.segments[].flights[])
 * - Values contain departure, arrival, departure_timestamp, arrival_timestamp, duration, operating_carrier
 * 
 * We also check multiple possible locations:
 * - response.flight_info (PRIMARY from Travelpayouts)
 * - response.flightInfo
 * - response.flights
 * - response.data.flight_info
 * - response.data.flights
 */
export function getFlightInfoMap(raw: unknown): Record<string, RawFlightInfo> {
  if (!raw || typeof raw !== 'object') return {};
  
  const DEV_MODE = import.meta.env.DEV;
  const r = raw as Record<string, unknown>;
  const data = r.data as Record<string, unknown> | undefined;
  
  // Try all possible locations in order of preference
  // Travelpayouts uses flight_info as an object keyed by flight IDs
  let flightInfo: unknown = 
    r.flight_info ||
    r.flightInfo ||
    r.flights ||
    data?.flight_info ||
    data?.flightInfo ||
    data?.flights ||
    null;
  
  if (DEV_MODE) {
    console.log("[getFlightInfoMap] Checking locations:", {
      "r.flight_info": r.flight_info ? "found" : "missing",
      "r.flightInfo": r.flightInfo ? "found" : "missing", 
      "r.flights": r.flights ? "found" : "missing",
      "data?.flight_info": data?.flight_info ? "found" : "missing",
    });
  }
  
  // If flights is an array, convert to object keyed by index
  if (Array.isArray(flightInfo)) {
    const map: Record<string, RawFlightInfo> = {};
    flightInfo.forEach((f, idx) => {
      if (f && typeof f === 'object') {
        // Use flight's id if available, otherwise use index
        const key = f.id !== undefined ? String(f.id) : String(idx);
        map[key] = f as RawFlightInfo;
      }
    });
    if (DEV_MODE) {
      console.log(`[getFlightInfoMap] Converted array of ${flightInfo.length} flights to map`);
    }
    return map;
  }
  
  if (typeof flightInfo !== 'object' || flightInfo === null) {
    if (DEV_MODE) {
      console.warn("[getFlightInfoMap] No valid flight_info found in response");
    }
    return {};
  }
  
  // flight_info is already an object (Travelpayouts format)
  const result = flightInfo as Record<string, RawFlightInfo>;
  if (DEV_MODE) {
    const keys = Object.keys(result);
    console.log(`[getFlightInfoMap] Found flight_info object with ${keys.length} entries`);
    if (keys.length > 0) {
      const sampleKey = keys[0];
      const sample = result[sampleKey];
      console.log(`[getFlightInfoMap] Sample entry [${sampleKey}]:`, {
        departure: sample?.departure,
        arrival: sample?.arrival,
        departure_timestamp: sample?.departure_timestamp,
        arrival_timestamp: sample?.arrival_timestamp,
        duration: sample?.duration,
        operating_carrier: sample?.operating_carrier,
      });
    }
  }
  
  return result;
}

/**
 * Parse a timestamp to a Date object
 * Handles ISO strings, Unix seconds, and Unix milliseconds
 */
function parseTimestamp(value: string | number | undefined): Date | null {
  if (value === undefined || value === null || value === '') return null;
  
  try {
    if (typeof value === 'string') {
      // ISO string like "2026-03-03T06:50:00"
      const date = new Date(value);
      if (!isNaN(date.getTime())) return date;
      return null;
    }
    
    if (typeof value === 'number') {
      // Unix seconds (10 digits) vs milliseconds (13 digits)
      const ts = value < 10000000000 ? value * 1000 : value;
      const date = new Date(ts);
      if (!isNaN(date.getTime())) return date;
      return null;
    }
  } catch {
    return null;
  }
  
  return null;
}

/**
 * Format a Date to "6:50 AM" style
 */
function formatTimeFromDate(date: Date | null): string {
  if (!date) return "";
  try {
    return date.toLocaleTimeString("en-US", { 
      hour: "numeric", 
      minute: "2-digit", 
      hour12: true 
    });
  } catch {
    return "";
  }
}

/**
 * Format duration in minutes to "Xh Ym"
 */
function formatDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/**
 * Get departure timestamp from a flight info object
 * Travelpayouts returns Unix seconds in departure_timestamp field
 */
function getDepartureDate(info: RawFlightInfo): Date | null {
  // Priority: departure_timestamp (Travelpayouts) > other formats
  return (
    parseTimestamp(info.departure_timestamp) ||
    parseTimestamp(info.departure_at) ||
    parseTimestamp(info.departureAt) ||
    parseTimestamp(info.dep_time) ||
    null
  );
}

/**
 * Get arrival timestamp from a flight info object
 * Travelpayouts returns Unix seconds in arrival_timestamp field
 */
function getArrivalDate(info: RawFlightInfo): Date | null {
  // Priority: arrival_timestamp (Travelpayouts) > other formats
  return (
    parseTimestamp(info.arrival_timestamp) ||
    parseTimestamp(info.arrival_at) ||
    parseTimestamp(info.arrivalAt) ||
    parseTimestamp(info.arr_time) ||
    null
  );
}

/**
 * Get origin IATA from a flight info object
 */
function getOriginIata(info: RawFlightInfo): string {
  const code = info.departure || info.origin || "";
  return typeof code === 'string' ? code.toUpperCase() : "";
}

/**
 * Get destination IATA from a flight info object
 */
function getDestinationIata(info: RawFlightInfo): string {
  const code = info.arrival || info.destination || "";
  return typeof code === 'string' ? code.toUpperCase() : "";
}

/**
 * Get airline code from a flight info object
 */
function getAirlineCode(info: RawFlightInfo): string {
  const code = info.operating_carrier || info.marketing_carrier || info.airline || info.carrier || "";
  return typeof code === 'string' ? code.toUpperCase() : "";
}

/**
 * Get flight number from a flight info object
 */
function getFlightNumber(info: RawFlightInfo): string {
  const num = info.flight_number || info.number || "";
  return String(num);
}

/**
 * Resolve flight IDs to actual leg data
 * This is the CORE function that extracts times from flight_info
 * 
 * Travelpayouts format:
 * - ticket.segments[0].flights = [123, 456, 789] (array of numeric flight IDs)
 * - flight_info = { "123": { departure: "ZRH", arrival: "FRA", departure_timestamp: 1234567890, ... }, ... }
 */
export function resolveFlightLegFromIds(
  flightIds: unknown[],
  flightInfo: Record<string, RawFlightInfo>
): ResolvedLeg {
  const DEV_MODE = import.meta.env.DEV;
  
  // Default empty result
  const empty: ResolvedLeg = {
    departAt: "",
    arriveAt: "",
    origin: "",
    destination: "",
    durationMins: 0,
    stopAirports: [],
    stopCount: 0,
    marketingCarrier: "",
    flightNumber: "",
  };
  
  // Must have valid flight IDs
  if (!Array.isArray(flightIds) || flightIds.length === 0) {
    if (DEV_MODE) console.log("[resolveFlightLeg] No flight IDs provided");
    return empty;
  }
  
  // Check if flight_info map is available
  const flightInfoKeys = Object.keys(flightInfo);
  if (flightInfoKeys.length === 0) {
    if (DEV_MODE) console.warn("[resolveFlightLeg] ⚠️ flight_info map is empty - cannot resolve times");
    return empty;
  }
  
  // Resolve each flight ID to its info object
  const resolvedFlights: RawFlightInfo[] = [];
  for (const id of flightIds) {
    const key = String(id);
    const info = flightInfo[key];
    if (info && typeof info === 'object') {
      resolvedFlights.push(info);
    } else if (DEV_MODE) {
      console.warn(`[resolveFlightLeg] Could not find flight_info for ID: ${key}`);
    }
  }
  
  if (resolvedFlights.length === 0) {
    if (DEV_MODE) {
      console.warn("[resolveFlightLeg] ⚠️ No flights resolved from IDs:", flightIds);
      console.warn("[resolveFlightLeg] Available flight_info keys:", flightInfoKeys.slice(0, 10));
    }
    return empty;
  }
  
  if (DEV_MODE) {
    console.log(`[resolveFlightLeg] Resolved ${resolvedFlights.length} flights from ${flightIds.length} IDs`);
  }
  
  // First and last flights for this leg
  const firstFlight = resolvedFlights[0];
  const lastFlight = resolvedFlights[resolvedFlights.length - 1];
  
  // Departure = first flight's departure
  const departDate = getDepartureDate(firstFlight);
  const departAt = formatTimeFromDate(departDate);
  
  // Arrival = last flight's arrival
  const arriveDate = getArrivalDate(lastFlight);
  const arriveAt = formatTimeFromDate(arriveDate);
  
  // Origin = first flight's origin (Travelpayouts uses "departure" for origin IATA)
  const origin = getOriginIata(firstFlight);
  
  // Destination = last flight's destination (Travelpayouts uses "arrival" for destination IATA)
  const destination = getDestinationIata(lastFlight);
  
  // Duration: sum individual durations or compute from timestamps
  let durationMins = 0;
  for (const info of resolvedFlights) {
    if (typeof info.duration === 'number' && info.duration > 0) {
      durationMins += info.duration;
    }
  }
  // If no duration fields, compute from timestamps
  if (durationMins === 0 && departDate && arriveDate) {
    const diffMs = arriveDate.getTime() - departDate.getTime();
    if (diffMs > 0) {
      durationMins = Math.round(diffMs / 60000);
    }
  }
  
  // Stop airports: destinations of all flights except the last
  const stopAirports: string[] = [];
  for (let i = 0; i < resolvedFlights.length - 1; i++) {
    const stopIata = getDestinationIata(resolvedFlights[i]);
    if (stopIata) {
      stopAirports.push(stopIata);
    }
  }
  
  // Stop count
  const stopCount = stopAirports.length;
  
  // Marketing carrier from first flight (Travelpayouts uses operating_carrier)
  const marketingCarrier = getAirlineCode(firstFlight);
  
  // Flight number from first flight
  const flightNumber = getFlightNumber(firstFlight);
  
  if (DEV_MODE) {
    console.log("[resolveFlightLeg] Resolved leg:", {
      origin,
      destination,
      departAt,
      arriveAt,
      durationMins,
      stops: stopCount,
      stopAirports,
      carrier: marketingCarrier,
    });
  }
  
  return {
    departAt,
    arriveAt,
    origin,
    destination,
    durationMins,
    stopAirports,
    stopCount,
    marketingCarrier,
    flightNumber,
  };
}

// =============================
// TICKET NORMALIZATION
// =============================

/**
 * Ticket from the API
 */
interface Ticket {
  signature: string;
  segments?: Array<{
    flights?: number[];
    transfers?: Array<{ recheck_baggage?: boolean; night_transfer?: boolean }>;
  }>;
  proposals?: Array<{
    id?: string;
    price?: { currency_code?: string; value?: number };
    price_per_person?: { currency_code?: string; value?: number };
    agent_id?: number;
    flight_terms?: Record<string, {
      marketing_carrier_designator?: {
        carrier?: string;
        number?: string;
      };
    }>;
  }>;
}

/**
 * Normalize a single ticket into NormalizedFlight objects
 */
function normalizeTicket(
  ticket: Ticket,
  flightInfo: Record<string, RawFlightInfo>,
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

  // Get segments
  const segments = ticket.segments;
  const outboundSegment = Array.isArray(segments) && segments.length > 0 ? segments[0] : null;
  const returnSegment = Array.isArray(segments) && segments.length > 1 ? segments[1] : null;
  
  // Resolve OUTBOUND leg from flight IDs
  const outboundFlightIds = outboundSegment?.flights || [];
  const outboundLeg = resolveFlightLegFromIds(outboundFlightIds, flightInfo);
  
  // Use resolved values or fall back to defaults
  const originIata = outboundLeg.origin || defaultOrigin.toUpperCase();
  const destinationIata = outboundLeg.destination || defaultDestination.toUpperCase();
  const departureTime = outboundLeg.departAt;
  const arrivalTime = outboundLeg.arriveAt;
  const stops = outboundLeg.stopCount;
  const stopAirports = outboundLeg.stopAirports;
  const totalDuration = outboundLeg.durationMins;
  const durationText = formatDuration(totalDuration);
  const marketingCarrier = outboundLeg.marketingCarrier;
  const flightNum = outboundLeg.flightNumber;
  
  // Resolve RETURN leg if roundtrip
  let returnLeg: ReturnLegInfo | undefined;
  if (returnSegment) {
    const returnFlightIds = returnSegment.flights || [];
    const resolvedReturn = resolveFlightLegFromIds(returnFlightIds, flightInfo);
    
    if (resolvedReturn.origin || resolvedReturn.departAt) {
      returnLeg = {
        departureTime: resolvedReturn.departAt,
        arrivalTime: resolvedReturn.arriveAt,
        originIata: resolvedReturn.origin || destinationIata,
        destinationIata: resolvedReturn.destination || originIata,
        duration: formatDuration(resolvedReturn.durationMins),
        durationMinutes: resolvedReturn.durationMins,
        stops: resolvedReturn.stopCount,
        stopAirports: resolvedReturn.stopAirports,
      };
    }
  }

  // Process each proposal
  for (const proposal of proposals) {
    if (!proposal || typeof proposal !== "object") continue;
    if (!proposal.id) continue;

    // Get raw price value
    const rawPrice = proposal.price_per_person?.value ?? proposal.price?.value ?? 0;
    const priceValue = typeof rawPrice === 'number' ? rawPrice : Number(rawPrice) || 0;
    
    // Validate price
    const isPriceValid = isValidPrice(priceValue);
    
    // Skip flights with completely invalid prices (0 or negative)
    if (priceValue <= 0) continue;

    // Get airline from flight terms or resolved leg
    const flightTerms = proposal.flight_terms;
    const flightTermKeys = flightTerms && typeof flightTerms === "object" ? Object.keys(flightTerms) : [];
    const firstTermKey = flightTermKeys[0];
    const firstTerm = firstTermKey ? flightTerms?.[firstTermKey] : undefined;

    const carrierCode =
      firstTerm?.marketing_carrier_designator?.carrier ||
      marketingCarrier ||
      "XX";
    const flightNumber = firstTerm?.marketing_carrier_designator?.number || flightNum;

    const id = `${proposal.id}-${ticket.signature}`;
    const upperCarrierCode = carrierCode.toUpperCase();

    // Validate booking metadata
    const hasValidBooking = Boolean(
      searchId && typeof searchId === "string" && searchId.length > 0 &&
      resultsUrl && typeof resultsUrl === "string" && resultsUrl.length > 0 &&
      proposal.id && typeof proposal.id === "string" &&
      ticket.signature && typeof ticket.signature === "string"
    );

    results.push({
      id,
      airlineCode: upperCarrierCode,
      airlineName: getAirlineName(upperCarrierCode),
      airlineLogo: upperCarrierCode && upperCarrierCode !== "XX"
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
      returnLeg,
      price: Math.round(priceValue),
      currency: proposal.price_per_person?.currency_code || proposal.price?.currency_code || "EUR",
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
 * Normalize all flights from a RAW API response
 * This is the main entry point - pass the FULL raw response
 */
export function normalizeFlightsFromResponse(
  rawResponse: unknown,
  searchId: string,
  resultsUrl: string,
  defaultOrigin: string,
  defaultDestination: string
): NormalizedFlight[] {
  const DEV_MODE = import.meta.env.DEV;
  
  if (!rawResponse || typeof rawResponse !== 'object') {
    if (DEV_MODE) console.warn("[Normalizer] Invalid response - not an object");
    return [];
  }
  
  const response = rawResponse as Record<string, unknown>;
  
  // DEV: Log available keys in response to help debug
  if (DEV_MODE) {
    const keys = Object.keys(response);
    console.log("[Normalizer] Response keys:", keys);
    
    // Check for flight_info/flights presence
    const hasFlightInfo = 'flight_info' in response || 'flightInfo' in response;
    const hasFlights = 'flights' in response;
    const hasData = 'data' in response;
    
    if (!hasFlightInfo && !hasFlights) {
      console.warn("[Normalizer] ⚠️ WARNING: No flight_info or flights in response! Times will be missing.");
      console.warn("[Normalizer] Available keys:", keys);
      if (hasData && typeof response.data === 'object') {
        console.warn("[Normalizer] data keys:", Object.keys(response.data as object));
      }
    }
  }
  
  // Extract tickets array
  const tickets = response.tickets as Ticket[] | undefined;
  if (!Array.isArray(tickets) || tickets.length === 0) {
    if (DEV_MODE) console.warn("[Normalizer] No tickets array in response");
    return [];
  }
  
  // Extract flight_info map from ALL possible locations
  const flightInfo = getFlightInfoMap(rawResponse);
  const flightInfoCount = Object.keys(flightInfo).length;
  
  if (flightInfoCount === 0) {
    if (DEV_MODE) {
      console.warn("[Normalizer] ⚠️ CRITICAL: flight_info map is EMPTY - cannot resolve flight times!");
      console.warn("[Normalizer] Tickets will have missing departure/arrival times.");
    }
  } else if (DEV_MODE) {
    console.log(`[Normalizer] ✓ Found ${flightInfoCount} flight_info entries`);
    // Log sample flight_info entry
    const sampleKey = Object.keys(flightInfo)[0];
    console.log("[Normalizer] Sample flight_info entry:", sampleKey, flightInfo[sampleKey]);
  }
  
  // Normalize all tickets
  const allFlights: NormalizedFlight[] = [];
  
  for (const ticket of tickets) {
    const normalized = normalizeTicket(
      ticket,
      flightInfo,
      searchId,
      resultsUrl,
      defaultOrigin,
      defaultDestination
    );
    allFlights.push(...normalized);
  }
  
  console.log(`[Normalizer] Normalized ${allFlights.length} flights from ${tickets.length} tickets`);
  
  // DEV ONLY: Log sample normalized flight
  if (import.meta.env.DEV && allFlights.length > 0) {
    const sample = allFlights[0];
    console.log("normalized sample flight", {
      id: sample.id,
      originIata: sample.originIata,
      destinationIata: sample.destinationIata,
      departureTime: sample.departureTime || "—",
      arrivalTime: sample.arrivalTime || "—",
      duration: sample.duration || "—",
      durationMinutes: sample.durationMinutes,
      stops: sample.stops,
      stopAirports: sample.stopAirports,
      returnLeg: sample.returnLeg ? {
        originIata: sample.returnLeg.originIata,
        destinationIata: sample.returnLeg.destinationIata,
        departureTime: sample.returnLeg.departureTime || "—",
        arrivalTime: sample.returnLeg.arrivalTime || "—",
        duration: sample.returnLeg.duration || "—",
        stops: sample.returnLeg.stops,
        stopAirports: sample.returnLeg.stopAirports,
      } : null,
      airlineName: sample.airlineName,
      price: sample.price,
    });
  }
  
  return allFlights;
}

// =============================
// SORTING & STATS
// =============================

/**
 * Sort flights by different criteria
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
 */
export function isEligibleForBestValue(
  flight: NormalizedFlight,
  fetchedAt?: number,
  staleThresholdMs: number = 120000
): boolean {
  if (!flight.isPriceValid || flight.price <= 0) return false;
  if (!flight.hasValidBookingUrl) return false;
  if (fetchedAt && Date.now() - fetchedAt > staleThresholdMs) return false;
  return true;
}

/**
 * Get summary stats for the flight list
 */
export function getFlightStats(flights: NormalizedFlight[], fetchedAt?: number) {
  if (flights.length === 0) return null;

  const validPriceFlights = flights.filter(f => f.isPriceValid && f.price > 0);
  const priceFlights = validPriceFlights.length > 0 ? validPriceFlights : flights;

  const cheapest = priceFlights.reduce((min, f) => (f.price < min.price ? f : min), priceFlights[0]);
  const fastest = flights.reduce(
    (min, f) => (f.durationMinutes < min.durationMinutes ? f : min),
    flights[0]
  );

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
