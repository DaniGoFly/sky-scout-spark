export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Missing Supabase environment variables");
}

export const FLIGHT_SEARCH_URL =
  `${SUPABASE_URL}/functions/v1/flight-search`;

export const FLIGHT_SEARCH_HEADERS = {
  "content-type": "application/json",
  "apikey": SUPABASE_ANON_KEY,
  "authorization": `Bearer ${SUPABASE_ANON_KEY}`
};
