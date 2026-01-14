import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const POPULAR_DESTINATIONS = [
  { city: "Barcelona", country: "Spain", iataCode: "BCN", avgPrice: 180, weather: "warm", continent: "Europe" },
  { city: "Lisbon", country: "Portugal", iataCode: "LIS", avgPrice: 150, weather: "warm", continent: "Europe" },
  { city: "Athens", country: "Greece", iataCode: "ATH", avgPrice: 200, weather: "warm", continent: "Europe" },
  { city: "Rome", country: "Italy", iataCode: "FCO", avgPrice: 220, weather: "warm", continent: "Europe" },
  { city: "Dubrovnik", country: "Croatia", iataCode: "DBV", avgPrice: 190, weather: "warm", continent: "Europe" },
  { city: "Nice", country: "France", iataCode: "NCE", avgPrice: 210, weather: "warm", continent: "Europe" },
  { city: "Marrakech", country: "Morocco", iataCode: "RAK", avgPrice: 120, weather: "hot", continent: "Africa" },
  { city: "Cairo", country: "Egypt", iataCode: "CAI", avgPrice: 250, weather: "hot", continent: "Africa" },
  { city: "Cape Town", country: "South Africa", iataCode: "CPT", avgPrice: 450, weather: "warm", continent: "Africa" },
  { city: "Tokyo", country: "Japan", iataCode: "TYO", avgPrice: 650, weather: "mild", continent: "Asia" },
  { city: "Bangkok", country: "Thailand", iataCode: "BKK", avgPrice: 400, weather: "hot", continent: "Asia" },
  { city: "Bali", country: "Indonesia", iataCode: "DPS", avgPrice: 500, weather: "hot", continent: "Asia" },
  { city: "Singapore", country: "Singapore", iataCode: "SIN", avgPrice: 550, weather: "hot", continent: "Asia" },
  { city: "Cancun", country: "Mexico", iataCode: "CUN", avgPrice: 280, weather: "hot", continent: "North America" },
  { city: "Miami", country: "USA", iataCode: "MIA", avgPrice: 200, weather: "warm", continent: "North America" },
  { city: "New York", country: "USA", iataCode: "JFK", avgPrice: 250, weather: "cold", continent: "North America" },
  { city: "Rio de Janeiro", country: "Brazil", iataCode: "GIG", avgPrice: 600, weather: "hot", continent: "South America" },
  { city: "Sydney", country: "Australia", iataCode: "SYD", avgPrice: 800, weather: "warm", continent: "Oceania" },
  { city: "Reykjavik", country: "Iceland", iataCode: "KEF", avgPrice: 350, weather: "cold", continent: "Europe" },
  { city: "Prague", country: "Czech Republic", iataCode: "PRG", avgPrice: 140, weather: "cold", continent: "Europe" },
  { city: "Vienna", country: "Austria", iataCode: "VIE", avgPrice: 160, weather: "cold", continent: "Europe" },
  { city: "Amsterdam", country: "Netherlands", iataCode: "AMS", avgPrice: 170, weather: "mild", continent: "Europe" },
  { city: "Dubai", country: "UAE", iataCode: "DXB", avgPrice: 350, weather: "hot", continent: "Asia" },
  { city: "Maldives", country: "Maldives", iataCode: "MLE", avgPrice: 700, weather: "hot", continent: "Asia" },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are GoFlyFinder's AI Travel Assistant.

Your job:
- Help users find the best flight options and make confident decisions.
- Be fast, practical, and clear.
- Always use only legal, permitted data sources.

AVAILABLE DESTINATIONS DATA:
${JSON.stringify(POPULAR_DESTINATIONS, null, 2)}

Core rules (non-negotiable):
1) DO NOT claim you "search the whole internet" or "scan all flights on the internet."
2) DO NOT scrape websites, bypass paywalls, or use unofficial methods.
3) Use only the destination data provided above and partner flight data providers.
4) If real-time pricing/availability is not available, say so clearly and offer the closest alternative.
5) Be accurate and transparent: if you're unsure, say what you're assuming.

How to behave:
- Ask at most 2 short follow-up questions only if needed; otherwise make reasonable assumptions and continue.
- Convert messy user messages into structured search intent.
- Return results in a helpful order and explain WHY each result is recommended.

Extract these details when possible:
- Origin airport/city
- Destination airport/city or "anywhere"
- Dates or date range + trip length (if flexible)
- Budget
- Passengers (adults/children)
- Cabin class
- Preferences: nonstop vs 1 stop, max duration, baggage, morning/evening, preferred airlines

Flight result ranking logic:
Rank by a "Best Value" score weighing: price, travel time, number of stops, departure/arrival times.
If user says "cheapest," prioritize price. If "fastest," prioritize duration. If "comfortable," prioritize fewer stops.

ALWAYS respond in this JSON format:
{
  "message": "Your friendly response with quick confirmation and explanation",
  "suggestions": [
    {
      "city": "City name",
      "country": "Country name", 
      "iataCode": "IATA code",
      "price": estimated_price_number,
      "reason": "1-2 sentence explanation (Best value because...)"
    }
  ]
}

Output guidelines:
- Include 1-6 recommended options based on the query
- Add "Smart alternatives" info in your message if useful (nearby airports, flexible dates)
- Highlight important caveats: prices change fast; check baggage/fare details before booking
- Never invent baggage allowances, refund rules, or exact details unless provided

Legal safety wording:
- Say: "Based on our partner flight data..." NOT "I checked every website"

Tone:
Friendly, confident, and concise. No long lectures. Give actionable options. When the user is vague, propose 2-3 great default routes/destinations and explain your reasoning.

Remember: ONLY suggest destinations from the provided list. The price field should be a number (no dollar sign).`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: "I'm getting a lot of requests right now. Please try again in a moment!" 
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: "Service temporarily unavailable. Please try again later." 
        }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to get AI response");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI");
    }

    // Try to parse as JSON, if it fails, return as plain text
    let parsedResponse;
    try {
      // Clean the response - sometimes AI wraps in markdown code blocks
      const cleanedContent = content.replace(/```json\n?|\n?```/g, '').trim();
      parsedResponse = JSON.parse(cleanedContent);
    } catch {
      // If parsing fails, return as a message without suggestions
      parsedResponse = {
        message: content,
        suggestions: []
      };
    }

    return new Response(JSON.stringify(parsedResponse), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Travel assistant error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Something went wrong. Please try again." 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
