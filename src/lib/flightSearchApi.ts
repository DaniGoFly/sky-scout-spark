/**
 * Flight Search API Helper
 * Centralized API layer for calling the external Supabase Edge Function
 */

// External Supabase project configuration
const EXTERNAL_SUPABASE_URL = "https://ycpqgsjhxzhkljlszbwc.supabase.co";
const EXTERNAL_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljcHFnc2poeHpoa2xqbHN6YndjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNDI2NzAsImV4cCI6MjA4MzkxODY3MH0.Nbm12ODC2-IWgQMR2o6ekcgy3tFL5c3AGJqvdjTO4IU";
const FLIGHT_SEARCH_ENDPOINT = `${EXTERNAL_SUPABASE_URL}/functions/v1/flight-search`;

// Default user IP (required by Travelpayouts)
const DEFAULT_USER_IP = "1.1.1.1";

// Session storage keys for persistence
export const STORAGE_KEYS = {
  SEARCH_ID: "tp_search_id",
  RESULTS_URL: "tp_results_url",
} as const;

/**
 * Response wrapper for API calls
 */
export interface ApiResponse<T = unknown> {
  ok: boolean;
  data: T | null;
  error: string | null;
  status: number;
}

/**
 * Start search response from the edge function
 */
export interface StartSearchResponse {
  ok: boolean;
  step: "start";
  search_id: string;
  results_url: string;
  error?: string;
  liveUnavailable?: boolean;
}

/**
 * Results poll response from the edge function
 */
export interface ResultsResponse {
  ok: boolean;
  step: "results";
  is_over?: boolean;
  last_update_timestamp?: number;
  tickets?: Ticket[];
  flight_info?: Record<string, FlightInfo>;
  error?: string;
  liveUnavailable?: boolean;
}

/**
 * Click action response from the edge function
 */
export interface ClickResponse {
  ok: boolean;
  step: "click";
  url?: string;
  error?: string;
}

/**
 * Flight info from the API
 */
export interface FlightInfo {
  departure: string;
  arrival: string;
  departure_timestamp: number;
  arrival_timestamp: number;
  operating_carrier: string;
  duration: number;
}

/**
 * Ticket from the API
 */
export interface Ticket {
  signature: string;
  segments: Segment[];
  proposals: Proposal[];
}

/**
 * Segment from the API
 */
export interface Segment {
  flights: number[];
  transfers: { recheck_baggage: boolean; night_transfer?: boolean }[];
}

/**
 * Proposal from the API
 */
export interface Proposal {
  id: string;
  price: { currency_code: string; value: number };
  price_per_person?: { currency_code: string; value: number };
  agent_id: number;
  flight_terms: Record<string, FlightTerm>;
}

/**
 * Flight term from the API
 */
export interface FlightTerm {
  fare_code: string;
  trip_class: string;
  seats_available?: number;
  marketing_carrier_designator?: {
    carrier: string;
    airline_id: string;
    number: string;
  };
  baggage?: { count: number; weight?: number };
  handbags?: { count: number; weight?: number };
}

/**
 * Helper to safely log payloads without exposing sensitive data
 */
function sanitizeForLog(payload: Record<string, unknown>): Record<string, unknown> {
  const sanitized = { ...payload };
  // Don't log API keys
  delete sanitized.apikey;
  delete sanitized.authorization;
  return sanitized;
}

/**
 * Centralized API caller with proper headers and error handling
 */
export async function callEdgeFunction<T = unknown>(
  payload: Record<string, unknown>
): Promise<ApiResponse<T>> {
  const action = payload.action || "unknown";
  
  // Log request (sanitized)
  console.log(`[FlightAPI] Request (${action}):`, sanitizeForLog(payload));
  
  try {
    const response = await fetch(FLIGHT_SEARCH_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": EXTERNAL_SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${EXTERNAL_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const status = response.status;
    
    // Try to parse response body
    let data: T | null = null;
    let errorText = "";
    
    try {
      const text = await response.text();
      if (text) {
        data = JSON.parse(text) as T;
      }
    } catch (parseError) {
      errorText = "Failed to parse response";
      console.error(`[FlightAPI] Parse error (${action}):`, parseError);
    }

    // Log response
    console.log(`[FlightAPI] Response (${action}):`, {
      status,
      ok: response.ok,
      data: data ? {
        ok: (data as Record<string, unknown>).ok,
        step: (data as Record<string, unknown>).step,
        search_id: (data as Record<string, unknown>).search_id,
        results_url: (data as Record<string, unknown>).results_url,
        is_over: (data as Record<string, unknown>).is_over,
        ticketsCount: ((data as Record<string, unknown>).tickets as unknown[])?.length,
        url: (data as Record<string, unknown>).url,
      } : null,
    });

    if (!response.ok) {
      const errorMsg = (data as Record<string, unknown>)?.error as string || errorText || `HTTP ${status}`;
      return { ok: false, data: null, error: errorMsg, status };
    }

    return { ok: true, data, error: null, status };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Network request failed";
    console.error(`[FlightAPI] Network error (${action}):`, errorMessage);
    return { ok: false, data: null, error: errorMessage, status: 0 };
  }
}

/**
 * Start a new flight search
 */
export async function startSearch(params: {
  origin: string;
  destination: string;
  departDate: string;
  returnDate?: string;
  adults?: number;
  children?: number;
  infants?: number;
  tripClass?: string;
  currency?: string;
  locale?: string;
}): Promise<ApiResponse<StartSearchResponse>> {
  const response = await callEdgeFunction<StartSearchResponse>({
    action: "start",
    origin: params.origin.toUpperCase(),
    destination: params.destination.toUpperCase(),
    depart_date: params.departDate,
    return_date: params.returnDate || undefined,
    adults: params.adults || 1,
    children: params.children || 0,
    infants: params.infants || 0,
    trip_class: params.tripClass || "Y",
    currency_code: params.currency || "EUR",
    locale: params.locale || "en",
    market_code: "US",
    user_ip: DEFAULT_USER_IP,
  });

  // Persist to sessionStorage if successful
  if (response.ok && response.data) {
    const { search_id, results_url } = response.data;
    if (search_id && results_url) {
      try {
        sessionStorage.setItem(STORAGE_KEYS.SEARCH_ID, search_id);
        sessionStorage.setItem(STORAGE_KEYS.RESULTS_URL, results_url);
        console.log("[FlightAPI] Persisted search context to sessionStorage");
      } catch (storageError) {
        console.warn("[FlightAPI] Failed to persist to sessionStorage:", storageError);
      }
    }
  }

  return response;
}

/**
 * Poll for search results
 */
export async function pollResults(params: {
  searchId: string;
  resultsUrl: string;
  lastUpdateTimestamp?: number;
}): Promise<ApiResponse<ResultsResponse>> {
  return callEdgeFunction<ResultsResponse>({
    action: "results",
    search_id: params.searchId,
    results_url: params.resultsUrl,
    last_update_timestamp: params.lastUpdateTimestamp || 0,
    user_ip: DEFAULT_USER_IP,
  });
}

/**
 * Handle click action to get booking redirect URL
 */
export async function clickBooking(params: {
  searchId: string;
  proposalId: string;
  signature: string;
  resultsUrl: string;
}): Promise<ApiResponse<ClickResponse>> {
  return callEdgeFunction<ClickResponse>({
    action: "click",
    search_id: params.searchId,
    proposal_id: params.proposalId,
    signature: params.signature,
    results_url: params.resultsUrl,
    user_ip: DEFAULT_USER_IP,
  });
}

/**
 * Get persisted search context from sessionStorage
 */
export function getPersistedSearchContext(): { searchId: string | null; resultsUrl: string | null } {
  try {
    return {
      searchId: sessionStorage.getItem(STORAGE_KEYS.SEARCH_ID),
      resultsUrl: sessionStorage.getItem(STORAGE_KEYS.RESULTS_URL),
    };
  } catch {
    return { searchId: null, resultsUrl: null };
  }
}

/**
 * Clear persisted search context
 */
export function clearPersistedSearchContext(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEYS.SEARCH_ID);
    sessionStorage.removeItem(STORAGE_KEYS.RESULTS_URL);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Format Unix timestamp to HH:MM
 */
export function formatTime(timestamp: number): string {
  if (!timestamp) return "--:--";
  const date = new Date(timestamp * 1000);
  return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}

/**
 * Format duration in minutes to "Xh Ym"
 */
export function formatDuration(minutes: number): string {
  if (!minutes) return "--";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
