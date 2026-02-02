import { useState, useCallback, useRef } from "react";
import { Flight } from "@/lib/flightNormalizer";

/**
 * Flight Search Hook
 * 
 * Calls the Supabase Edge Function and returns flights directly.
 * NO transformation - backend response is source of truth.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://kvhykvuvsbmcselojbcn.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2aHlrdnV2c2JtY3NlbG9qYmNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0NzEzODAsImV4cCI6MjA4MzA0NzM4MH0.ChYyprBwbeebvr9nr1xGuexrmciMqIsA2irToTCEQUc";
const FLIGHT_SEARCH_ENDPOINT = `${SUPABASE_URL}/functions/v1/flights-search`;

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
}

interface UseLiveFlightSearchResult {
  flights: Flight[];
  status: SearchStatus;
  error: string | null;
  isSearching: boolean;
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
    setStatus("searching");

    try {
      console.log("[FlightSearch] Starting search:", params);

      const response = await fetch(FLIGHT_SEARCH_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
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
        }),
      });

      if (cancelRef.current) return;

      const data = await response.json();
      
      console.log("[FlightSearch] Response:", {
        ok: data.ok,
        flightsCount: data.flights?.length || 0,
        error: data.error,
      });

      if (!response.ok || !data.ok) {
        console.error("[FlightSearch] Error:", data.error);
        setError(data.error || "Search failed");
        setStatus("error");
        return;
      }

      // Use flights directly from backend - NO transformation
      const flightResults: Flight[] = data.flights || [];

      if (flightResults.length === 0) {
        setStatus("no_results");
        return;
      }

      // Set flights directly - backend is source of truth
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
    searchFlights,
    cancelSearch,
  };
}

// Re-export Flight type for convenience
export type { Flight } from "@/lib/flightNormalizer";
