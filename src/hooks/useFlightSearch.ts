import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { generateMockFlights } from "@/lib/mockFlights";

// Set to false to use live Travelpayouts API
const USE_MOCK_DATA = false;

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
  isUsingMockData: boolean;
}

export function useFlightSearch(): UseFlightSearchResult {
  const [flights, setFlights] = useState<LiveFlight[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUsingMockData, setIsUsingMockData] = useState(USE_MOCK_DATA);

  const generateMockFlightsData = useCallback((params: SearchParams): LiveFlight[] => {
    const mockFlights = generateMockFlights({
      from: params.origin,
      to: params.destination,
      depart: params.departDate,
      adults: params.adults,
    });

    // Transform mock flights to LiveFlight format
    return mockFlights.map((flight, index) => {
      // Parse duration to minutes
      const durationMatch = flight.duration.match(/(\d+)h\s*(\d+)?m?/);
      const durationMinutes = durationMatch 
        ? parseInt(durationMatch[1]) * 60 + (parseInt(durationMatch[2]) || 0)
        : 0;

      return {
        id: `mock-${flight.id}-${index}`,
        airline: flight.airline,
        airlineLogo: flight.airlineLogo,
        flightNumber: `FL${1000 + flight.id}`,
        departureTime: flight.departureTime,
        arrivalTime: flight.arrivalTime.replace("+1", ""),
        departureCode: flight.departureCode,
        arrivalCode: flight.arrivalCode,
        duration: flight.duration,
        durationMinutes,
        stops: flight.stopsCount,
        price: flight.price,
        deepLink: "#", // Placeholder for internal booking flow
        returnAt: params.returnDate || null,
      };
    });
  }, []);

  const searchFlights = useCallback(async (params: SearchParams) => {
    setIsLoading(true);
    setError(null);
    setFlights([]);

    // Use mock data if flag is set
    if (USE_MOCK_DATA) {
      console.log("Using mock flight data (API approval pending)");
      // Simulate network delay for realistic UX
      await new Promise(resolve => setTimeout(resolve, 800));
      const mockData = generateMockFlightsData(params);
      setFlights(mockData);
      setIsUsingMockData(true);
      setIsLoading(false);
      return;
    }

    try {
      console.log("Searching flights with params:", params);
      
      const { data, error: fnError } = await supabase.functions.invoke("flights-search", {
        body: params,
      });

      if (fnError) {
        console.error("Edge function error:", fnError);
        throw new Error(fnError.message || "Failed to search flights");
      }

      if (data?.error) {
        console.error("API error:", data.error);
        // Fallback to mock data on API error
        console.log("Falling back to mock data due to API error");
        const mockData = generateMockFlightsData(params);
        setFlights(mockData);
        setIsUsingMockData(true);
        return;
      }

      console.log("Flight search results:", data);
      
      if (data?.flights?.length > 0) {
        setFlights(data.flights);
        setIsUsingMockData(false);
      } else {
        // No results from API, use mock data
        console.log("No API results, using mock data");
        const mockData = generateMockFlightsData(params);
        setFlights(mockData);
        setIsUsingMockData(true);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to search flights";
      console.error("Flight search error:", message);
      
      // Fallback to mock data on any error
      console.log("Falling back to mock data due to error:", message);
      const mockData = generateMockFlightsData(params);
      setFlights(mockData);
      setIsUsingMockData(true);
    } finally {
      setIsLoading(false);
    }
  }, [generateMockFlightsData]);

  return { flights, isLoading, error, searchFlights, isUsingMockData };
}
