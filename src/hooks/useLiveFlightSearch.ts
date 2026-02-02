import { useState, useCallback, useRef } from "react";
import { Flight } from "@/lib/flightNormalizer";

/**
 * Flight Search Hook
 * 
 * Calls the Supabase Edge Function /functions/v1/flight-search
 * Backend returns normalized data - no transformation needed.
 */

// EXTERNAL Supabase project for flight search (NOT this project's Lovable Cloud)
const FLIGHT_SEARCH_SUPABASE_URL = "https://ycpqgsjhxzhkljlszbwc.supabase.co";
const FLIGHT_SEARCH_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljcHFnc2poeHpoa2xqbHN6YndjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM0NDMxNzAsImV4cCI6MjA1OTAxOTE3MH0.2e99RmdP8sNmB7QGelMgSxsFxBb12pmyhJcgZD5274E";

// Correct endpoint (singular "flight-search")
const FLIGHT_SEARCH_ENDPOINT = `${FLIGHT_SEARCH_SUPABASE_URL}/functions/v1/flight-search`;

export type SearchStatus = "idle" | "searching" | "complete" | "error" | "no_results";

interface SearchParams {
  origin: string;
  destination: string;
  departDate: string;
  returnDate?: string;
  adults?: number;
  children?: number;
  infants?: number;
  tripClass?: string;
  currency?: string;
  sort?: "best" | "cheapest" | "fastest";
  limit?: number;
}

interface SearchResponse {
  ok: boolean;
  step?: string;
  search_id?: string;
  results_base?: string;
  flights?: Flight[];
  error?: string;
  upstream?: string;
  meta?: {
    returned?: number;
    sort?: string;
  };
}

interface UseLiveFlightSearchResult {
  flights: Flight[];
  status: SearchStatus;
  error: string | null;
  isSearching: boolean;
  searchId: string | null;
  resultsBase: string | null;
  searchFlights: (params: SearchParams) => Promise<void>;
  cancelSearch: () => void;
}

/**
 * Hook for flight search
 * Returns Flight[] directly from backend - no transformation
 */
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

  const searchFlights = useCallback(async (params: SearchParams) => {
    // Reset state
    cancelRef.current = false;
    setFlights([]);
    setError(null);
    setSearchId(null);
    setResultsBase(null);
    setStatus("searching");

    try {
      const requestBody = {
        action: "search",
        origin: params.origin.toUpperCase(),
        destination: params.destination.toUpperCase(),
        depart_date: params.departDate,
        return_date: params.returnDate || undefined,
        adults: params.adults || 1,
        children: params.children || 0,
        infants: params.infants || 0,
        trip_class: params.tripClass || "Y",
        currency: params.currency || "EUR",
        locale: "en",
        limit: params.limit || 25,
        sort: params.sort || "best",
      };

      console.log("[FlightSearch] Calling:", FLIGHT_SEARCH_ENDPOINT);
      console.log("[FlightSearch] Request:", requestBody);

      const response = await fetch(FLIGHT_SEARCH_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": FLIGHT_SEARCH_ANON_KEY,
          "Authorization": `Bearer ${FLIGHT_SEARCH_ANON_KEY}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (cancelRef.current) return;

      const data: SearchResponse = await response.json();
      
      // Dev-only debug log
      if (import.meta.env.DEV) {
        console.log("[FlightSearch] Response:", {
          ok: data.ok,
          step: data.step,
          search_id: data.search_id,
          flights_count: data.flights?.length || 0,
          error: data.error,
        });
      }

      if (!response.ok || !data.ok) {
        const errorMsg = data.error || data.upstream || "Search failed";
        console.error("[FlightSearch] Error:", errorMsg);
        setError(errorMsg);
        setStatus("error");
        return;
      }

      // Store search context
      if (data.search_id) setSearchId(data.search_id);
      if (data.results_base) setResultsBase(data.results_base);

      // Use flights directly from backend - NO transformation
      const flightResults: Flight[] = data.flights || [];

      if (flightResults.length === 0) {
        setStatus("no_results");
        return;
      }

      setFlights(flightResults);
      setStatus("complete");
      
      console.log("[FlightSearch] Complete:", flightResults.length, "flights");
    } catch (err) {
      console.error("[FlightSearch] Error:", err);
      setError(err instanceof Error ? err.message : "Search failed");
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
    searchFlights,
    cancelSearch,
  };
}

// Re-export Flight type for convenience
export type { Flight } from "@/lib/flightNormalizer";
