import { useState, useCallback, useRef } from "react";
import {
  startSearch,
  pollResults,
  clickBooking,
  getPersistedSearchContext,
  clearPersistedSearchContext,
  formatTime,
  formatDuration,
  Ticket,
  FlightInfo,
} from "@/lib/flightSearchApi";

/**
 * Processed flight result for UI display
 */
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
  // Booking metadata - ALL required for click action
  searchId: string;
  resultsUrl: string;
  proposalId: string;
  signature: string;
  // Raw segments for potential future use
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

// Polling configuration
const POLL_INTERVAL = 1500; // 1.5 seconds
const MAX_POLL_ATTEMPTS = 25; // max polls before giving up
const POLL_TIMEOUT = 40000; // 40s total timeout

/**
 * Parse tickets from API response into UI-friendly format
 */
function parseTicketsToFlights(
  tickets: Ticket[],
  flightInfoMap: Record<number, { departure: string; arrival: string; departureTime: string; arrivalTime: string; airline: string; duration: number }>,
  searchId: string,
  resultsUrl: string,
  defaultOrigin: string,
  defaultDestination: string
): LiveFlightResult[] {
  const flights: LiveFlightResult[] = [];

  for (const ticket of tickets) {
    for (const proposal of ticket.proposals) {
      const key = `${proposal.id}-${ticket.signature}`;
      
      // Get first segment info for display (outbound)
      const firstSegment = ticket.segments[0];
      const firstFlightIdx = firstSegment?.flights[0];
      const lastFlightIdx = firstSegment?.flights[firstSegment.flights.length - 1];
      
      const firstFlightInfo = flightInfoMap[firstFlightIdx];
      const lastFlightInfo = flightInfoMap[lastFlightIdx];
      
      // Count stops (connections in outbound segment)
      const stops = firstSegment ? Math.max(0, firstSegment.flights.length - 1) : 0;
      
      // Get airline from flight terms
      const flightTermKeys = Object.keys(proposal.flight_terms || {});
      const firstTermKey = flightTermKeys[0];
      const firstTerm = proposal.flight_terms?.[firstTermKey];
      const carrierCode = firstTerm?.marketing_carrier_designator?.carrier || "XX";
      const flightNumber = firstTerm?.marketing_carrier_designator?.number || "";
      
      // Calculate total duration for outbound
      let totalDuration = 0;
      if (firstSegment) {
        for (const flightIdx of firstSegment.flights) {
          const info = flightInfoMap[flightIdx];
          if (info?.duration) totalDuration += info.duration;
        }
      }

      const flight: LiveFlightResult = {
        id: key,
        airline: carrierCode,
        airlineLogo: `https://pics.avs.io/60/60/${carrierCode}.png`,
        flightNumber: `${carrierCode}${flightNumber}`,
        departureTime: firstFlightInfo?.departureTime || "--:--",
        arrivalTime: lastFlightInfo?.arrivalTime || "--:--",
        departureCode: firstFlightInfo?.departure || defaultOrigin,
        arrivalCode: lastFlightInfo?.arrival || defaultDestination,
        duration: formatDuration(totalDuration),
        durationMinutes: totalDuration,
        stops,
        price: Math.round(proposal.price_per_person?.value || proposal.price?.value || 0),
        currency: proposal.price?.currency_code || "EUR",
        // All booking metadata required for click
        searchId,
        resultsUrl,
        proposalId: proposal.id,
        signature: ticket.signature,
        segments: ticket.segments,
      };

      flights.push(flight);
    }
  }

  return flights;
}

/**
 * Hook for live flight search with polling
 */
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
      console.log("[LiveSearch] Starting search with params:", params);

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

      console.log("[LiveSearch] Search started:", { search_id, results_url });
      setProgress(10);

      // Step 2: Poll for results
      setStatus("polling");
      const allFlights = new Map<string, LiveFlightResult>();
      const startTime = Date.now();
      let lastUpdateTimestamp = 0;
      
      // Build flight info map from API responses
      const flightInfoMap: Record<number, { 
        departure: string; 
        arrival: string; 
        departureTime: string; 
        arrivalTime: string;
        airline: string;
        duration: number;
      }> = {};

      while (!cancelRef.current && pollCountRef.current < MAX_POLL_ATTEMPTS) {
        // Check timeout
        if (Date.now() - startTime > POLL_TIMEOUT) {
          console.log("[LiveSearch] Timeout reached");
          break;
        }

        // Wait before polling
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));

        if (cancelRef.current) break;

        pollCountRef.current++;
        const progressPercent = Math.min(10 + (pollCountRef.current / MAX_POLL_ATTEMPTS) * 85, 95);
        setProgress(progressPercent);

        console.log("[LiveSearch] Polling attempt:", pollCountRef.current);

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

        // Parse flight_info for airport/time data
        if (pollData.flight_info) {
          for (const [key, info] of Object.entries(pollData.flight_info)) {
            const idx = parseInt(key);
            if (!isNaN(idx) && info && typeof info === "object") {
              flightInfoMap[idx] = {
                departure: info.departure || "",
                arrival: info.arrival || "",
                departureTime: formatTime(info.departure_timestamp),
                arrivalTime: formatTime(info.arrival_timestamp),
                airline: info.operating_carrier || "",
                duration: info.duration || 0,
              };
            }
          }
        }

        // Parse tickets
        if (pollData.tickets?.length) {
          const newFlights = parseTicketsToFlights(
            pollData.tickets,
            flightInfoMap,
            search_id,
            results_url,
            params.origin,
            params.destination
          );

          for (const flight of newFlights) {
            if (!allFlights.has(flight.id)) {
              allFlights.set(flight.id, flight);
            }
          }

          // Update UI incrementally
          setFlights(Array.from(allFlights.values()));
        }

        // Check if complete
        if (pollData.is_over === true) {
          console.log("[LiveSearch] Search complete (is_over=true)");
          break;
        }
      }

      // Finalize
      setProgress(100);
      const finalFlights = Array.from(allFlights.values());

      if (finalFlights.length === 0) {
        if (liveUnavailable) {
          setStatus("no_results");
        } else {
          setStatus("no_results");
        }
      } else {
        // Sort by price by default
        finalFlights.sort((a, b) => a.price - b.price);
        setFlights(finalFlights);
        setStatus("complete");
      }

      console.log("[LiveSearch] Final result:", finalFlights.length, "flights");
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
  
  const response = await clickBooking(params);

  if (!response.ok || !response.data) {
    console.error("[FlightClick] Click action failed:", response.error);
    return null;
  }

  const url = response.data.url;
  
  if (!url) {
    console.error("[FlightClick] No URL in response:", response.data);
    return null;
  }

  console.log("[FlightClick] Got redirect URL:", url);
  return url;
}
