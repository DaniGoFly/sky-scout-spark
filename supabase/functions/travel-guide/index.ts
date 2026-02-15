import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonOk(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function jsonErr(error: string, status = 500, details?: string) {
  return new Response(
    JSON.stringify({ ok: false, error, ...(details ? { details } : {}) }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return jsonErr("AI service not configured", 500, "LOVABLE_API_KEY missing");
    }

    const body = await req.json();
    const {
      destination = "",
      origin = "",
      startDate = null,
      endDate = null,
      travelers = 1,
      budget = "flexible",
      interests = [],
      language = "auto",
      currency = "auto",
    } = body;

    if (!destination) {
      return jsonErr("Destination is required", 400);
    }

    const systemPrompt = `You are GoFlyFinder's AI Travel Guide. Generate a structured travel guide as JSON.

Rules:
- NEVER mention competitor sites (Google Flights, Skyscanner, Kayak, Expedia)
- Only refer users to GoFlyFinder for booking
- Be concise, practical, and inspiring
- Tailor to the traveler's budget: ${budget}
- Tailor to interests: ${interests.length > 0 ? interests.join(", ") : "general sightseeing"}
${language !== "auto" ? `- Respond in: ${language}` : "- Respond in the user's likely language based on destination/origin"}
${currency !== "auto" ? `- Use currency: ${currency}` : "- Use EUR for Europe, USD for Americas, local currency otherwise"}

You MUST respond with ONLY valid JSON (no markdown, no backticks) in this exact format:
{
  "summary": "2-3 sentence overview of the destination",
  "bestTimeToGo": "Best months/season to visit and why",
  "dailyPlan": [
    {"day": 1, "title": "Day theme", "items": ["Activity 1", "Activity 2", "Activity 3"]}
  ],
  "mustSee": ["Top attraction 1", "Top attraction 2", "Top attraction 3"],
  "foodToTry": ["Local dish 1", "Local dish 2", "Local dish 3"],
  "localTips": ["Practical tip 1", "Practical tip 2", "Practical tip 3"],
  "estimatedDailyBudget": "€X-€Y per person per day",
  "safety": "Brief safety/practical info"
}

Generate ${startDate && endDate ? `a plan for ${startDate} to ${endDate}` : "a 3-day plan"} for ${travelers} traveler(s).`;

    const userMessage = `Create a travel guide for ${destination}${origin ? ` (traveling from ${origin})` : ""}.${
      startDate ? ` Dates: ${startDate}${endDate ? ` to ${endDate}` : ""}` : ""
    }`;

    console.log("Travel guide request:", { destination, origin, budget, interests });

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
        }),
      }
    );

    if (!response.ok) {
      const status = response.status;
      if (status === 429) return jsonErr("Too many requests — please try again in a moment", 429);
      if (status === 402) return jsonErr("Service temporarily unavailable", 402);
      const errText = await response.text();
      console.error("AI gateway error:", status, errText);
      return jsonErr("Failed to generate travel guide", 502, `AI gateway returned ${status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return jsonErr("AI returned empty response", 502);
    }

    // Parse JSON from AI response
    let guide: Record<string, unknown>;
    try {
      const cleaned = content.replace(/```json\n?|\n?```/g, "").trim();
      guide = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI JSON:", content.slice(0, 500));
      return jsonErr("Failed to parse travel guide response", 502, "Invalid JSON from AI");
    }

    // Ensure required fields with fallbacks
    const safeGuide = {
      summary: guide.summary || `Explore ${destination} — a wonderful travel destination.`,
      bestTimeToGo: guide.bestTimeToGo || "Check local weather forecasts for the best time to visit.",
      dailyPlan: Array.isArray(guide.dailyPlan) ? guide.dailyPlan : [],
      mustSee: Array.isArray(guide.mustSee) ? guide.mustSee : [],
      foodToTry: Array.isArray(guide.foodToTry) ? guide.foodToTry : [],
      localTips: Array.isArray(guide.localTips) ? guide.localTips : [],
      estimatedDailyBudget: guide.estimatedDailyBudget || "Varies",
      safety: guide.safety || "Exercise normal precautions.",
    };

    return jsonOk({ ok: true, guide: safeGuide });
  } catch (error) {
    console.error("Travel guide error:", error);
    return jsonErr(
      error instanceof Error ? error.message : "Something went wrong",
      500
    );
  }
});
