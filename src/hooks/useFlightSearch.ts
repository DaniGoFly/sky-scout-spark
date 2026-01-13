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
}

interface UseFlightSearchResult {
  flights: LiveFlight[];
  isLoading: boolean;
  error: string | null;
  searchFlights: (params: SearchParams) => Promise<void>;
}

export function useFlightSearch(): UseFlightSearchResult {
  const [flights, setFlights] = useState<LiveFlight[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchFlights = useCallback(async (params: SearchParams) => {
    setIsLoading(true);
    setError(null);
    setFlights([]);

    try {
      console.log("Searching flights with Travelpayouts API:", params);
      
      const { data, error: fnError } = await supabase.functions.invoke("flights-search", {
        body: params,
      });

      if (fnError) {
        console.error("Edge function error:", fnError);
        throw new Error(fnError.message || "Failed to search flights");
      }

      if (data?.error) {
        console.error("API error:", data.error);
        throw new Error(data.error);
      }

      console.log("Flight search results:", data);
      
      if (data?.flights?.length > 0) {
        setFlights(data.flights);
      } else {
        // No results - show empty state (not an error)
        setFlights([]);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to search flights";
      console.error("Flight search error:", message);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { flights, isLoading, error, searchFlights };
}
