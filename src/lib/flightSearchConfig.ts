/**
 * Flight Search Configuration
 * Single source of truth for backend API access
 */

// IMPORTANT:
// These must be the ONLY source of truth. Do not hardcode values or add fallbacks.
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const FLIGHT_SEARCH_URL = `${SUPABASE_URL}/functions/v1/flight-search`;

export const FLIGHT_SEARCH_HEADERS: Record<string, string> = {
  "content-type": "application/json",
  "apikey": SUPABASE_ANON_KEY,
  "authorization": `Bearer ${SUPABASE_ANON_KEY}`,
};
