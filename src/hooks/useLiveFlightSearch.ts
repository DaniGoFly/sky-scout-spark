import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

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
  deepLink: string;
  gateId?: string;
  isLive: boolean;
}

export type SearchStatus = 
  | 'idle'
  | 'creating'
  | 'polling'
  | 'complete'
  | 'error'
  | 'no_results';

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
  progress: number; // 0-100
  isSearching: boolean;
  searchFlights: (params: SearchParams) => Promise<void>;
  cancelSearch: () => void;
}

const POLL_INTERVAL = 1500; // 1.5 seconds between polls
const MAX_POLL_ATTEMPTS = 40; // ~60 seconds max polling
const POLL_TIMEOUT = 90000; // 90 second absolute timeout

export function useLiveFlightSearch(): UseLiveFlightSearchResult {
  const [flights, setFlights] = useState<LiveFlightResult[]>([]);
  const [status, setStatus] = useState<SearchStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  
  const cancelRef = useRef(false);
  const pollCountRef = useRef(0);

  const cancelSearch = useCallback(() => {
    cancelRef.current = true;
    setStatus('idle');
    setProgress(0);
  }, []);

  const searchFlights = useCallback(async (params: SearchParams) => {
    // Reset state
    cancelRef.current = false;
    pollCountRef.current = 0;
    setFlights([]);
    setError(null);
    setProgress(0);
    setStatus('creating');

    try {
      console.log('[LiveSearch] Starting search:', params);

      // Step 1: Create search
      const { data: createData, error: createError } = await supabase.functions.invoke(
        'live-flight-search',
        {
          body: {
            action: 'create',
            origin: params.origin,
            destination: params.destination,
            departDate: params.departDate,
            returnDate: params.returnDate,
            adults: params.adults || 1,
            children: params.children || 0,
            infants: params.infants || 0,
            tripClass: params.tripClass || 'Y',
            currency: params.currency || 'USD'
          }
        }
      );

      if (createError || !createData?.searchId) {
        console.error('[LiveSearch] Create failed:', createError || createData);
        setError(createData?.error || createError?.message || 'Failed to start search');
        setStatus('error');
        return;
      }

      const searchId = createData.searchId;
      console.log('[LiveSearch] Search created:', searchId);
      setProgress(10);

      // Step 2: Poll for results
      setStatus('polling');
      const allFlights = new Map<string, LiveFlightResult>();
      const startTime = Date.now();

      while (!cancelRef.current && pollCountRef.current < MAX_POLL_ATTEMPTS) {
        // Check absolute timeout
        if (Date.now() - startTime > POLL_TIMEOUT) {
          console.log('[LiveSearch] Timeout reached');
          break;
        }

        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
        
        if (cancelRef.current) break;

        pollCountRef.current++;
        const progressPercent = Math.min(10 + (pollCountRef.current / MAX_POLL_ATTEMPTS) * 85, 95);
        setProgress(progressPercent);

        console.log('[LiveSearch] Polling attempt:', pollCountRef.current);

        const { data: pollData, error: pollError } = await supabase.functions.invoke(
          'live-flight-search',
          {
            body: {
              action: 'poll',
              searchId
            }
          }
        );

        if (pollError) {
          console.warn('[LiveSearch] Poll error:', pollError);
          continue; // Keep trying
        }

        // Add new flights
        if (pollData?.flights?.length > 0) {
          for (const flight of pollData.flights) {
            // Use price+route as key for deduplication
            const key = `${flight.departureCode}-${flight.arrivalCode}-${flight.departureTime}-${flight.price}`;
            if (!allFlights.has(key)) {
              allFlights.set(key, flight);
            }
          }
          // Update UI with accumulated flights
          setFlights(Array.from(allFlights.values()));
        }

        // Check if complete
        if (pollData?.isComplete) {
          console.log('[LiveSearch] Search complete');
          break;
        }
      }

      // Finalize
      setProgress(100);
      const finalFlights = Array.from(allFlights.values());
      
      if (finalFlights.length === 0) {
        setStatus('no_results');
      } else {
        // Sort by price
        finalFlights.sort((a, b) => a.price - b.price);
        setFlights(finalFlights);
        setStatus('complete');
      }

      console.log('[LiveSearch] Final result:', finalFlights.length, 'flights');

    } catch (err) {
      console.error('[LiveSearch] Error:', err);
      setError(err instanceof Error ? err.message : 'Search failed');
      setStatus('error');
    }
  }, []);

  return {
    flights,
    status,
    error,
    progress,
    isSearching: status === 'creating' || status === 'polling',
    searchFlights,
    cancelSearch
  };
}
