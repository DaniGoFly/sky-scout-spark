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

    const systemPrompt = `You are a friendly and knowledgeable travel assistant for a flight booking website. Your job is to help travelers find the perfect destination based on their preferences.

IMPORTANT: You have access to the following destination data. When suggesting destinations, ONLY recommend from this list:
${JSON.stringify(POPULAR_DESTINATIONS, null, 2)}

When a user describes what they're looking for (budget, weather preference, continent, etc.), analyze their request and suggest 1-3 destinations from the list above that best match their criteria.

ALWAYS respond in the following JSON format:
{
  "message": "Your friendly response explaining your suggestions",
  "suggestions": [
    {
      "city": "City name",
      "country": "Country name",
      "iataCode": "IATA code",
      "price": estimated_price_number,
      "reason": "Brief reason why this matches their criteria"
    }
  ]
}

Guidelines:
- Be warm, enthusiastic, and helpful
- If the budget is too low for any destination, suggest the cheapest options and explain
- Consider weather preferences (warm, hot, cold, mild)
- Consider continent preferences if mentioned
- Always provide at least 1 suggestion unless the request is completely impossible
- Keep your message concise but friendly
- If the user's request is unclear, ask a clarifying question instead of guessing

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
