// Shared provider types for the flight-search aggregator.

export interface Money {
  amount: number;
  currency: string;
}

export interface FlightSegment {
  airlineCode: string;
  flightNumber: string;
  departureAirport: string;
  arrivalAirport: string;
  departureTime: string; // "YYYY-MM-DD HH:mm" UTC
  arrivalTime: string;
  durationMinutes: number;
}

/**
 * Provider-agnostic flight object.
 * Every provider MUST return this exact shape from normalizeResults().
 */
export interface NormalizedFlight {
  id: string;                 // globally unique: `${provider}:${localId}`
  provider: string;           // e.g. "aviasales", "kiwi"
  price: number;
  currency: string;
  airline: string;            // primary carrier code
  airlineCode: string;        // same, kept for clarity/extensibility
  departureAirport: string;
  arrivalAirport: string;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  stopsCount: number;
  layovers: string[];         // IATA codes of intermediate airports
  segments: FlightSegment[];
  deepLink: string;           // frontend uses this OR calls getClickUrl
  clickUrl: string;           // alias — same value; kept for API-shape stability

  // Legacy fields required by existing frontend cards (flightNormalizer.ts).
  // Populated by adapters so the current UI keeps working unchanged.
  price_legacy?: { amount: number; currency: string };
  stopsAirports?: string[];
  airlines?: string[];
  flightNumbers?: string[];
  search_id?: string;
  click_id?: string;
  results_base?: string;
  searchId?: string;
  resultsBase?: string;
  proposalId?: string;
  booking_url?: string;
  origin?: string;
  destination?: string;
  stopsCount_legacy?: number;
}

export interface SearchParams {
  directions: Array<{ origin: string; destination: string; date: string }>;
  adults: number;
  children: number;
  infants: number;
  currency: string;
  market: string;
  locale: string;
  tripClass: string;
  limit: number;
  sort: "best" | "cheapest" | "fastest";
  userIp: string;
}

export interface ClickParams {
  flightId: string;           // normalized id, `${provider}:${localId}`
  extra?: Record<string, unknown>;
}

export interface ClickResult {
  ok: boolean;
  deal_url?: string;
  error?: string;
}

/**
 * Generic FlightProvider adapter contract.
 * Add a new provider by implementing this interface and registering it
 * in providers/registry.ts.
 */
export interface FlightProvider {
  name: string;
  searchFlights(params: SearchParams): Promise<{
    ok: boolean;
    raw?: unknown;
    error?: string;
    // Adapter-specific context echoed back so getClickUrl can route.
    context?: Record<string, unknown>;
  }>;
  normalizeResults(raw: unknown, context?: Record<string, unknown>): NormalizedFlight[];
  getClickUrl(params: ClickParams): Promise<ClickResult>;
}