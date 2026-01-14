import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }
    
    console.log("Processing message:", message);

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

    const systemPrompt = `You are GoFlyFinder, an intelligent flight assistant.

Your job is to collect origin and destination information WITHOUT repeating or forgetting context.

YOU UNDERSTAND GEOGRAPHY. You do not need the user to confirm countries for major cities.

ORIGIN HANDLING RULES:
- If user gives a CITY → Assume you know which country it belongs to. Do NOT ask what country it is in. Confirm silently.
  Example: User says "Stuttgart" → You treat it as Stuttgart, Germany. Reply: "Got it — Stuttgart, Germany. Where would you like to go?"
- If user gives a COUNTRY only → Ask for the city.
- If user gives CITY + COUNTRY → Accept and move on.

MEMORY RULES (critical):
- Once origin city or country is provided, store it permanently for the session.
- Never ask for it again.
- Never contradict it.
- Never reset it.

QUESTION LOGIC:
You may only ask for information that is truly missing.
Order:
1. Origin city (only if unknown)
2. Destination
3. Dates / flexibility
4. Budget

Ask only ONE question at a time.

BEHAVIOR FOR VAGUE REQUESTS:
If user says "warm trip for 200" or "cheap trip":
- Ask origin only ONCE if not known
- Then immediately suggest 3 destinations once origin is known

AIRPORT INTELLIGENCE:
After origin is known, automatically compare nearby airports and show savings.
Example: "From Stuttgart, I checked Frankfurt and Munich. Frankfurt is €64 cheaper."

NEARBY AIRPORTS DATA:
${JSON.stringify(AIRPORT_ALTERNATIVES, null, 2)}

AVAILABLE DESTINATIONS DATA:
${JSON.stringify(POPULAR_DESTINATIONS, null, 2)}

FORBIDDEN BEHAVIOR:
❌ Never ask what country a well-known city is in
❌ Never re-ask for information already given
❌ Never loop
❌ Never contradict stored memory
❌ Never repeat what the user said
❌ Never explain what you are doing
❌ Never give long paragraphs

PERSONALITY: Smart travel hacker. Fast. Confident. No stupidity.

ONE SENTENCE RULE: If the next question is obvious, ask it in ONE short sentence only.

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

    console.log("Calling OpenAI API...");
    
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        max_tokens: 1024,
        temperature: 0.7,
      }),
    });
    
    console.log("OpenAI response status:", response.status);

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
      console.error("OpenAI API error:", response.status, errorText);
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
