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
  currency?: string;
  sort?: "best" | "cheapest" | "fastest";
  limit?: number;
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
  url?: string;
  error?: string;
}

/**
 * Search flights via edge function
 */
export async function searchFlights(params: SearchParams): Promise<SearchResponse> {
  const body = {
    action: "search",
    origin: params.origin.toUpperCase(),
    destination: params.destination.toUpperCase(),
    depart_date: params.departDate,
    return_date: params.returnDate || undefined,
    adults: params.adults || 1,
    currency: params.currency || "EUR",
    locale: "en",
    limit: params.limit || 25,
    sort: params.sort || "best",
  };

  try {
    const response = await fetch(FLIGHT_SEARCH_URL, {
      method: "POST",
      headers: FLIGHT_SEARCH_HEADERS,
      body: JSON.stringify(body),
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
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}

/**
 * Resolve click to get booking URL
 */
export async function resolveClick(params: {
  search_id: string;
  proposal_id: string;
  results_base: string;
}): Promise<ClickResolveResponse> {
  const body = {
    action: "click",
    search_id: params.search_id,
    proposal_id: params.proposal_id,
    results_base: params.results_base,
  };

  try {
    const response = await fetch(FLIGHT_SEARCH_URL, {
      method: "POST",
      headers: FLIGHT_SEARCH_HEADERS,
      body: JSON.stringify(body),
    });

    const data = await response.json();
    
    if (!response.ok || !data.ok) {
      return {
        ok: false,
        error: data.error || "Failed to resolve booking link",
      };
    }

    return data as ClickResolveResponse;
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}
