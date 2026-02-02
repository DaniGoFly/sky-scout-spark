/**
 * Flight Search Configuration (SINGLE SOURCE OF TRUTH)
 *
 * NOTE: This flight-search backend is an EXTERNAL project.
 * Per requirement: hardcode URL + anon key, no env vars.
 */

export const SUPABASE_URL = "https://ycpqgsjhxzhkljlszbwc.supabase.co";

export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljcHFnc2poeHpoa2xqbHN6YndjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNDI2NzAsImV4cCI6MjA4MzkxODY3MH0.Nbm12ODC2-IWgQMR2o6ekcgy3tFL5c3AGJqvdjTO4IU";

export const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/flight-search`;

function isDevRuntime(): boolean {
  // Avoid import.meta.env per requirement.
  try {
    const host = window.location.hostname;
    return host === "localhost" || host.endsWith(".lovableproject.com") || host.endsWith(".lovable.app");
  } catch {
    return false;
  }
}

export function EDGE_HEADERS(): Record<string, string> {
  if (!SUPABASE_ANON_KEY || !SUPABASE_ANON_KEY.startsWith("eyJ")) {
    throw new Error("Supabase anon key missing or invalid at runtime");
  }

  // Debug logging (dev only)
  if (isDevRuntime()) {
    console.log("EDGE URL", EDGE_FUNCTION_URL);
    console.log("AUTH HEADER", `Bearer ${SUPABASE_ANON_KEY.substring(0, 12)}...`);
  }

  return {
    "content-type": "application/json",
    "apikey": SUPABASE_ANON_KEY,
    "authorization": `Bearer ${SUPABASE_ANON_KEY}`,
  };
}
