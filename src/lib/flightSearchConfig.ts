import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabaseClient";

export const FLIGHT_SEARCH_URL = `${SUPABASE_URL}/functions/v1/flight-search`;

export const FLIGHT_SEARCH_HEADERS = {
  "Content-Type": "application/json",
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
};
