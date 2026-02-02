/**
 * Flight Search Configuration
 * Single source of truth for backend API access
 */

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://ycpqgsjhxzhkljlszbwc.supabase.co";
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_ANON_KEY) {
  console.error("Missing SUPABASE_ANON_KEY - flight search will fail");
}

export const FLIGHT_SEARCH_URL = `${SUPABASE_URL}/functions/v1/flight-search`;

export const FLIGHT_SEARCH_HEADERS: Record<string, string> = {
  "content-type": "application/json",
  "apikey": SUPABASE_ANON_KEY,
  "authorization": `Bearer ${SUPABASE_ANON_KEY}`,
};
