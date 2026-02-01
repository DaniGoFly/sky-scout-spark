import { useState, useCallback, useRef } from "react";
import {
  startSearch,
  pollResults,
  clickBooking,
  clearPersistedSearchContext,
} from "@/lib/flightSearchApi";
import { NormalizedFlight, normalizeFlightsFromResponse } from "@/lib/flightNormalizer";

export type SearchStatus = "idle" | "searching" | "polling" | "complete" | "error" | "no_results";

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
  flights: NormalizedFlight[];
  status: SearchStatus;
  error: string | null;
  progress: number;
  isSearching: boolean;
  isDemo: boolean;
  liveUnavailable: boolean;
  searchFlights: (params: SearchParams) => Promise<void>;
  cancelSearch: () => void;
}

// Polling configuration
const POLL_INTERVAL = 1200; // 1.2 seconds
const MAX_POLL_ATTEMPTS = 25;
const POLL_TIMEOUT = 25000; // 25s total timeout
const DEV_MODE = import.meta.env.DEV;

/**
 * Hook for live flight search with polling
 * Returns NormalizedFlight[] with full itinerary details
 */
export function useLiveFlightSearch(): UseLiveFlightSearchResult {
  const [flights, setFlights] = useState<NormalizedFlight[]>([]);
  const [status, setStatus] = useState<SearchStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [liveUnavailable, setLiveUnavailable] = useState(false);

  const cancelRef = useRef(false);
  const pollCountRef = useRef(0);

  const cancelSearch = useCallback(() => {
    cancelRef.current = true;
    setStatus("idle");
    setProgress(0);
  }, []);

  const searchFlights = useCallback(async (params: SearchParams) => {
    // Reset state
    cancelRef.current = false;
    pollCountRef.current = 0;
    setFlights([]);
    setError(null);
    setProgress(0);
    setStatus("searching");
    setLiveUnavailable(false);
    clearPersistedSearchContext();

    try {
      if (DEV_MODE) console.log("[LiveSearch] Starting search with params:", params);

      // Step 1: Start search
      const startResponse = await startSearch({
        origin: params.origin,
        destination: params.destination,
        departDate: params.departDate,
        returnDate: params.returnDate,
        adults: params.adults,
        children: params.children,
        infants: params.infants,
        tripClass: params.tripClass,
        currency: params.currency,
      });

      if (!startResponse.ok || !startResponse.data) {
        console.error("[LiveSearch] Start failed:", startResponse.error);
        setError(startResponse.error || "Failed to start search");
        setStatus("error");
        return;
      }

      const { search_id, results_url, liveUnavailable: startLiveUnavailable } = startResponse.data;

      // Check for live unavailable
      if (startLiveUnavailable || !startResponse.data.ok) {
        if (startLiveUnavailable) {
          console.warn("[LiveSearch] Live results not available");
          setLiveUnavailable(true);
          setStatus("no_results");
          setProgress(100);
          return;
        }
        setError(startResponse.data.error || "Failed to start search");
        setStatus("error");
        return;
      }

      if (!search_id) {
        console.error("[LiveSearch] Missing search_id");
        setError("Failed to start search - missing search_id");
        setStatus("error");
        return;
      }

      if (DEV_MODE) console.log("[LiveSearch] Search started:", { search_id, results_url });
      setProgress(10);

      // Step 2: Poll for results
      setStatus("polling");
      const allFlights = new Map<string, NormalizedFlight>();
      const startTime = Date.now();
      let lastUpdateTimestamp = 0;
      let searchComplete = false;

      while (!cancelRef.current && pollCountRef.current < MAX_POLL_ATTEMPTS && !searchComplete) {
        // Check timeout
        if (Date.now() - startTime > POLL_TIMEOUT) {
          if (DEV_MODE) console.log("[LiveSearch] Timeout reached");
          if (allFlights.size === 0) {
            setError("Still fetching live results. Please retry.");
            setStatus("error");
            return;
          }
          break;
        }

        // Wait before polling
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));

        if (cancelRef.current) break;

        pollCountRef.current++;
        const progressPercent = Math.min(10 + (pollCountRef.current / MAX_POLL_ATTEMPTS) * 85, 95);
        setProgress(progressPercent);

        if (DEV_MODE) console.log("[LiveSearch] Polling attempt:", pollCountRef.current);

        // Poll for results
        const pollResponse = await pollResults({
          searchId: search_id,
          resultsUrl: results_url || "",
          lastUpdateTimestamp,
        });

        if (!pollResponse.ok || !pollResponse.data) {
          console.warn("[LiveSearch] Poll error:", pollResponse.error);
          continue;
        }

        const pollData = pollResponse.data;

        // Check for live unavailable
        if (pollData.liveUnavailable) {
          console.warn("[LiveSearch] Live unavailable during poll");
          setLiveUnavailable(true);
          break;
        }

        // Update timestamp for next poll
        if (pollData.last_update_timestamp != null) {
          lastUpdateTimestamp = pollData.last_update_timestamp;
        }

        // Check if search is complete - STOP POLLING when is_over is true
        if (pollData.is_over === true) {
          if (DEV_MODE) console.log("[LiveSearch] Search complete (is_over=true)");
          searchComplete = true;
        }

        // Process results using the normalizer
        // Pass the FULL raw response so it can access flight_info
        const rawResponse = pollData;
        
        if (rawResponse.tickets && Array.isArray(rawResponse.tickets) && rawResponse.tickets.length > 0) {
          if (DEV_MODE) {
            console.log(`[LiveSearch] Processing ${rawResponse.tickets.length} tickets`);
          }

          // Normalize using the full response (includes flight_info)
          const normalized = normalizeFlightsFromResponse(
            rawResponse,
            search_id,
            results_url || "",
            params.origin,
            params.destination
          );

          // Add to map (deduplicates by id)
          for (const flight of normalized) {
            if (!allFlights.has(flight.id)) {
              allFlights.set(flight.id, flight);
            }
          }

          // Update UI incrementally
          setFlights(Array.from(allFlights.values()));
        }
      }

      // Finalize
      setProgress(100);
      const finalFlights = Array.from(allFlights.values());

      if (finalFlights.length === 0) {
        setStatus("no_results");
      } else {
        // Sort by price by default
        finalFlights.sort((a, b) => a.price - b.price);
        setFlights(finalFlights);
        setStatus("complete");
      }

      if (DEV_MODE) console.log("[LiveSearch] Final result:", finalFlights.length, "flights");
    } catch (err) {
      console.error("[LiveSearch] Unexpected error:", err);
      setError(err instanceof Error ? err.message : "Search failed");
      setStatus("error");
    }
  }, []);

  return {
    flights,
    status,
    error,
    progress,
    isSearching: status === "searching" || status === "polling",
    isDemo: false,
    liveUnavailable,
    searchFlights,
    cancelSearch,
  };
}

/**
 * Handle flight click action - calls backend and returns redirect URL
 */
export async function handleFlightClick(params: {
  searchId: string;
  proposalId: string;
  signature: string;
  resultsUrl: string;
}): Promise<string | null> {
  console.log("[FlightClick] Initiating click action:", params);

  try {
    const response = await clickBooking(params);

    if (!response.ok || !response.data) {
      console.error("[FlightClick] Click action failed:", response.error);
      return null;
    }

    const url = response.data.url;

    if (!url || typeof url !== "string") {
      console.error("[FlightClick] No valid URL in response:", response.data);
      return null;
    }

    console.log("[FlightClick] Got redirect URL:", url);
    return url;
  } catch (err) {
    console.error("[FlightClick] Error:", err);
    return null;
  }
}

// Re-export NormalizedFlight for convenience
export type { NormalizedFlight } from "@/lib/flightNormalizer";
