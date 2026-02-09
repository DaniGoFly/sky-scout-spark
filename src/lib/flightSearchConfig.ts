/**
 * Flight Search Configuration
 * 
 * Uses environment variables for the Supabase project URL and anon key.
 * The flight-search edge function is deployed on the Lovable Cloud project.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

export const FLIGHT_SEARCH_URL = `${SUPABASE_URL}/functions/v1/flight-search`;

export const FLIGHT_SEARCH_HEADERS: Record<string, string> = {
  "Content-Type": "application/json",
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
};
