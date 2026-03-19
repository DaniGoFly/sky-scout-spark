const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Extract client IP from headers (Supabase Edge Functions forward this)
  const clientIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    "";

  console.log("[ip-location] Client IP hint:", clientIp || "(not available)");

  // Primary: ipapi.co
  try {
    const url = clientIp
      ? `https://ipapi.co/${clientIp}/json/`
      : "https://ipapi.co/json/";
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      if (
        typeof data.latitude === "number" &&
        typeof data.longitude === "number"
      ) {
        console.log("[ip-location] ipapi.co success:", data.latitude, data.longitude, data.city);
        return new Response(
          JSON.stringify({
            latitude: data.latitude,
            longitude: data.longitude,
            city: data.city ?? null,
            country: data.country_name ?? null,
            source: "IP_PRIMARY",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }
    console.log("[ip-location] ipapi.co returned no coords, trying backup");
  } catch (e) {
    console.log("[ip-location] ipapi.co failed:", e.message);
  }

  // Backup: ipwho.is
  try {
    const url = clientIp ? `https://ipwho.is/${clientIp}` : "https://ipwho.is/";
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      if (
        data.success !== false &&
        typeof data.latitude === "number" &&
        typeof data.longitude === "number"
      ) {
        console.log("[ip-location] ipwho.is success:", data.latitude, data.longitude, data.city);
        return new Response(
          JSON.stringify({
            latitude: data.latitude,
            longitude: data.longitude,
            city: data.city ?? null,
            country: data.country ?? null,
            source: "IP_BACKUP",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }
    console.log("[ip-location] ipwho.is returned no coords");
  } catch (e) {
    console.log("[ip-location] ipwho.is failed:", e.message);
  }

  // Both failed
  return new Response(
    JSON.stringify({ error: "All IP location providers failed", latitude: null, longitude: null }),
    { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
