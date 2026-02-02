import { useState, useCallback, useRef } from "react";
import { Flight } from "@/lib/flightNormalizer";
import { 
  EDGE_FUNCTION_URL,
  EDGE_HEADERS
} from "@/lib/flightSearchConfig";

/**
 * Flight Search Hook
 * 
 * Calls the Supabase Edge Function /functions/v1/flight-search
 * Backend returns normalized data - no transformation needed.
 */

export type SearchStatus = "idle" | "searching" | "complete" | "error" | "no_results";

interface ErrorDetails {
  message: string;
  url?: string;
  status?: number;
  step?: string;
  responseText?: string;
  authHeaderExists?: boolean;
}

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
  errorDetails: ErrorDetails | null;
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
  const [errorDetails, setErrorDetails] = useState<ErrorDetails | null>(null);
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
    setErrorDetails(null);
    setSearchId(null);
    setResultsBase(null);
    setStatus("searching");

    try {
      const requestBody = {
        action: "search",
        origin: params.origin.toUpperCase(),
        destination: params.destination.toUpperCase(),
        depart_date: params.departDate,
        return_date: params.returnDate || "",
        adults: params.adults || 1,
        children: params.children || 0,
        infants: params.infants || 0,
        trip_class: params.tripClass || "Y",
        currency: params.currency || "EUR",
        locale: "en",
        limit: params.limit || 25,
        sort: params.sort || "best",
      };

      const headers = EDGE_HEADERS();

      const response = await fetch(EDGE_FUNCTION_URL, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
      });

      if (cancelRef.current) return;

      // Get raw response text for debugging
      const responseText = await response.text();
      let data: SearchResponse;
      
      try {
        data = JSON.parse(responseText);
      } catch {
        // JSON parse failed
        const details: ErrorDetails = {
          message: "Invalid JSON response",
          url: EDGE_FUNCTION_URL,
          status: response.status,
          responseText: responseText.substring(0, 500),
          authHeaderExists: Boolean(headers?.authorization),
        };
        console.error("[FlightSearch] Parse error:", details);
        setError(details.message);
        setErrorDetails(details);
        setStatus("error");
        return;
      }

      if (!response.ok || !data.ok) {
        const errorMsg = data.error || data.upstream || `HTTP ${response.status}`;
        const details: ErrorDetails = {
          message: errorMsg,
          url: EDGE_FUNCTION_URL,
          status: response.status,
          step: data.step,
          responseText: responseText.substring(0, 500),
          authHeaderExists: Boolean(headers?.authorization),
        };
        console.error("[FlightSearch] Error:", details);
        setError(errorMsg);
        setErrorDetails(details);
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

      // Small dev-only debug log
      try {
        const host = window.location.hostname;
        const isDev = host === "localhost" || host.endsWith(".lovableproject.com") || host.endsWith(".lovable.app");
        if (isDev) {
          console.log("[FlightSearch] OK", { search_id: data.search_id, flights: flightResults.length });
        }
      } catch {
        // ignore
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Network error";
      const details: ErrorDetails = {
        message: errorMsg,
        url: EDGE_FUNCTION_URL,
        authHeaderExists: false,
      };
      console.error("[FlightSearch] Error:", details);
      setError(errorMsg);
      setErrorDetails(details);
      setStatus("error");
    }
  }, []);

  return {
    flights,
    status,
    error,
    errorDetails,
    isSearching: status === "searching",
    searchId,
    resultsBase,
    searchFlights,
    cancelSearch,
  };
}

// Re-export Flight type for convenience
export type { Flight } from "@/lib/flightNormalizer";
export type { ErrorDetails };
