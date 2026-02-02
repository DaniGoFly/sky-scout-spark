/**
 * Flight Search Configuration
 * Single source of truth for flight search API access
 * 
 * The flight search backend may run on a dedicated Supabase project.
 * Configure via environment variables:
 * - VITE_FLIGHT_API_URL: The Supabase project URL for flight search (optional, falls back to VITE_SUPABASE_URL)
 * - VITE_FLIGHT_API_KEY: The Supabase anon key for flight search (optional, falls back to VITE_SUPABASE_ANON_KEY)
 */

// Flight API configuration from environment variables
export const FLIGHT_API_URL = (import.meta.env.VITE_FLIGHT_API_URL || import.meta.env.VITE_SUPABASE_URL) as string;
export const FLIGHT_API_KEY = (import.meta.env.VITE_FLIGHT_API_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY) as string;

// The single flight search endpoint
export const FLIGHT_SEARCH_URL = `${FLIGHT_API_URL}/functions/v1/flight-search`;

// Required headers for all flight search requests (lowercase keys only)
export const FLIGHT_SEARCH_HEADERS: Record<string, string> = {
  "content-type": "application/json",
  "apikey": FLIGHT_API_KEY,
  "authorization": `Bearer ${FLIGHT_API_KEY}`,
};
