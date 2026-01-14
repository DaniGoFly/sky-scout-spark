import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface LiveFlight {
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
  deepLink: string;
  returnAt: string | null;
}

export type EmptyReason = 'far_future' | 'no_results' | null;

interface SearchParams {
  origin: string;
  destination: string;
  departDate: string;
  returnDate?: string;
  adults: number;
  children?: number;
  infants?: number;
  tripType: string;
  travelClass?: string;
  debug?: boolean;
}

interface DebugInfo {
  request?: any;
  url?: string;
  status?: number;
  rawResponse?: any;
  timestamp?: string;
}

interface UseFlightSearchResult {
  flights: LiveFlight[];
  isLoading: boolean;
  error: string | null;
  emptyReason: EmptyReason;
  debugInfo: DebugInfo | null;
  searchFlights: (params: SearchParams) => Promise<void>;
}

export function useFlightSearch(): UseFlightSearchResult {
  const [flights, setFlights] = useState<LiveFlight[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emptyReason, setEmptyReason] = useState<EmptyReason>(null);
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);

  const searchFlights = useCallback(async (params: SearchParams) => {
    setIsLoading(true);
    setError(null);
    setFlights([]);
    setEmptyReason(null);
    setDebugInfo(null);

    try {
      console.log("[FlightSearch] Searching with params:", params);
      
      const { data, error: fnError } = await supabase.functions.invoke("flights-search", {
        body: { ...params, debug: params.debug || false },
      });

      // Store debug info if present
      if (data?.debug) {
        console.log("[FlightSearch] Debug info:", data.debug);
        setDebugInfo({
          ...data.debug,
          request: params,
          timestamp: new Date().toISOString(),
        });
      }

      if (fnError) {
        console.error("[FlightSearch] Edge function error:", fnError);
        throw new Error(fnError.message || "Failed to search flights");
      }

      if (data?.error) {
        console.error("[FlightSearch] API error:", data.error);
        throw new Error(data.error);
      }

      console.log("[FlightSearch] Results:", {
        flightCount: data?.flights?.length || 0,
        emptyReason: data?.emptyReason,
        status: data?.status,
      });
      
      if (data?.flights?.length > 0) {
        setFlights(data.flights);
        setEmptyReason(null);
      } else {
        // No results - determine why
        setFlights([]);
        
        // Check for NO_PRICING_YET status or emptyReason
        if (data?.status === 'NO_PRICING_YET' || data?.emptyReason === 'far_future') {
          setEmptyReason('far_future');
        } else {
          setEmptyReason('no_results');
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to search flights";
      console.error("[FlightSearch] Error:", message);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { flights, isLoading, error, emptyReason, debugInfo, searchFlights };
}
