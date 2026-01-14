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
  isFlexibleDate?: boolean;
  flexibleDepartDate?: string;
}

/**
 * Empty reason types - these describe WHY results are empty
 * - 'far_future': Date is beyond airline publish window (~330 days)
 * - 'no_cached_prices': Aviasales Data API cache is empty for this route (normal for less popular routes)
 * - 'service_unavailable': API/network error
 * - null: Results found or no empty state
 */
export type EmptyReason = 'far_future' | 'no_cached_prices' | 'service_unavailable' | null;

/**
 * Response status types from backend:
 * - 'OK': Success with flights for exact dates
 * - 'OK_FLEXIBLE': Success with flights from flexible date search
 * - 'CACHE_LIMITATION': Date too far in future (not an error)
 * - 'CACHE_EMPTY': No prices in Aviasales cache (not an error, normal for many routes)
 * - 'MISCONFIGURED': Missing token/marker
 * - 'ERROR': Real error (API down, parse failure, etc.)
 * - 'BAD_REQUEST': Invalid parameters
 */
export type ResponseStatus = 
  | 'OK' 
  | 'OK_FLEXIBLE' 
  | 'CACHE_LIMITATION' 
  | 'CACHE_EMPTY' 
  | 'MISCONFIGURED' 
  | 'ERROR' 
  | 'BAD_REQUEST';

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
  flexibleDates?: boolean;
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
  serverDateUTC?: string;
  daysAhead?: number;
  searchParams?: any;
  [key: string]: any;
}

interface ApiResponse {
  status: ResponseStatus;
  flights?: LiveFlight[];
  emptyReason?: EmptyReason;
  message?: string;
  userFriendlyMessage?: string;
  error?: string;
  errorType?: string;
  daysAhead?: number;
  publishWindowDays?: number;
  suggestedSearchDate?: string;
  suggestedReturnDate?: string;
  aviasalesDirectUrl?: string;
  flexibleDatesUsed?: string[];
  flexibleDatesSearched?: string[];
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
  userMessage: string | null;
  suggestedSearchDate: string | null;
  suggestedReturnDate: string | null;
  aviasalesDirectUrl: string | null;
  flexibleDatesUsed: string[];
  debugInfo: DebugInfo | null;
  searchFlights: (params: SearchParams) => Promise<void>;
}

export function useFlightSearch(): UseFlightSearchResult {
  const [flights, setFlights] = useState<LiveFlight[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emptyReason, setEmptyReason] = useState<EmptyReason>(null);
  const [responseStatus, setResponseStatus] = useState<ResponseStatus | null>(null);
  const [userMessage, setUserMessage] = useState<string | null>(null);
  const [suggestedSearchDate, setSuggestedSearchDate] = useState<string | null>(null);
  const [suggestedReturnDate, setSuggestedReturnDate] = useState<string | null>(null);
  const [aviasalesDirectUrl, setAviasalesDirectUrl] = useState<string | null>(null);
  const [flexibleDatesUsed, setFlexibleDatesUsed] = useState<string[]>([]);
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);

  const searchFlights = useCallback(async (params: SearchParams) => {
    setIsLoading(true);
    setError(null);
    setFlights([]);
    setEmptyReason(null);
    setResponseStatus(null);
    setUserMessage(null);
    setSuggestedSearchDate(null);
    setSuggestedReturnDate(null);
    setAviasalesDirectUrl(null);
    setFlexibleDatesUsed([]);
    setDebugInfo(null);

    try {
      console.log("[FlightSearch] Searching with params:", params);
      
      const { data, error: fnError } = await supabase.functions.invoke<ApiResponse>("flights-search", {
        body: { 
          ...params, 
          debug: params.debug || false,
          currency: params.currency || 'usd',
          market: params.market || 'us',
          flexibleDates: params.flexibleDates !== false, // Default true
        },
      });

      // Store debug info if present
      if (data?.debug) {
        console.log("[FlightSearch] Debug info:", data.debug);
        setDebugInfo({
          ...data.debug,
          request: params,
        });
      }

      // Store Aviasales direct URL if present
      if (data?.aviasalesDirectUrl) {
        setAviasalesDirectUrl(data.aviasalesDirectUrl);
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
        userFriendlyMessage: data?.userFriendlyMessage,
      });

      setResponseStatus(data?.status || null);
      setUserMessage(data?.userFriendlyMessage || data?.message || null);

      // Handle different statuses
      switch (data?.status) {
        case 'OK':
          if (data.flights && data.flights.length > 0) {
            setFlights(data.flights);
            setEmptyReason(null);
          } else {
            // Shouldn't happen but handle gracefully
            setFlights([]);
            setEmptyReason('no_cached_prices');
          }
          break;

        case 'OK_FLEXIBLE':
          // Flexible date results found
          if (data.flights && data.flights.length > 0) {
            setFlights(data.flights);
            setFlexibleDatesUsed(data.flexibleDatesUsed || []);
            setEmptyReason(null);
          } else {
            setFlights([]);
            setEmptyReason('no_cached_prices');
          }
          break;

        case 'CACHE_LIMITATION':
          // Date too far in future - NOT an error
          setFlights([]);
          setEmptyReason('far_future');
          setSuggestedSearchDate(data.suggestedSearchDate || null);
          setSuggestedReturnDate(data.suggestedReturnDate || null);
          break;

        case 'CACHE_EMPTY':
          // No cached prices - NOT an error, normal for many routes
          setFlights([]);
          setEmptyReason('no_cached_prices');
          break;

        case 'MISCONFIGURED':
        case 'ERROR':
        case 'BAD_REQUEST':
          // Real errors
          setFlights([]);
          setError(data.userFriendlyMessage || data.error || data.message || 'An error occurred');
          setEmptyReason('service_unavailable');
          break;

        default:
          // Unknown status - treat as potential results
          if (data?.flights?.length > 0) {
            setFlights(data.flights);
          } else {
            setFlights([]);
            setEmptyReason('no_cached_prices');
          }
      }

    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to search flights";
      console.error("[FlightSearch] Error:", message);
      setError(message);
      setEmptyReason('service_unavailable');
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
    userMessage,
    suggestedSearchDate,
    suggestedReturnDate,
    aviasalesDirectUrl,
    flexibleDatesUsed,
    debugInfo, 
    searchFlights 
  };
}
