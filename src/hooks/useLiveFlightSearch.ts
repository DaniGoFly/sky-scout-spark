import { useState, useCallback, useRef } from "react";
import {
  startSearch,
  pollResults,
  clickBooking,
  clearPersistedSearchContext,
  LiveSearchResult,
} from "@/lib/flightSearchApi";
import { NormalizedFlight } from "@/lib/flightNormalizer";

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

// Common airline code to name mapping
const AIRLINE_NAMES: Record<string, string> = {
  AA: "American Airlines", AC: "Air Canada", AF: "Air France", AS: "Alaska Airlines",
  AY: "Finnair", AZ: "ITA Airways", BA: "British Airways", CX: "Cathay Pacific",
  DE: "Condor", DL: "Delta Air Lines", EK: "Emirates", EW: "Eurowings",
  EY: "Etihad Airways", F9: "Frontier Airlines", IB: "Iberia", JL: "Japan Airlines",
  KL: "KLM", LH: "Lufthansa", LO: "LOT Polish Airlines", LX: "SWISS",
  NK: "Spirit Airlines", OS: "Austrian Airlines", QF: "Qantas", QR: "Qatar Airways",
  SK: "SAS", SQ: "Singapore Airlines", TK: "Turkish Airlines", UA: "United Airlines",
  VS: "Virgin Atlantic", WN: "Southwest Airlines", WS: "WestJet", X3: "TUI fly",
  U2: "easyJet", FR: "Ryanair", W6: "Wizz Air", VY: "Vueling", FI: "Icelandair",
};

/**
 * Convert LiveSearchResult to NormalizedFlight
 * The live-flight-search edge function returns pre-normalized results
 */
function convertToNormalizedFlight(
  result: LiveSearchResult,
  searchId: string,
  resultsUrl: string,
  isRoundtrip: boolean,
  destination: string
): NormalizedFlight {
  // Extract airline code from airline name or logo
  const airlineCode = result.airlineLogo?.match(/\/(\w{2})\.png/)?.[1]?.toUpperCase() || "XX";
  const airlineName = AIRLINE_NAMES[airlineCode] || result.airline || airlineCode;
  
  // Parse segments for return leg if roundtrip
  let returnLeg: NormalizedFlight["returnLeg"] = undefined;
  
  if (isRoundtrip && Array.isArray(result.segments) && result.segments.length > 1) {
    const returnSegment = result.segments[1] as any;
    if (returnSegment) {
      const returnDepCode = returnSegment.origin || returnSegment.departure || destination;
      const returnArrCode = returnSegment.destination || returnSegment.arrival || result.departureCode;
      
      // Try to extract times from return segment
      const returnDepAt = returnSegment.departure_at || returnSegment.departureAt || null;
      const returnArrAt = returnSegment.arrival_at || returnSegment.arrivalAt || null;
      const returnDepTs = returnSegment.departure_timestamp || returnSegment.departureTimestamp || null;
      const returnArrTs = returnSegment.arrival_timestamp || returnSegment.arrivalTimestamp || null;
      
      const returnDepDate = returnDepAt ? new Date(returnDepAt) : returnDepTs ? new Date(Number(returnDepTs) * 1000) : null;
      const returnArrDate = returnArrAt ? new Date(returnArrAt) : returnArrTs ? new Date(Number(returnArrTs) * 1000) : null;
      
      const returnDepTime = returnDepDate && !isNaN(returnDepDate.getTime())
        ? returnDepDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
        : "";
      const returnArrTime = returnArrDate && !isNaN(returnArrDate.getTime())
        ? returnArrDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
        : "";
      
      const returnDurationMinutes = returnSegment.duration || 
        (returnDepDate && returnArrDate ? Math.round((returnArrDate.getTime() - returnDepDate.getTime()) / 60000) : 0);
      
      returnLeg = {
        departureTime: returnDepTime,
        arrivalTime: returnArrTime,
        originIata: String(returnDepCode).toUpperCase(),
        destinationIata: String(returnArrCode).toUpperCase(),
        duration: formatDuration(returnDurationMinutes),
        durationMinutes: returnDurationMinutes,
        stops: Math.max(0, (result.segments?.length || 1) - 1),
        stopAirports: [],
      };
    }
  }
  
  // Format departure/arrival time to "6:50 AM" style if not already formatted
  let departureTime = result.departureTime || "";
  let arrivalTime = result.arrivalTime || "";
  
  // If times are in 24h format (e.g., "14:30"), convert to 12h format
  if (departureTime && departureTime.match(/^\d{2}:\d{2}$/)) {
    departureTime = formatTo12Hour(departureTime);
  }
  if (arrivalTime && arrivalTime.match(/^\d{2}:\d{2}$/)) {
    arrivalTime = formatTo12Hour(arrivalTime);
  }

  return {
    id: result.id,
    airlineCode,
    airlineName,
    airlineLogo: result.airlineLogo || `https://pics.avs.io/60/60/${airlineCode}.png`,
    flightNumber: result.flightNumber || "",
    originIata: result.departureCode?.toUpperCase() || "",
    destinationIata: result.arrivalCode?.toUpperCase() || "",
    departureTime,
    arrivalTime,
    duration: result.duration || "",
    durationMinutes: result.durationMinutes || 0,
    stops: result.stops || 0,
    stopAirports: [], // Edge function doesn't provide stop airports yet
    returnLeg,
    price: result.price || 0,
    currency: result.currency || "EUR",
    dealsCount: 1,
    isPriceValid: result.price > 0,
    searchId,
    resultsUrl,
    proposalId: result.proposalId || "",
    signature: result.signature || "",
    hasValidBookingUrl: Boolean(searchId && result.proposalId && result.signature),
  };
}

/**
 * Format duration in minutes to "Xh Ym"
 */
function formatDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/**
 * Convert 24h time (14:30) to 12h format (2:30 PM)
 */
function formatTo12Hour(time24: string): string {
  const [hours, minutes] = time24.split(":").map(Number);
  if (isNaN(hours) || isNaN(minutes)) return time24;
  
  const period = hours >= 12 ? "PM" : "AM";
  const hours12 = hours % 12 || 12;
  return `${hours12}:${String(minutes).padStart(2, "0")} ${period}`;
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
  const devSampleLoggedRef = useRef(false);

  const cancelSearch = useCallback(() => {
    cancelRef.current = true;
    setStatus("idle");
    setProgress(0);
  }, []);

  const searchFlights = useCallback(async (params: SearchParams) => {
    // Reset state
    cancelRef.current = false;
    pollCountRef.current = 0;
    devSampleLoggedRef.current = false;
    setFlights([]);
    setError(null);
    setProgress(0);
    setStatus("searching");
    setLiveUnavailable(false);
    clearPersistedSearchContext();

    const isRoundtrip = Boolean(params.returnDate);

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

      while (!cancelRef.current && pollCountRef.current < MAX_POLL_ATTEMPTS) {
        // Check timeout
        if (Date.now() - startTime > POLL_TIMEOUT) {
          if (DEV_MODE) console.log("[LiveSearch] Timeout reached after", (Date.now() - startTime) / 1000, "seconds");
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

        // Process pre-normalized results from live-flight-search
        const results = pollData.results;
        if (Array.isArray(results) && results.length > 0) {
          if (DEV_MODE) {
            console.log(`[LiveSearch] Received ${results.length} pre-normalized results`);
          }

          for (const result of results) {
            const normalized = convertToNormalizedFlight(
              result,
              search_id,
              results_url || "",
              isRoundtrip,
              params.destination
            );
            
            if (!allFlights.has(normalized.id)) {
              allFlights.set(normalized.id, normalized);
            }
          }

          // Dev-only: log sample normalized flight
          if (DEV_MODE && !devSampleLoggedRef.current && allFlights.size > 0) {
            devSampleLoggedRef.current = true;
            const sample = Array.from(allFlights.values())[0];
            console.log("[LiveSearch] normalized sample flight:", {
              id: sample.id,
              departureTime: sample.departureTime || "—",
              arrivalTime: sample.arrivalTime || "—",
              originIata: sample.originIata || "—",
              destinationIata: sample.destinationIata || "—",
              duration: sample.duration || "—",
              durationMinutes: sample.durationMinutes,
              stops: sample.stops,
              airlineName: sample.airlineName || "—",
              airlineLogo: sample.airlineLogo || "—",
              returnLeg: sample.returnLeg ? {
                departureTime: sample.returnLeg.departureTime || "—",
                arrivalTime: sample.returnLeg.arrivalTime || "—",
                originIata: sample.returnLeg.originIata || "—",
                destinationIata: sample.returnLeg.destinationIata || "—",
                duration: sample.returnLeg.duration || "—",
                stops: sample.returnLeg.stops,
              } : "none",
            });
          }

          // Update UI incrementally
          setFlights(Array.from(allFlights.values()));
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
            `[LiveSearch] Data integrity warning: Only ${flightsWithTimes.length}/${finalFlights.length} flights have times.`
          );
        } else if (finalFlights.length > 0) {
          console.log(`[LiveSearch] Data integrity OK: ${flightsWithTimes.length}/${finalFlights.length} flights have times.`);
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