/**
 * Flight Search API Configuration
 * 
 * SINGLE SOURCE OF TRUTH for the external Supabase project
 * used for flight search functionality.
 */

// External Supabase project for flight search
export const FLIGHT_SEARCH_SUPABASE_URL = "https://ycpqgsjhxzhkljlszbwc.supabase.co";
export const FLIGHT_SEARCH_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljcHFnc2poeHpoa2xqbHN6YndjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM0NDMxNzAsImV4cCI6MjA1OTAxOTE3MH0.2e99RmdP8sNmB7QGelMgSxsFxBb12pmyhJcgZD5274E";

// Endpoint (singular "flight-search")
export const FLIGHT_SEARCH_ENDPOINT = `${FLIGHT_SEARCH_SUPABASE_URL}/functions/v1/flight-search`;

/**
 * Get headers for flight search API requests
 */
export function getFlightSearchHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "apikey": FLIGHT_SEARCH_ANON_KEY,
    "Authorization": `Bearer ${FLIGHT_SEARCH_ANON_KEY}`,
  };
}
