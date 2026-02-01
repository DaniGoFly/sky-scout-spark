import { useState, useCallback, useRef } from "react";
import {
  startSearch,
  pollResults,
  clickBooking,
  clearPersistedSearchContext,
  formatTime,
} from "@/lib/flightSearchApi";
import {
  NormalizedFlight,
  buildFlightInfoMap,
  normalizeFlights,
  FlightInfoMap,
} from "@/lib/flightNormalizer";

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
const POLL_INTERVAL = 1200; // 1.2 seconds (as per requirements)
const MAX_POLL_ATTEMPTS = 25; // max polls before giving up
const POLL_TIMEOUT = 25000; // 25s total timeout for pending state
const DEV_MODE = import.meta.env.DEV;

/**
 * Check if tickets have valid segment data
 */
function hasValidTicketData(tickets: any[]): boolean {
  if (!Array.isArray(tickets) || tickets.length === 0) return false;
  // At least one ticket must have segments
  return tickets.some(t => t?.segments && Array.isArray(t.segments) && t.segments.length > 0);
}

/**
 * Hook for live flight search with polling
 * Returns NormalizedFlight[] with full itinerary details including return leg
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

      if (!search_id || !results_url) {
        console.error("[LiveSearch] Missing search_id or results_url");
        setError("Failed to start search - missing required data");
        setStatus("error");
        return;
      }

      if (DEV_MODE) console.log("[LiveSearch] Search started:", { search_id, results_url });
      setProgress(10);

      // Step 2: Poll for results - PERSIST results_url for all subsequent calls
      setStatus("polling");
      const allFlights = new Map<string, NormalizedFlight>();
      const startTime = Date.now();
      let lastUpdateTimestamp = 0;
      
      // Build flight info map from API responses - accumulates across polls
      let flightInfoMap: FlightInfoMap = {};
      let pendingAttempts = 0;

      while (!cancelRef.current && pollCountRef.current < MAX_POLL_ATTEMPTS) {
        // Check timeout
        if (Date.now() - startTime > POLL_TIMEOUT) {
          if (DEV_MODE) console.log("[LiveSearch] Timeout reached after", (Date.now() - startTime) / 1000, "seconds");
          // If we still have no results, set error with friendly message
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

        // Always pass the persisted results_url from start response
        const pollResponse = await pollResults({
          searchId: search_id,
          resultsUrl: results_url,
          lastUpdateTimestamp,
        });

        if (!pollResponse.ok || !pollResponse.data) {
          console.warn("[LiveSearch] Poll error:", pollResponse.error);
          continue; // Continue polling, don't fail completely
        }

        const pollData = pollResponse.data;

        // Handle Case B: Pending state - { ok:true, step:"results", status:"pending", ... }
        if (pollData.status === "pending") {
          pendingAttempts++;
          if (DEV_MODE) {
            console.log(`[LiveSearch] Status is PENDING, attempt #${pendingAttempts}`);
          }
          // Don't try to render, just continue polling
          continue;
        }

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

        // Build/update flight info map from API response
        if (pollData.flight_info) {
          const newFlightInfo = buildFlightInfoMap(pollData.flight_info);
          // Merge with existing - newer data overwrites
          flightInfoMap = { ...flightInfoMap, ...newFlightInfo };
        }

        // Case A: Check if we have valid ticket data with segments
        const tickets = pollData.tickets;
        if (tickets && hasValidTicketData(tickets)) {
          if (DEV_MODE && pendingAttempts > 0) {
            console.log(`[LiveSearch] Results ready after ${pendingAttempts} pending attempts, ${tickets.length} tickets`);
          }

          const newFlights = normalizeFlights(
            tickets,
            flightInfoMap,
            search_id,
            results_url,
            params.origin,
            params.destination
          );

          // Log sample data on first batch (dev only)
          if (pollCountRef.current === 1 && newFlights.length > 0 && DEV_MODE) {
            const sample = newFlights[0];
            console.log("[LiveSearch] Sample normalized flight:", {
              id: sample.id,
              departureTime: sample.departureTime,
              arrivalTime: sample.arrivalTime,
              duration: sample.duration,
              stops: sample.stops,
              stopAirports: sample.stopAirports,
              returnLeg: sample.returnLeg ? {
                departureTime: sample.returnLeg.departureTime,
                arrivalTime: sample.returnLeg.arrivalTime,
                stops: sample.returnLeg.stops,
              } : null,
            });
          }

          for (const flight of newFlights) {
            if (!allFlights.has(flight.id)) {
              allFlights.set(flight.id, flight);
            }
          }

          // Update UI incrementally
          setFlights(Array.from(allFlights.values()));
        } else if (DEV_MODE && tickets) {
          console.log("[LiveSearch] Tickets received but no valid segments, continuing to poll");
        }

        // Check if complete
        if (pollData.is_over === true) {
          if (DEV_MODE) console.log("[LiveSearch] Search complete (is_over=true)");
          break;
        }
      }

      // Finalize
      setProgress(100);
      const finalFlights = Array.from(allFlights.values());

      // Data integrity check (dev warning)
      if (DEV_MODE) {
        const flightsWithTimes = finalFlights.filter(f => f.departureTime && f.arrivalTime);
        if (finalFlights.length > 0 && flightsWithTimes.length < finalFlights.length * 0.5) {
          console.warn(
            `[LiveSearch] Data integrity warning: Only ${flightsWithTimes.length}/${finalFlights.length} flights have times. Check API response mapping.`
          );
        }
      }

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

    // Get URL from response - may use different key names
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
