/**
 * Flight Search Configuration
 * SINGLE source of truth for Supabase flight-search endpoint.
 * NO hardcoded URLs allowed – everything derived from VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.
 */

// Strict env-var read – no fallbacks
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Fail fast if missing
if (!SUPABASE_URL) {
  throw new Error("[flightSearchConfig] Missing VITE_SUPABASE_URL environment variable");
}
if (!SUPABASE_ANON_KEY) {
  throw new Error("[flightSearchConfig] Missing VITE_SUPABASE_ANON_KEY environment variable");
}

// Single endpoint – all flight-search calls go here
export const FLIGHT_SEARCH_URL = `${SUPABASE_URL}/functions/v1/flight-search`;

// Required headers (lowercase keys only)
export const FLIGHT_SEARCH_HEADERS: Record<string, string> = {
  "content-type": "application/json",
  "apikey": SUPABASE_ANON_KEY,
  "authorization": `Bearer ${SUPABASE_ANON_KEY}`,
};
