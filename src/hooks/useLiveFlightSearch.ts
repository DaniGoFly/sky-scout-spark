import { useState, useCallback, useRef } from "react";
import { Flight } from "@/lib/flightNormalizer";
import { searchFlights as apiSearchFlights, SearchParams, SearchResponse } from "@/lib/flightSearchApi";
import { attachDealContextToFlights } from "@/lib/flightDealIds";

export type SearchStatus = "idle" | "searching" | "complete" | "error" | "no_results";

export interface SearchParamsHook {
  origin: string;
  destination: string;
  departDate: string;
  returnDate?: string;
  adults?: number;
  currency?: string;
  sort?: "best" | "cheapest" | "fastest";
  limit?: number;
}

interface UseLiveFlightSearchResult {
  flights: Flight[];
  status: SearchStatus;
  error: string | null;
  isSearching: boolean;
  searchId: string | null;
  resultsBase: string | null;
  searchFlights: (params: SearchParamsHook) => Promise<void>;
  cancelSearch: () => void;
}

/* ── localStorage cache helpers ── */

const CACHE_PREFIX = "goflyfinder:searchCache:";
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

interface CachedResult {
  timestamp: number;
  searchId: string | null;
  resultsBase: string | null;
  flights: Flight[];
}

function buildCacheKey(params: SearchParamsHook): string {
  const normalized = {
    o: params.origin?.toUpperCase(),
    d: params.destination?.toUpperCase(),
    dep: params.departDate,
    ret: params.returnDate || "",
    a: params.adults || 1,
    cur: params.currency || "EUR",
  };
  return CACHE_PREFIX + JSON.stringify(normalized);
}

function readCache(key: string): CachedResult | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed: CachedResult = JSON.parse(raw);
    if (Date.now() - parsed.timestamp > CACHE_TTL_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(key: string, data: CachedResult) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // localStorage full — silently ignore
  }
}

export function useLiveFlightSearch(): UseLiveFlightSearchResult {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [status, setStatus] = useState<SearchStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [searchId, setSearchId] = useState<string | null>(null);
  const [resultsBase, setResultsBase] = useState<string | null>(null);

  // AbortController ref for cancelling in-flight requests
  const abortRef = useRef<AbortController | null>(null);

  const cancelSearch = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setStatus("idle");
  }, []);

  const doSearch = useCallback(async (params: SearchParamsHook) => {
    // Cancel any in-flight request before starting a new one
    if (abortRef.current) {
      abortRef.current.abort();
    }

    const cacheKey = buildCacheKey(params);
    const cached = readCache(cacheKey);

    // Return cached results if fresh
    if (cached && cached.flights.length > 0) {
      setFlights(cached.flights);
      setSearchId(cached.searchId);
      setResultsBase(cached.resultsBase);
      setError(null);
      setStatus("complete");
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    setFlights([]);
    setError(null);
    setSearchId(null);
    setResultsBase(null);
    setStatus("searching");

    try {
      console.log("[flight-search] POST", params.origin, "→", params.destination);
      const data: SearchResponse = await apiSearchFlights(
        params as SearchParams,
        controller.signal
      );

      // If this request was aborted, ignore the response
      if (controller.signal.aborted) return;

      console.log("[flight-search] response", { ok: data.ok, flights: data.flights?.length || 0, error: data.error });

      if (!data.ok) {
        // Don't show "cancelled" as an error
        if (data.error === "Search cancelled") return;
        setError(data.error || "Search failed");
        setStatus("error");
        return;
      }

      if (data.search_id) setSearchId(data.search_id);
      if (data.results_base) setResultsBase(data.results_base);

      const flightResults: Flight[] = attachDealContextToFlights({
        flights: (data.flights || []) as Flight[],
        search_id: data.search_id || "",
        results_base: data.results_base || null,
      });

      if (flightResults.length === 0) {
        setStatus("no_results");
        return;
      }

      // Persist to cache
      writeCache(cacheKey, {
        timestamp: Date.now(),
        searchId: data.search_id || null,
        resultsBase: data.results_base || null,
        flights: flightResults,
      });

      setFlights(flightResults);
      setStatus("complete");
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : "Network error");
      setStatus("error");
    }
  }, []);

  return {
    flights,
    status,
    error,
    isSearching: status === "searching",
    searchId,
    resultsBase,
    searchFlights: doSearch,
    cancelSearch,
  };
}

export type { Flight } from "@/lib/flightNormalizer";
