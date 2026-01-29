import { useState, useCallback, useRef } from "react";

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
  // Booking data - required for backend click action
  searchId: string;
  resultsUrl: string;
  proposalId: string | null;
  signature: string | null;
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

// External Supabase project configuration
const EXTERNAL_SUPABASE_URL = "https://ycpqgsjhxzhkljlszbwc.supabase.co";
const EXTERNAL_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljcHFnc2poeHpoa2xqbHN6YndjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNDI2NzAsImV4cCI6MjA4MzkxODY3MH0.Nbm12ODC2-IWgQMR2o6ekcgy3tFL5c3AGJqvdjTO4IU";
const FLIGHT_SEARCH_ENDPOINT = `${EXTERNAL_SUPABASE_URL}/functions/v1/flight-search`;

// Helper to call the external edge function with proper headers
async function callFlightSearchFunction(body: Record<string, unknown>): Promise<{ data: unknown; error: Error | null }> {
  try {
    console.log("[LiveSearch] Calling edge function with body:", body);
    
    const response = await fetch(FLIGHT_SEARCH_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": EXTERNAL_SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${EXTERNAL_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(body),
    });

    console.log("[LiveSearch] Response status:", response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[LiveSearch] Error response body:", errorText);
      return { 
        data: null, 
        error: new Error(`HTTP ${response.status}: ${errorText || response.statusText}`) 
      };
    }

    const data = await response.json();
    console.log("[LiveSearch] Response data:", data);
    return { data, error: null };
  } catch (err) {
    console.error("[LiveSearch] Fetch error:", err);
    return { 
      data: null, 
      error: err instanceof Error ? err : new Error("Network request failed") 
    };
  }
}

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

      // Step 1: Start search
      const { data: startData, error: startError } = await callFlightSearchFunction({
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
      });

      if (startError) {
        console.error("[LiveSearch] Start failed:", startError);
        setError(startError.message || "Failed to start search");
        setStatus("error");
        return;
      }

      const responseData = startData as Record<string, unknown>;

      // Check for live unavailable (API auth issue)
      if (responseData?.liveUnavailable || responseData?.ok === false) {
        if (responseData?.liveUnavailable) {
          console.warn("[LiveSearch] Live results not available");
          setLiveUnavailable(true);
          setStatus("no_results");
          setProgress(100);
          return;
        }
        setError((responseData?.error as string) || "Failed to start search");
        setStatus("error");
        return;
      }

      const search_id = responseData.search_id as string;
      const results_url = responseData.results_url as string;

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
      const storedSearchId = search_id;
      const storedResultsUrl = results_url || '';
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

        const { data: pollData, error: pollError } = await callFlightSearchFunction({
          action: "results",
          search_id,
          results_url,
          last_update_timestamp: lastUpdateTimestamp,
        });

        if (pollError) {
          console.warn("[LiveSearch] Poll error:", pollError);
          continue;
        }

        const pollResponse = pollData as Record<string, unknown>;

        if (pollResponse?.liveUnavailable) {
          console.warn("[LiveSearch] Live unavailable during poll");
          setLiveUnavailable(true);
          break;
        }

        if (pollResponse?.ok === false) {
          console.warn("[LiveSearch] Poll returned error:", pollResponse?.error);
          continue;
        }

        // Update timestamp for next poll
        if (pollResponse?.last_update_timestamp != null) {
          lastUpdateTimestamp = Number(pollResponse.last_update_timestamp);
        }

        // Add new flights with search context
        const results = pollResponse?.results as LiveFlightResult[] | undefined;
        if (results?.length) {
          for (const flight of results) {
            const key = `${flight.departureCode}-${flight.arrivalCode}-${flight.departureTime}-${flight.price}`;
            if (!allFlights.has(key)) {
              // Enrich flight with search context for click action
              allFlights.set(key, {
                ...flight,
                searchId: storedSearchId,
                resultsUrl: storedResultsUrl,
                proposalId: flight.proposalId || null,
                signature: flight.signature || null,
              });
            }
          }
          setFlights(Array.from(allFlights.values()));
        }

        // Check if complete
        if (pollResponse?.is_over === true) {
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
    isDemo: false,
    liveUnavailable,
    searchFlights,
    cancelSearch,
  };
}

// Export function for click action (booking redirect)
export async function handleFlightClick(params: {
  searchId: string;
  proposalId: string;
  signature: string;
  resultsUrl: string;
}): Promise<string | null> {
  console.log("[LiveSearch] Click action with params:", params);
  
  const { data, error } = await callFlightSearchFunction({
    action: "click",
    search_id: params.searchId,
    proposal_id: params.proposalId,
    signature: params.signature,
    results_url: params.resultsUrl,
  });

  if (error) {
    console.error("[LiveSearch] Click action failed:", error);
    return null;
  }

  const response = data as Record<string, unknown>;
  return (response?.url as string) || null;
}
