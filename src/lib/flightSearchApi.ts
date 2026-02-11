/**
 * Flight Search API
 * Minimal API layer for flight search edge function
 */

import { 
  FLIGHT_SEARCH_URL,
  FLIGHT_SEARCH_HEADERS
} from "./flightSearchConfig";
import { Flight } from "./flightNormalizer";

/**
 * Search parameters
 */
export interface SearchParams {
  origin: string;
  destination: string;
  departDate: string;
  returnDate?: string;
  adults?: number;
  children?: number;
  infants?: number;
  currency?: string;
  sort?: "best" | "cheapest" | "fastest";
  limit?: number;
  tripClass?: string;
}

/**
 * Search response
 */
export interface SearchResponse {
  ok: boolean;
  search_id?: string;
  results_base?: string;
  flights?: Flight[];
  error?: string;
}

/**
 * Click resolution response
 */
export interface ClickResolveResponse {
  ok: boolean;
  deal_url?: string;
  error?: string;
}

/**
 * Resolve a deal using search_id + proposal_id + results_base
 */
export async function resolveDeal(params: {
  search_id: string;
  proposal_id: string;
  results_base?: string;
}): Promise<ClickResolveResponse> {
  try {
    const response = await fetch(FLIGHT_SEARCH_URL, {
      method: "POST",
      headers: FLIGHT_SEARCH_HEADERS,
      body: JSON.stringify({
        action: "click",
        search_id: params.search_id,
        proposal_id: params.proposal_id,
        results_base: params.results_base,
      }),
    });

    const data = await response.json();
    
    if (!response.ok || !data.ok) {
      return {
        ok: false,
        error: data.error || "Failed to resolve booking link",
      };
    }

    return {
      ok: true,
      deal_url: data.deal_url,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}

/**
 * Search flights via edge function
 * Supports AbortController signal for cancellation
 */
export async function searchFlights(
  params: SearchParams,
  signal?: AbortSignal
): Promise<SearchResponse> {
  // Map frontend cabin names to IATA codes
  const cabinMap: Record<string, string> = {
    economy: "Y", premium_economy: "W", business: "C", first: "F",
    y: "Y", w: "W", c: "C", f: "F",
  };
  const rawClass = (params.tripClass || "economy").toLowerCase();
  const tripClassCode = cabinMap[rawClass] || "Y";

  const body: Record<string, unknown> = {
    action: "search",
    origin: params.origin.toUpperCase(),
    destination: params.destination.toUpperCase(),
    depart_date: params.departDate,
    adults: params.adults || 1,
    children: params.children || 0,
    infants: params.infants || 0,
    trip_class: tripClassCode,
    currency_code: (params.currency || "EUR").toUpperCase(),
    market_code: "US",
  };

  // Only include return_date for roundtrips
  if (params.returnDate) {
    body.return_date = params.returnDate;
  }

  try {
    const response = await fetch(FLIGHT_SEARCH_URL, {
      method: "POST",
      headers: FLIGHT_SEARCH_HEADERS,
      body: JSON.stringify(body),
      signal,
    });

    const data = await response.json();
    
    if (!response.ok || !data.ok) {
      return {
        ok: false,
        error: data.error || `Request failed (${response.status})`,
      };
    }

    return data as SearchResponse;
  } catch (err) {
    // Don't treat abort as an error
    if (err instanceof DOMException && err.name === "AbortError") {
      return { ok: false, error: "Search cancelled" };
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}
