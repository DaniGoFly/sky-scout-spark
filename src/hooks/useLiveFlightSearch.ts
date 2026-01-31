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
 * Common airline code to name mapping
 */
const AIRLINE_NAMES: Record<string, string> = {
  AA: "American Airlines",
  AC: "Air Canada",
  AF: "Air France",
  AS: "Alaska Airlines",
  AY: "Finnair",
  AZ: "ITA Airways",
  BA: "British Airways",
  CX: "Cathay Pacific",
  DE: "Condor",
  DL: "Delta Air Lines",
  EK: "Emirates",
  EW: "Eurowings",
  EY: "Etihad Airways",
  F9: "Frontier Airlines",
  IB: "Iberia",
  JL: "Japan Airlines",
  KL: "KLM",
  LH: "Lufthansa",
  LO: "LOT Polish Airlines",
  LX: "SWISS",
  NK: "Spirit Airlines",
  OS: "Austrian Airlines",
  QF: "Qantas",
  QR: "Qatar Airways",
  SK: "SAS",
  SQ: "Singapore Airlines",
  TK: "Turkish Airlines",
  UA: "United Airlines",
  VS: "Virgin Atlantic",
  WN: "Southwest Airlines",
  WS: "WestJet",
  X3: "TUI fly",
};

function getAirlineName(code: string): string {
  const upperCode = code?.toUpperCase() || "";
  return AIRLINE_NAMES[upperCode] || upperCode;
}

/**
 * Processed flight result for UI display
 */
export interface LiveFlightResult {
  id: string;
  /** Airline code like "AA" (best-effort) */
  airlineCode: string;
  /** Airline display name if available; fallback to code */
  airline: string;
  /** Optional; UI should provide a text/avatar fallback */
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
 * Safely get a nested property with optional chaining and default
 */
function safeGet<T>(value: T | null | undefined, defaultValue: T): T {
  return value ?? defaultValue;
}

/**
 * Parse tickets from API response into UI-friendly format
 * DEFENSIVE: Handles missing/incomplete data gracefully
 */
function parseTicketsToFlights(
  tickets: Ticket[] | undefined | null,
  flightInfoMap: Record<number, { departure: string; arrival: string; departureTime: string; arrivalTime: string; airline: string; duration: number }>,
  searchId: string,
  resultsUrl: string,
  defaultOrigin: string,
  defaultDestination: string
): LiveFlightResult[] {
  const flights: LiveFlightResult[] = [];

  // DEFENSIVE: Return empty if no tickets
  if (!tickets || !Array.isArray(tickets)) {
    console.warn("[parseTickets] No valid tickets array");
    return flights;
  }

  for (const ticket of tickets) {
    // DEFENSIVE: Skip if ticket is invalid
    if (!ticket || typeof ticket !== "object") {
      continue;
    }

    // DEFENSIVE: Ensure proposals exist
    const proposals = ticket.proposals;
    if (!proposals || !Array.isArray(proposals) || proposals.length === 0) {
      continue;
    }

    // DEFENSIVE: Ensure signature exists (required for click)
    const ticketSignature = ticket.signature;
    if (!ticketSignature || typeof ticketSignature !== "string") {
      continue;
    }

    for (const proposal of proposals) {
      // DEFENSIVE: Skip if proposal is invalid
      if (!proposal || typeof proposal !== "object") {
        continue;
      }

      // DEFENSIVE: Ensure proposal has ID (required for click)
      if (!proposal.id) {
        continue;
      }

      // DEFENSIVE: Ensure proposal has price
      const priceValue = proposal.price_per_person?.value ?? proposal.price?.value ?? 0;
      if (priceValue <= 0) {
        continue; // Skip offers with invalid price
      }

      const key = `${proposal.id}-${ticketSignature}`;
      
      // DEFENSIVE: Get first segment safely
      const segments = ticket.segments;
      const firstSegment = Array.isArray(segments) && segments.length > 0 ? segments[0] : null;
      const segmentFlights = firstSegment?.flights;
      const firstFlightIdx = Array.isArray(segmentFlights) && segmentFlights.length > 0 ? segmentFlights[0] : undefined;
      const lastFlightIdx = Array.isArray(segmentFlights) && segmentFlights.length > 0 
        ? segmentFlights[segmentFlights.length - 1] 
        : undefined;
      
      // DEFENSIVE: Get flight info with fallbacks
      const firstFlightInfo = firstFlightIdx !== undefined ? flightInfoMap[firstFlightIdx] : undefined;
      const lastFlightInfo = lastFlightIdx !== undefined ? flightInfoMap[lastFlightIdx] : undefined;

      // Always render IATA codes (use defaults if flight_info is missing)
      const departureCode = firstFlightInfo?.departure || defaultOrigin;
      const arrivalCode = lastFlightInfo?.arrival || defaultDestination;

      // Times are optional; never normalize to placeholders like "--:--"
      const departureTime = firstFlightInfo?.departureTime && firstFlightInfo.departureTime !== "--:--" ? firstFlightInfo.departureTime : "";
      const arrivalTime = lastFlightInfo?.arrivalTime && lastFlightInfo.arrivalTime !== "--:--" ? lastFlightInfo.arrivalTime : "";
      
      // Count stops (connections in outbound segment)
      const stops = firstSegment && Array.isArray(segmentFlights) 
        ? Math.max(0, segmentFlights.length - 1) 
        : 0;
      
      // DEFENSIVE: Get airline from flight terms safely
      const flightTerms = proposal.flight_terms;
      const flightTermKeys = flightTerms && typeof flightTerms === "object" ? Object.keys(flightTerms) : [];
      const firstTermKey = flightTermKeys[0];
      const firstTerm = firstTermKey ? flightTerms?.[firstTermKey] : undefined;
      const carrierCode = firstTerm?.marketing_carrier_designator?.carrier || 
                         firstFlightInfo?.airline || 
                         "XX";
      const flightNumber = firstTerm?.marketing_carrier_designator?.number || "";
      
      // Calculate total duration for outbound
      let totalDuration = 0;
      if (firstSegment && Array.isArray(segmentFlights)) {
        for (const flightIdx of segmentFlights) {
          const info = flightInfoMap[flightIdx];
          if (info?.duration) totalDuration += info.duration;
        }
      }

      // Duration is optional; never normalize to placeholder "--"
      const durationText = totalDuration > 0 ? formatDuration(totalDuration) : "";

      const upperCarrierCode = carrierCode.toUpperCase();

      const flight: LiveFlightResult = {
        id: key,
        airlineCode: upperCarrierCode,
        airline: getAirlineName(upperCarrierCode),
        airlineLogo: upperCarrierCode && upperCarrierCode !== "XX" ? `https://pics.avs.io/60/60/${upperCarrierCode}.png` : "",
        flightNumber: flightNumber ? `${upperCarrierCode}${flightNumber}` : "",
        departureTime,
        arrivalTime,
        departureCode,
        arrivalCode,
        duration: durationText,
        durationMinutes: totalDuration,
        stops,
        price: Math.round(priceValue),
        currency: proposal.price_per_person?.currency_code || proposal.price?.currency_code || "EUR",
        // All booking metadata required for click
        searchId,
        resultsUrl,
        proposalId: proposal.id,
        signature: ticketSignature,
      };

      flights.push(flight);
    }
  }

  console.log(`[parseTickets] Parsed ${flights.length} valid flights from ${tickets.length} tickets`);
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

  try {
    const response = await clickBooking(params);

    if (!response.ok || !response.data) {
      console.error("[FlightClick] Click action failed:", response.error);
      return null;
    }

    // Backend may return different key names; accept common variants without changing backend.
    const raw = response.data as any;
    const url: unknown = raw?.url ?? raw?.provider_url ?? raw?.providerUrl;

    if (typeof url !== "string" || url.length < 8) {
      console.error("[FlightClick] No valid URL in response:", response.data);
      return null;
    }

    console.log("[FlightClick] Got redirect URL:", url);
    return url;
  } catch (e) {
    console.error("[FlightClick] Unexpected error:", e);
    return null;
  }
}
