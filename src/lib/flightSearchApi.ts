/**
 * Flight Search API
 * Minimal API layer for flight search edge function on ycp project.
 * Uses `directions` array format for all search types.
 */

import {
  FLIGHT_SEARCH_URL,
  FLIGHT_SEARCH_HEADERS,
} from "./flightSearchConfig";
import { Flight } from "./flightNormalizer";

export interface Direction {
  origin: string;
  destination: string;
  date: string;
}

export interface SearchParams {
  directions: Direction[];
  adults?: number;
  children?: number;
  infants?: number;
  currency?: string;
  sort?: "best" | "cheapest" | "fastest";
  limit?: number;
  tripClass?: string;
  market?: string;
}

export interface SearchResponse {
  ok: boolean;
  step?: string;
  status?: string;
  search_id?: string;
  results_base?: string;
  flights?: Flight[];
  last_update_timestamp?: number;
  error?: string;
}

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
    console.log("[flight-search] click resolve", params);
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

    console.log("[monetization] deal click resolved", {
      search_id: params.search_id,
      proposal_id: params.proposal_id,
      deal_url: data.deal_url,
      timestamp: new Date().toISOString(),
    });

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
 * Search flights via edge function using directions array.
 * Supports AbortController signal for cancellation.
 */
export async function searchFlights(
  params: SearchParams,
  signal?: AbortSignal
): Promise<SearchResponse> {
  const cabinMap: Record<string, string> = {
    economy: "Y", premium_economy: "W", business: "C", first: "F",
    y: "Y", w: "W", c: "C", f: "F",
  };
  const rawClass = (params.tripClass || "economy").toLowerCase();
  const tripClassCode = cabinMap[rawClass] || "Y";

  const body: Record<string, unknown> = {
    action: "search",
    directions: params.directions.map(d => ({
      origin: d.origin.toUpperCase(),
      destination: d.destination.toUpperCase(),
      date: d.date,
    })),
    adults: params.adults || 1,
    children: params.children || 0,
    infants: params.infants || 0,
    trip_class: tripClassCode,
    currency_code: (params.currency || "USD").toUpperCase(),
    market_code: (params.market || "US").toUpperCase(),
    limit: params.limit || 100,
    sort: params.sort || "best",
    max_wait_ms: 45000,
    poll_every_ms: 1300,
  };

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
    if (err instanceof DOMException && err.name === "AbortError") {
      return { ok: false, error: "Search cancelled" };
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}

/**
 * Poll for results when search returns pending status
 */
export async function pollResults(params: {
  search_id: string;
  results_base: string;
  last_update_timestamp?: number;
}, signal?: AbortSignal): Promise<SearchResponse> {
  try {
    const response = await fetch(FLIGHT_SEARCH_URL, {
      method: "POST",
      headers: FLIGHT_SEARCH_HEADERS,
      body: JSON.stringify({
        action: "results",
        search_id: params.search_id,
        results_base: params.results_base,
        last_update_timestamp: params.last_update_timestamp || 0,
      }),
      signal,
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      return {
        ok: false,
        error: data.error || `Poll failed (${response.status})`,
      };
    }

    return data as SearchResponse;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return { ok: false, error: "Search cancelled" };
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}
