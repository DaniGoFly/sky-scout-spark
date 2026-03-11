/**
 * Flight Data Types & Helpers
 * 
 * This module defines the flight data structure that matches the backend response.
 * The backend returns pre-normalized data - NO transformation needed.
 */

// BACKWARDS COMPATIBILITY: Export type alias for legacy components
export type NormalizedFlight = Flight;

/**
 * Check if a flight is eligible to be "Best Value"
 * Backwards compatible function for legacy components
 */
export function isEligibleForBestValue(flight: Flight): boolean {
  return hasValidBookingUrl(flight) && flight.price.amount > 0;
}

/**
 * Return leg info for roundtrip flights (from backend)
 */
export interface ReturnLegInfo {
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  stopsCount: number;
  stopsAirports: string[];
  airlines: string[];
  flightNumbers: string[];
  /** Human-readable stop label from backend or enrichment */
  stopLabel?: string;
  /** Total layover wait time across all connections (minutes) */
  totalLayoverMinutes?: number;
}

/**
 * Flight object - matches backend response exactly
 */
export interface Flight {
  id: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  stopsCount: number;
  stopsAirports: string[];
  airlines: string[];
  flightNumbers: string[];
  price: {
    amount: number;
    currency: string;
  };
  /** Human-readable stop label from backend ("Direct", "1 stop", "2+ stops") */
  stopLabel?: string;
  /** Total layover wait time across all connections (minutes) */
  totalLayoverMinutes?: number;
  /**
   * May be present for backwards compatibility.
   * IMPORTANT: this can be a Travelpayouts click endpoint (JSON), so it must NOT be used as a booking href.
   */
  clickUrl?: string;
  proposalId?: string;
  /** Identifier used to resolve the deal server-side (alias of proposalId in current backend) */
  clickId?: string;
  /** Search context required for resolving clickId */
  searchId?: string;
  resultsBase?: string;
  /** snake_case aliases for compatibility with backend responses */
  click_id?: string;
  search_id?: string;
  results_base?: string;
  /** Final external partner URL (must start with http(s)) */
  bookingUrl?: string;
  /** snake_case alias for compatibility with backend responses */
  booking_url?: string;
  return?: ReturnLegInfo;
}

export function isHttpUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  return url.startsWith("http://") || url.startsWith("https://");
}

export function isTravelpayoutsClickUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return lower.includes("travelpayouts.com/searches/") && lower.includes("/clicks/");
}

export function getFlightClickId(flight: Flight): string {
  const anyFlight = flight as any;
  return (
    anyFlight.click_id ||
    anyFlight.str_click_id ||
    anyFlight.clickId ||
    flight.clickId ||
    flight.proposalId ||
    ""
  );
}

/**
 * Get the booking URL from a flight object.
 * Priority: clickUrl (primary from API) -> booking_url -> deeplink -> url -> link
 * Only returns URLs that start with http:// or https://
 */
export function getFlightBookingUrl(flight: Flight): string {
  const anyFlight = flight as any;
  
  // Check candidates in priority order
  const candidates = [
    flight.clickUrl,           // Primary from API (camelCase)
    anyFlight.click_url,       // snake_case variant
    flight.bookingUrl,         // camelCase
    anyFlight.booking_url,     // snake_case
    anyFlight.deeplink,        // deeplink
    anyFlight.deep_link,       // snake_case deeplink
    anyFlight.deepLink,        // camelCase deeplink
    anyFlight.url,             // generic url
    anyFlight.link,            // generic link
  ];
  
  for (const url of candidates) {
    if (isHttpUrl(url)) {
      return url;
    }
  }
  
  return "";
}

/**
 * Common airline code to name mapping
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
export function getAirlineName(code: string): string {
  const upperCode = code?.toUpperCase() || "";
  return AIRLINE_NAMES[upperCode] || upperCode;
}

/**
 * Format duration in minutes to "Xh Ym"
 */
export function formatDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/**
 * Robust stop count resolver.
 * Returns null when stops data is genuinely missing — never defaults to 0 (Direct).
 *
 * Priority:
 *  1. Explicit stopsCount field (number)
 *  2. stops array length
 *  3. segments array: segments.length - 1
 *  4. null → UNKNOWN
 */
export function getStopsCount(leg: Record<string, any>): number | null {
  if (!leg) return null;

  // -1 is used as a sentinel for "unknown" from the enrichment fallback path
  const explicit =
    leg.stopsCount ?? leg.stops_count ?? leg.transfers ?? leg.numberOfStops;
  if (typeof explicit === "number" && Number.isFinite(explicit)) {
    if (explicit < 0) return null; // -1 sentinel → unknown
    return explicit; // trust the explicit field (edge fn computes allLegs.length-1)
  }

  // 2. stops array (rare)
  if (Array.isArray(leg.stops) && leg.stops.length >= 0) {
    return Math.max(0, leg.stops.length);
  }

  // 3. segments array: primary source of truth — segments.length - 1
  const segs =
    leg.segments ||
    leg.segment ||
    leg.itineraries?.[0]?.segments;
  if (Array.isArray(segs) && segs.length > 0) {
    return Math.max(0, segs.length - 1);
  }

  return null; // genuinely unknown
}

/**
 * Readable label from a nullable stops count.
 * Never returns "Direct" when stopsCount is null.
 * Safety rule: duration > 600 min (10h) with null stops → "Stops unknown".
 */
export function stopsLabel(
  stopsCount: number | null,
  durationMinutes?: number,
  stopsAirports?: string[]
): string {
  if (stopsCount === null || stopsCount < 0) {
    // Safety: long flights should never silently claim "Direct"
    if (durationMinutes && durationMinutes > 600) return "Stops unknown";
    return "Stops unknown";
  }

  const airports = (stopsAirports || []).filter(
    (s) => s && s !== "undefined" && s !== "null" && s.trim() !== ""
  );

  if (stopsCount === 0) return "Direct";
  if (stopsCount === 1) {
    const extra = airports.length > 0 ? ` · ${airports[0]}` : "";
    return `1 stop${extra}`;
  }
  const shown = airports.slice(0, 2).join(", ");
  const overflow = airports.length > 2 ? ` +${airports.length - 2}` : "";
  const extra = shown ? ` · ${shown}${overflow}` : "";
  return `2+ stops${extra}`;
}

/**
 * Get stops label for display (legacy — kept for backwards compat)
 */
export function getStopsLabel(stopsCount: number, stopsAirports: string[]): string {
  if (stopsCount === 0) return "Direct";
  
  const validStops = (stopsAirports || []).filter(
    (s) => s && s !== "undefined" && s !== "null" && s.trim() !== ""
  );
  
  if (stopsCount === 1) {
    const stopInfo = validStops.length > 0 ? ` · ${validStops[0]}` : "";
    return `1 stop${stopInfo}`;
  }
  
  // 2+ stops: show codes
  const displayedStops = validStops.slice(0, 2).join(", ");
  const extraCount = validStops.length > 2 ? ` +${validStops.length - 2}` : "";
  const stopInfo = displayedStops ? ` · ${displayedStops}${extraCount}` : "";
  return `${stopsCount} stops${stopInfo}`;
}

/**
 * Format price for display
 */
export function formatPrice(amount: number, currency: string): string {
  const symbols: Record<string, string> = { EUR: "€", USD: "$", GBP: "£", CHF: "CHF " };
  const symbol = symbols[currency] || (currency ? currency + " " : "$");
  return `${symbol}${Math.round(amount).toLocaleString()}`;
}

/**
 * Get airline logo URL
 */
export function getAirlineLogo(airlineCode: string): string {
  if (!airlineCode) return "";
  return `https://pics.avs.io/60/60/${airlineCode.toUpperCase()}.png`;
}

/**
 * Check if a flight has a valid booking URL
 */
export function hasValidBookingUrl(flight: Flight): boolean {
  return Boolean(getFlightBookingUrl(flight));
}

/**
 * Sanity-check and fix price that may be in minor units (cents).
 * If an economy-class price looks > 50000, assume it's in cents and divide by 100.
 * Returns corrected major-unit price.
 */
export function sanitizePrice(amount: number): number {
  if (!amount || amount <= 0 || !Number.isFinite(amount)) return amount;
  if (amount > 50000) {
    // Likely cents/minor units — convert to major
    if (import.meta.env.DEV) {
      console.warn(`[sanitizePrice] Suspicious price ${amount}, converting from minor units → ${amount / 100}`);
    }
    return Math.round(amount / 100);
  }
  return amount;
}

/**
 * Sort flights by different criteria
 */
export function sortFlights(
  flights: Flight[],
  sortBy: "best" | "cheapest" | "fastest"
): Flight[] {
  const sorted = [...flights];

  switch (sortBy) {
    case "cheapest":
      sorted.sort((a, b) => {
        if (a.price.amount !== b.price.amount) return a.price.amount - b.price.amount;
        if (a.durationMinutes !== b.durationMinutes) return a.durationMinutes - b.durationMinutes;
        return (a.departureTime || "").localeCompare(b.departureTime || "");
      });
      break;
    case "fastest":
      sorted.sort((a, b) => {
        if (a.durationMinutes !== b.durationMinutes) return a.durationMinutes - b.durationMinutes;
        if (a.price.amount !== b.price.amount) return a.price.amount - b.price.amount;
        return (a.departureTime || "").localeCompare(b.departureTime || "");
      });
      break;
    case "best":
    default:
      // Weighted score: price + stops penalty + duration penalty
      // Ties broken by price → duration → departureTime for stability
      sorted.sort((a, b) => {
        const scoreA = a.price.amount + a.stopsCount * 80 + a.durationMinutes * 0.5;
        const scoreB = b.price.amount + b.stopsCount * 80 + b.durationMinutes * 0.5;
        if (scoreA !== scoreB) return scoreA - scoreB;
        if (a.price.amount !== b.price.amount) return a.price.amount - b.price.amount;
        if (a.durationMinutes !== b.durationMinutes) return a.durationMinutes - b.durationMinutes;
        return (a.departureTime || "").localeCompare(b.departureTime || "");
      });
      break;
  }

  return sorted;
}

/**
 * Get summary stats for the flight list
 */
export function getFlightStats(flights: Flight[]) {
  if (flights.length === 0) return null;

  const cheapest = flights.reduce((min, f) => 
    (f.price.amount < min.price.amount ? f : min), flights[0]);
  const fastest = flights.reduce((min, f) => 
    (f.durationMinutes < min.durationMinutes ? f : min), flights[0]);

  // Best = lowest weighted score
  const best = flights.reduce((best, f) => {
    const scoreA = f.price.amount + f.stopsCount * 80 + f.durationMinutes * 0.5;
    const scoreB = best.price.amount + best.stopsCount * 80 + best.durationMinutes * 0.5;
    return scoreA < scoreB ? f : best;
  }, flights[0]);

  return { cheapest, fastest, best };
}
