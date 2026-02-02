/**
 * Flight Search Configuration
 * Single source of truth for flight search API access
 */

// Environment variables - ONLY source of truth
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
export const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) as string;

// Runtime validation
if (!SUPABASE_URL) {
  throw new Error("Missing VITE_SUPABASE_URL environment variable");
}
if (!SUPABASE_ANON_KEY) {
  throw new Error("Missing VITE_SUPABASE_ANON_KEY or VITE_SUPABASE_PUBLISHABLE_KEY environment variable");
}

// Single flight search endpoint
export const FLIGHT_SEARCH_URL = `${SUPABASE_URL}/functions/v1/flight-search`;

// Required headers (lowercase keys only)
export const FLIGHT_SEARCH_HEADERS: Record<string, string> = {
  "content-type": "application/json",
  "apikey": SUPABASE_ANON_KEY,
  "authorization": `Bearer ${SUPABASE_ANON_KEY}`,
};
