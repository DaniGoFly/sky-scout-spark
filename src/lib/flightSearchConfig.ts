/**
 * Flight Search API Configuration
 * 
 * SINGLE SOURCE OF TRUTH for the external Supabase project
 * used for flight search functionality.
 * 
 * IMPORTANT: Anon key is HARDCODED - do not use env variables
 */

// External Supabase project for flight search
export const FLIGHT_SEARCH_SUPABASE_URL = "https://ycpqgsjhxzhkljlszbwc.supabase.co";

// HARDCODED anon key - DO NOT use process.env or import.meta.env
export const FLIGHT_SEARCH_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljcHFnc2poeHpoa2xqbHN6YndjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM0NDMxNzAsImV4cCI6MjA1OTAxOTE3MH0.2e99RmdP8sNmB7QGelMgSxsFxBb12pmyhJcgZD5274E";

// Endpoint (singular "flight-search")
export const FLIGHT_SEARCH_ENDPOINT = `${FLIGHT_SEARCH_SUPABASE_URL}/functions/v1/flight-search`;

/**
 * Validate anon key exists at runtime
 */
export function validateAnonKey(): void {
  if (!FLIGHT_SEARCH_ANON_KEY || FLIGHT_SEARCH_ANON_KEY.length < 100) {
    throw new Error("Anon key missing in frontend runtime");
  }
}

/**
 * Get headers for flight search API requests
 * Uses lowercase header names for maximum compatibility
 */
export function getFlightSearchHeaders(): Record<string, string> {
  // Validate before returning headers
  validateAnonKey();
  
  // Log for debugging
  console.log("AUTH HEADER", FLIGHT_SEARCH_ANON_KEY);
  
  return {
    "content-type": "application/json",
    "apikey": FLIGHT_SEARCH_ANON_KEY,
    "authorization": `Bearer ${FLIGHT_SEARCH_ANON_KEY}`,
  };
}
