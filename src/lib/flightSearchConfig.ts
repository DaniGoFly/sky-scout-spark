/**
 * Flight Search Configuration
 *
 * Points to the YCP Supabase project where the
 * Travelpayouts flight-search edge function is deployed.
 */

const YCP_SUPABASE_URL = "https://ycpqgsjhxzhkljlszbwc.supabase.co";
const YCP_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljcHFnc2poeHpoa2xqbHN6YndjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNDI2NzAsImV4cCI6MjA4MzkxODY3MH0.Nbm12ODC2-IWgQMR2o6ekcgy3tFL5c3AGJqvdjTO4IU";

export const FLIGHT_SEARCH_URL = `${YCP_SUPABASE_URL}/functions/v1/flight-search`;

export const FLIGHT_SEARCH_HEADERS: Record<string, string> = {
  "Content-Type": "application/json",
  apikey: YCP_ANON_KEY,
  Authorization: `Bearer ${YCP_ANON_KEY}`,
};
