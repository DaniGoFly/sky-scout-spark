import { useState, useCallback } from 'react';
import { generateMockHotels, Hotel } from '@/lib/mockHotels';

export interface HotelSearchParams {
  destination: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
}

export function useHotelSearch() {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const searchHotels = useCallback(async (params: HotelSearchParams) => {
    setIsLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const results = generateMockHotels(params);
      setHotels(results);
    } catch (err) {
      setError('Failed to search hotels. Please try again.');
      setHotels([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    setHotels([]);
    setHasSearched(false);
    setError(null);
  }, []);

  return {
    hotels,
    isLoading,
    error,
    hasSearched,
    searchHotels,
    clearResults,
  };
}
