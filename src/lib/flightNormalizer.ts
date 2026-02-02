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
  return hasValidClickUrl(flight) && flight.price.amount > 0;
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
  clickUrl: string;
  return?: ReturnLegInfo;
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
 * Get stops label for display
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
export function hasValidClickUrl(flight: Flight): boolean {
  return Boolean(flight.clickUrl && flight.clickUrl.startsWith("http"));
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
      sorted.sort((a, b) => a.price.amount - b.price.amount);
      break;
    case "fastest":
      sorted.sort((a, b) => a.durationMinutes - b.durationMinutes);
      break;
    case "best":
    default:
      // Weighted score: price + stops penalty + duration penalty
      sorted.sort((a, b) => {
        const scoreA = a.price.amount + a.stopsCount * 80 + a.durationMinutes * 0.5;
        const scoreB = b.price.amount + b.stopsCount * 80 + b.durationMinutes * 0.5;
        return scoreA - scoreB;
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
