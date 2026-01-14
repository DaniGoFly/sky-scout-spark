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

    // Major airports with nearby alternatives for price comparison
    const AIRPORT_ALTERNATIVES = {
      // UK
      "London": ["LHR", "LGW", "STN", "LTN", "SEN", "LCY"],
      "Manchester": ["MAN", "LPL", "LBA"],
      // Germany
      "Berlin": ["BER", "SXF"],
      "Frankfurt": ["FRA", "HHN"],
      "Munich": ["MUC", "NUE"],
      // France
      "Paris": ["CDG", "ORY", "BVA"],
      // Netherlands
      "Amsterdam": ["AMS", "EIN", "RTM"],
      // Belgium
      "Brussels": ["BRU", "CRL"],
      // Italy
      "Milan": ["MXP", "LIN", "BGY"],
      "Rome": ["FCO", "CIA"],
      // Spain
      "Barcelona": ["BCN", "GRO", "REU"],
      "Madrid": ["MAD"],
      // USA
      "New York": ["JFK", "EWR", "LGA"],
      "Los Angeles": ["LAX", "BUR", "SNA", "ONT"],
      "Chicago": ["ORD", "MDW"],
      "San Francisco": ["SFO", "OAK", "SJC"],
      "Miami": ["MIA", "FLL", "PBI"],
      "Washington": ["DCA", "IAD", "BWI"],
    };

    const systemPrompt = `You are GoFlyFinder, a smart flight-deal assistant.

Your job is to help users find the cheapest and best flight options.

CORE RULES (non-negotiable):
1. Always ask for origin city AND country first if missing. If user gives only a country → ask for the city.
2. After origin is known: Automatically detect nearby major airports. Compare prices between them. Clearly state which airport is cheapest and why.
3. Remember the user's origin for the whole conversation.
4. Never repeat the same question twice.
5. Ask only one short question at a time.
6. No filler text. No greetings. No marketing language.
7. Be concise, practical, and confident.

QUESTION ORDER (if missing, ask in this exact order):
1. Origin (city + country)
2. Destination
3. Dates or flexibility
4. Budget (optional)

NEARBY AIRPORTS DATA (use to compare and find cheaper alternatives):
${JSON.stringify(AIRPORT_ALTERNATIVES, null, 2)}

AVAILABLE DESTINATIONS DATA:
${JSON.stringify(POPULAR_DESTINATIONS, null, 2)}

OUTPUT STYLE:
Use short, clear sentences.
Example: "From Stuttgart (STR), I also checked Frankfurt (FRA) and Munich (MUC). Frankfurt is €72 cheaper for this route, so it's the best option."

BEHAVIOR FOR VAGUE REQUESTS:
If user says "Somewhere warm" or "Cheap trip" → Immediately suggest 3 destinations with prices, instead of asking more questions. But still ask for origin first if not provided.

MEMORY - Store and reuse automatically:
- Origin city
- Origin country  
- Preferred airports

FORBIDDEN:
- Do not repeat what the user said
- Do not explain what you are doing
- Do not give long paragraphs
- Do not use greetings or filler phrases

PERSONALITY: Smart travel hacker. Direct. Efficient.

AIRPORT COMPARISON:
When comparing airports, always mention savings like: "Flying from Frankfurt instead of Stuttgart saves €68."

RESPONSE FORMAT - Always use this JSON structure:
{
  "message": "Your direct, concise response",
  "askingForOrigin": true/false,
  "userOrigin": { "city": "City", "country": "Country", "mainAirport": "XXX", "nearbyAirports": ["YYY", "ZZZ"] },
  "suggestions": [
    {
      "city": "City name",
      "country": "Country name", 
      "iataCode": "IATA code",
      "price": estimated_price_number,
      "reason": "Short reason with airport savings if applicable",
      "cheaperFromAirport": "Alternative airport code if cheaper (optional)"
    }
  ]
}

If asking for origin, set askingForOrigin: true and suggestions: []
The price field must be a number (no currency symbol).
Only suggest destinations from the provided AVAILABLE DESTINATIONS DATA list.`;

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
