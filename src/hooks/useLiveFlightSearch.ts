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

export function useLiveFlightSearch(): UseLiveFlightSearchResult {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [status, setStatus] = useState<SearchStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [searchId, setSearchId] = useState<string | null>(null);
  const [resultsBase, setResultsBase] = useState<string | null>(null);
  const cancelRef = useRef(false);

  const cancelSearch = useCallback(() => {
    cancelRef.current = true;
    setStatus("idle");
  }, []);

  const doSearch = useCallback(async (params: SearchParamsHook) => {
    cancelRef.current = false;
    setFlights([]);
    setError(null);
    setSearchId(null);
    setResultsBase(null);
    setStatus("searching");

    try {
      const data: SearchResponse = await apiSearchFlights(params as SearchParams);

      if (cancelRef.current) return;

      if (!data.ok) {
        setError(data.error || "Search failed");
        setStatus("error");
        return;
      }

      // Store search context for click resolution
      if (data.search_id) setSearchId(data.search_id);
      if (data.results_base) setResultsBase(data.results_base);

      // Return flights directly from backend
      const flightResults: Flight[] = attachDealContextToFlights({
        flights: (data.flights || []) as Flight[],
        search_id: data.search_id || "",
        results_base: data.results_base || null,
      });

      if (flightResults.length === 0) {
        setStatus("no_results");
        return;
      }

      setFlights(flightResults);
      setStatus("complete");
    } catch (err) {
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
