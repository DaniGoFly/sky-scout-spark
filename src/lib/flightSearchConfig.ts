export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "";

export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

export const FLIGHT_SEARCH_URL = SUPABASE_URL
  ? `${SUPABASE_URL}/functions/v1/flight-search`
  : "";

export const FLIGHT_SEARCH_HEADERS = {
  "content-type": "application/json",
  apikey: SUPABASE_ANON_KEY,
  authorization: `Bearer ${SUPABASE_ANON_KEY}`,
};

/**
 * Runtime validator — call this ONLY when making a request
 */
export function assertSupabaseEnv() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      "Flight search is not configured. Supabase environment variables are missing."
    );
  }
}
