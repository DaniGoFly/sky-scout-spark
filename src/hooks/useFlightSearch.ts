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

/**
 * Empty reason types:
 * - 'far_future': Date is >360 days ahead, airlines haven't published
 * - 'no_cached_prices': Data API cache is empty for this route (normal for less popular routes)
 * - 'no_results': Generic no results (shouldn't be used much now)
 */
export type EmptyReason = 'far_future' | 'no_cached_prices' | 'no_results' | null;

/**
 * Response status types from backend:
 * - 'OK': Success with flights
 * - 'NOT_AVAILABLE_YET': Date too far in future
 * - 'NO_CACHED_PRICES': No prices in Aviasales cache (normal for many routes)
 * - 'TP_ERROR': Travelpayouts returned an error
 * - 'MISCONFIGURED': Missing token/marker
 * - 'ERROR': Generic error
 */
export type ResponseStatus = 'OK' | 'NOT_AVAILABLE_YET' | 'NO_CACHED_PRICES' | 'TP_ERROR' | 'MISCONFIGURED' | 'ERROR' | 'BAD_REQUEST';

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
  currency?: string;
  market?: string;
  debug?: boolean;
}

interface DebugInfo {
  request?: any;
  requestUrl?: string;
  httpStatus?: number;
  httpStatusText?: string;
  responsePreview?: string;
  responseJsonParsed?: any;
  parseError?: string | null;
  timestamp?: string;
  searchParams?: any;
  [key: string]: any;
}

interface ApiResponse {
  status: ResponseStatus;
  flights?: LiveFlight[];
  emptyReason?: EmptyReason;
  message?: string;
  error?: string;
  errorType?: string;
  daysAhead?: number;
  suggestedSearchDate?: string;
  searchParams?: any;
  debug?: DebugInfo;
  httpStatus?: number;
  raw?: any;
}

interface UseFlightSearchResult {
  flights: LiveFlight[];
  isLoading: boolean;
  error: string | null;
  emptyReason: EmptyReason;
  responseStatus: ResponseStatus | null;
  suggestedSearchDate: string | null;
  debugInfo: DebugInfo | null;
  searchFlights: (params: SearchParams) => Promise<void>;
}

export function useFlightSearch(): UseFlightSearchResult {
  const [flights, setFlights] = useState<LiveFlight[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emptyReason, setEmptyReason] = useState<EmptyReason>(null);
  const [responseStatus, setResponseStatus] = useState<ResponseStatus | null>(null);
  const [suggestedSearchDate, setSuggestedSearchDate] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);

  const searchFlights = useCallback(async (params: SearchParams) => {
    setIsLoading(true);
    setError(null);
    setFlights([]);
    setEmptyReason(null);
    setResponseStatus(null);
    setSuggestedSearchDate(null);
    setDebugInfo(null);

    try {
      console.log("[FlightSearch] Searching with params:", params);
      
      const { data, error: fnError } = await supabase.functions.invoke<ApiResponse>("flights-search", {
        body: { 
          ...params, 
          debug: params.debug || false,
          currency: params.currency || 'usd',
          market: params.market || 'us',
        },
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

      console.log("[FlightSearch] Response:", {
        status: data?.status,
        flightCount: data?.flights?.length || 0,
        emptyReason: data?.emptyReason,
        message: data?.message,
      });

      setResponseStatus(data?.status || null);

      // Handle different statuses
      switch (data?.status) {
        case 'OK':
          if (data.flights && data.flights.length > 0) {
            setFlights(data.flights);
            setEmptyReason(null);
          } else {
            // Shouldn't happen but handle gracefully
            setFlights([]);
            setEmptyReason('no_results');
          }
          break;

        case 'NOT_AVAILABLE_YET':
          setFlights([]);
          setEmptyReason('far_future');
          setSuggestedSearchDate(data.suggestedSearchDate || null);
          break;

        case 'NO_CACHED_PRICES':
          setFlights([]);
          setEmptyReason('no_cached_prices');
          break;

        case 'TP_ERROR':
        case 'MISCONFIGURED':
        case 'ERROR':
        case 'BAD_REQUEST':
          setFlights([]);
          setError(data.error || data.message || 'An error occurred while searching for flights');
          setEmptyReason(null);
          break;

        default:
          // Unknown status
          if (data?.flights?.length > 0) {
            setFlights(data.flights);
          } else {
            setFlights([]);
            setEmptyReason('no_results');
          }
      }

    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to search flights";
      console.error("[FlightSearch] Error:", message);
      setError(message);
      setResponseStatus('ERROR');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { 
    flights, 
    isLoading, 
    error, 
    emptyReason, 
    responseStatus,
    suggestedSearchDate,
    debugInfo, 
    searchFlights 
  };
}
