import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface LiveFlightResult {
  id: string;
  airline: string;
  airlineLogo: string;
  flightNumber: string;
  departureTime: string;
  arrivalTime: string;
  departureCode: string;
  arrivalCode: string;
  duration: string;
  durationMinutes: number;
  stops: number;
  price: number;
  currency: string;
  bookingUrl?: string | null;
  proposalId?: string | null;
  gateId?: string | null;
  segments?: unknown[];
}

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
  flights: LiveFlightResult[];
  status: SearchStatus;
  error: string | null;
  progress: number;
  isSearching: boolean;
  isDemo: boolean;
  liveUnavailable: boolean;
  searchFlights: (params: SearchParams) => Promise<void>;
  cancelSearch: () => void;
}

const POLL_INTERVAL = 1500; // 1.5 seconds
const MAX_POLL_ATTEMPTS = 30; // max polls
const POLL_TIMEOUT = 45000; // 45s timeout

export function useLiveFlightSearch(): UseLiveFlightSearchResult {
  const [flights, setFlights] = useState<LiveFlightResult[]>([]);
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
    cancelRef.current = false;
    pollCountRef.current = 0;
    setFlights([]);
    setError(null);
    setProgress(0);
    setStatus("searching");
    setLiveUnavailable(false);

    try {
      console.log("[LiveSearch] Starting search with params:", params);

      // Step 1: Start search with new format
      const { data: startData, error: startError } = await supabase.functions.invoke("flight-search", {
        body: {
          action: "start",
          origin: params.origin,
          destination: params.destination,
          depart_date: params.departDate,
          return_date: params.returnDate,
          adults: params.adults || 1,
          children: params.children || 0,
          infants: params.infants || 0,
          trip_class: params.tripClass || "Y",
          locale: "en",
          market_code: "US",
          currency_code: params.currency || "USD",
        },
      });

      if (startError) {
        console.error("[LiveSearch] Start failed:", startError);
        setError(startError.message || "Failed to start search");
        setStatus("error");
        return;
      }

      // Check for live unavailable (API auth issue)
      if (startData?.liveUnavailable || startData?.ok === false) {
        if (startData?.liveUnavailable) {
          console.warn("[LiveSearch] Live results not available");
          setLiveUnavailable(true);
          setStatus("no_results");
          setProgress(100);
          return;
        }
        setError(startData?.error || "Failed to start search");
        setStatus("error");
        return;
      }

      const { search_id, results_url } = startData;

      if (!search_id) {
        console.error("[LiveSearch] No search_id in response");
        setError("Failed to start search - no search ID");
        setStatus("error");
        return;
      }

      console.log("[LiveSearch] Search started:", search_id);
      setProgress(10);

      // Step 2: Poll for results
      setStatus("polling");
      const allFlights = new Map<string, LiveFlightResult>();
      const startTime = Date.now();
      let lastUpdateTimestamp = 0;

      while (!cancelRef.current && pollCountRef.current < MAX_POLL_ATTEMPTS) {
        if (Date.now() - startTime > POLL_TIMEOUT) {
          console.log("[LiveSearch] Timeout reached");
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));

        if (cancelRef.current) break;

        pollCountRef.current++;
        const progressPercent = Math.min(10 + (pollCountRef.current / MAX_POLL_ATTEMPTS) * 85, 95);
        setProgress(progressPercent);

        console.log("[LiveSearch] Polling attempt:", pollCountRef.current);

        const { data: pollData, error: pollError } = await supabase.functions.invoke("live-flight-search", {
          body: {
            action: "results",
            search_id,
            results_url,
            last_update_timestamp: lastUpdateTimestamp,
          },
        });

        if (pollError) {
          console.warn("[LiveSearch] Poll error:", pollError);
          continue;
        }

        if (pollData?.liveUnavailable) {
          console.warn("[LiveSearch] Live unavailable during poll");
          setLiveUnavailable(true);
          break;
        }

        if (pollData?.ok === false) {
          console.warn("[LiveSearch] Poll returned error:", pollData?.error);
          continue;
        }

        // Update timestamp for next poll
        if (pollData?.last_update_timestamp != null) {
          lastUpdateTimestamp = Number(pollData.last_update_timestamp);
        }

        // Add new flights
        if (pollData?.results?.length > 0) {
          for (const flight of pollData.results) {
            const key = `${flight.departureCode}-${flight.arrivalCode}-${flight.departureTime}-${flight.price}`;
            if (!allFlights.has(key)) {
              allFlights.set(key, flight);
            }
          }
          setFlights(Array.from(allFlights.values()));
        }

        // Check if complete
        if (pollData?.is_over === true) {
          console.log("[LiveSearch] Search complete");
          break;
        }
      }

      // Finalize
      setProgress(100);
      const finalFlights = Array.from(allFlights.values());

      if (finalFlights.length === 0) {
        setStatus("no_results");
      } else {
        finalFlights.sort((a, b) => a.price - b.price);
        setFlights(finalFlights);
        setStatus("complete");
      }

      console.log("[LiveSearch] Final result:", finalFlights.length, "flights");
    } catch (err) {
      console.error("[LiveSearch] Error:", err);
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
    isDemo: false, // No demo mode - only real results
    liveUnavailable,
    searchFlights,
    cancelSearch,
  };
}
