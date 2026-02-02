/**
 * Flight Search Configuration (SINGLE SOURCE OF TRUTH)
 *
 * Hardcoded per requirement (no env vars, no runtime overrides).
 */

export const SUPABASE_URL = "https://ycpqgsjhxzhkljlszbwc.supabase.co";

export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljcHFnc2poeHpoa2xqbHN6YndjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNDI2NzAsImV4cCI6MjA4MzkxODY3MH0.Nbm12ODC2-IWgQMR2o6ekcgy3tFL5c3AGJqvdjTO4IU";

export const FLIGHT_SEARCH_URL = `${SUPABASE_URL}/functions/v1/flight-search`;

// Lowercase keys only (required)
export const FLIGHT_SEARCH_HEADERS = {
  "content-type": "application/json",
  apikey: SUPABASE_ANON_KEY,
  authorization: `Bearer ${SUPABASE_ANON_KEY}`,
} as const;
