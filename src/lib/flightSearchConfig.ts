/**
 * Flight Search Configuration
 *
 * Points to the YCP Supabase project where the
 * Travelpayouts flight-search edge function is deployed.
 */

const YCP_SUPABASE_URL = "https://ycpqgsjhxzhkljlszbwc.supabase.co";
const YCP_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljcHFnc2poeHpoa2xqbHN6YndjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNDI2NzAsImV4cCI6MjA4MzkxODY3MH0.Nbm12ODC2-IWgQMR2o6ekcgy3tFL5c3AGJqvdjTO4IU";

// Feature flag: route search + click through the provider-based aggregator
// (supabase/functions/flight-search-aggregator on the primary project).
// Response shape is a superset of the legacy flight-search shape so the UI
// keeps working. Default false to preserve the current Aviasales-direct path
// until the aggregator has been smoke-tested; flip to true to activate merged
// multi-provider search.
export const USE_PROVIDER_AGGREGATOR = false;

const PRIMARY_SUPABASE_URL = "https://kvhykvuvsbmcselojbcn.supabase.co";
const PRIMARY_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2aHlrdnV2c2JtY3NlbG9qYmNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0NzEzODAsImV4cCI6MjA4MzA0NzM4MH0.ChYyprBwbeebvr9nr1xGuexrmciMqIsA2irToTCEQUc";

export const FLIGHT_SEARCH_URL = USE_PROVIDER_AGGREGATOR
  ? `${PRIMARY_SUPABASE_URL}/functions/v1/flight-search-aggregator`
  : `${YCP_SUPABASE_URL}/functions/v1/flight-search`;

const ACTIVE_KEY = USE_PROVIDER_AGGREGATOR ? PRIMARY_ANON_KEY : YCP_ANON_KEY;

export const FLIGHT_SEARCH_HEADERS: Record<string, string> = {
  "Content-Type": "application/json",
  apikey: ACTIVE_KEY,
  Authorization: `Bearer ${ACTIVE_KEY}`,
};
