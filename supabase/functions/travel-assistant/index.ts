import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// City to IATA code mapping
const CITY_TO_IATA: Record<string, { code: string; country: string }> = {
  "barcelona": { code: "BCN", country: "Spain" },
  "lisbon": { code: "LIS", country: "Portugal" },
  "athens": { code: "ATH", country: "Greece" },
  "rome": { code: "FCO", country: "Italy" },
  "dubrovnik": { code: "DBV", country: "Croatia" },
  "nice": { code: "NCE", country: "France" },
  "marrakech": { code: "RAK", country: "Morocco" },
  "cairo": { code: "CAI", country: "Egypt" },
  "cape town": { code: "CPT", country: "South Africa" },
  "tokyo": { code: "TYO", country: "Japan" },
  "bangkok": { code: "BKK", country: "Thailand" },
  "bali": { code: "DPS", country: "Indonesia" },
  "singapore": { code: "SIN", country: "Singapore" },
  "cancun": { code: "CUN", country: "Mexico" },
  "miami": { code: "MIA", country: "USA" },
  "new york": { code: "JFK", country: "USA" },
  "rio de janeiro": { code: "GIG", country: "Brazil" },
  "sydney": { code: "SYD", country: "Australia" },
  "reykjavik": { code: "KEF", country: "Iceland" },
  "prague": { code: "PRG", country: "Czech Republic" },
  "vienna": { code: "VIE", country: "Austria" },
  "amsterdam": { code: "AMS", country: "Netherlands" },
  "dubai": { code: "DXB", country: "UAE" },
  "maldives": { code: "MLE", country: "Maldives" },
  "paris": { code: "CDG", country: "France" },
  "london": { code: "LHR", country: "UK" },
  "berlin": { code: "BER", country: "Germany" },
  "munich": { code: "MUC", country: "Germany" },
  "frankfurt": { code: "FRA", country: "Germany" },
  "stuttgart": { code: "STR", country: "Germany" },
  "milan": { code: "MXP", country: "Italy" },
  "madrid": { code: "MAD", country: "Spain" },
  "los angeles": { code: "LAX", country: "USA" },
  "chicago": { code: "ORD", country: "USA" },
  "san francisco": { code: "SFO", country: "USA" },
  "zurich": { code: "ZRH", country: "Switzerland" },
  "brussels": { code: "BRU", country: "Belgium" },
  "dublin": { code: "DUB", country: "Ireland" },
  "copenhagen": { code: "CPH", country: "Denmark" },
  "stockholm": { code: "ARN", country: "Sweden" },
  "oslo": { code: "OSL", country: "Norway" },
  "helsinki": { code: "HEL", country: "Finland" },
  "warsaw": { code: "WAW", country: "Poland" },
  "budapest": { code: "BUD", country: "Hungary" },
  "istanbul": { code: "IST", country: "Turkey" },
};

// Popular destinations with weather/vibe info
const DESTINATIONS = [
  { city: "Barcelona", country: "Spain", iataCode: "BCN", vibe: "beaches, architecture, nightlife", weather: "warm" },
  { city: "Lisbon", country: "Portugal", iataCode: "LIS", vibe: "historic, coastal, food scene", weather: "warm" },
  { city: "Athens", country: "Greece", iataCode: "ATH", vibe: "ancient history, islands nearby", weather: "warm" },
  { city: "Rome", country: "Italy", iataCode: "FCO", vibe: "history, art, incredible food", weather: "warm" },
  { city: "Marrakech", country: "Morocco", iataCode: "RAK", vibe: "exotic, markets, riads", weather: "hot" },
  { city: "Bangkok", country: "Thailand", iataCode: "BKK", vibe: "temples, street food, vibrant", weather: "hot" },
  { city: "Bali", country: "Indonesia", iataCode: "DPS", vibe: "beaches, temples, wellness", weather: "hot" },
  { city: "Prague", country: "Czech Republic", iataCode: "PRG", vibe: "fairy-tale city, cheap beer", weather: "cold" },
  { city: "Reykjavik", country: "Iceland", iataCode: "KEF", vibe: "northern lights, nature", weather: "cold" },
  { city: "Dubai", country: "UAE", iataCode: "DXB", vibe: "luxury, shopping, futuristic", weather: "hot" },
  { city: "Tokyo", country: "Japan", iataCode: "TYO", vibe: "culture, food, technology", weather: "mild" },
  { city: "New York", country: "USA", iataCode: "JFK", vibe: "iconic, culture, energy", weather: "cold" },
  { city: "Miami", country: "USA", iataCode: "MIA", vibe: "beaches, nightlife, art deco", weather: "warm" },
  { city: "Cancun", country: "Mexico", iataCode: "CUN", vibe: "beaches, ruins, resorts", weather: "hot" },
  { city: "Cape Town", country: "South Africa", iataCode: "CPT", vibe: "nature, wine, adventure", weather: "warm" },
  { city: "Sydney", country: "Australia", iataCode: "SYD", vibe: "beaches, harbor, outdoors", weather: "warm" },
  { city: "Amsterdam", country: "Netherlands", iataCode: "AMS", vibe: "canals, culture, bikes", weather: "mild" },
  { city: "Vienna", country: "Austria", iataCode: "VIE", vibe: "classical music, cafes, elegant", weather: "cold" },
  { city: "Nice", country: "France", iataCode: "NCE", vibe: "French Riviera, beaches, glamour", weather: "warm" },
  { city: "Dubrovnik", country: "Croatia", iataCode: "DBV", vibe: "Game of Thrones, coastal, historic", weather: "warm" },
];

// Nearby airports for comparison
const NEARBY_AIRPORTS: Record<string, string[]> = {
  "London": ["LHR", "LGW", "STN", "LTN"],
  "Paris": ["CDG", "ORY"],
  "Berlin": ["BER"],
  "Frankfurt": ["FRA", "HHN"],
  "Munich": ["MUC", "NUE"],
  "Stuttgart": ["STR", "FRA", "MUC"],
  "Milan": ["MXP", "LIN", "BGY"],
  "Rome": ["FCO", "CIA"],
  "Barcelona": ["BCN", "GRO"],
  "New York": ["JFK", "EWR", "LGA"],
  "Los Angeles": ["LAX", "BUR", "SNA"],
  "Miami": ["MIA", "FLL"],
  "Amsterdam": ["AMS", "EIN"],
  "Brussels": ["BRU", "CRL"],
};

/**
 * Get next month's date for price searching
 */
function getNextMonthDate(): string {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  date.setDate(15); // Mid-month for better availability
  return date.toISOString().split('T')[0];
}

/**
 * Fetch live prices from Travelpayouts API
 */
async function fetchLivePrices(
  origin: string,
  destinations: string[],
  token: string
): Promise<Record<string, number>> {
  const prices: Record<string, number> = {};
  const departDate = getNextMonthDate();
  
  console.log(`Fetching live prices from ${origin} to ${destinations.join(', ')} for ${departDate}`);
  
  // Fetch prices for each destination in parallel
  const pricePromises = destinations.map(async (dest) => {
    try {
      const api = new URL('https://api.travelpayouts.com/aviasales/v3/prices_for_dates');
      api.searchParams.set('origin', origin.toUpperCase());
      api.searchParams.set('destination', dest.toUpperCase());
      api.searchParams.set('departure_at', departDate);
      api.searchParams.set('one_way', 'false');
      api.searchParams.set('currency', 'eur');
      api.searchParams.set('limit', '1');
      api.searchParams.set('sorting', 'price');
      api.searchParams.set('token', token);
      
      const response = await fetch(api.toString(), {
        headers: {
          'X-Access-Token': token,
          'Accept': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.[0]?.price) {
          prices[dest] = data.data[0].price;
          console.log(`Price ${origin} → ${dest}: €${data.data[0].price}`);
        }
      }
    } catch (err) {
      console.error(`Error fetching price for ${dest}:`, err);
    }
  });
  
  await Promise.all(pricePromises);
  return prices;
}

/**
 * Fetch cheapest destinations from origin
 */
async function fetchCheapestDestinations(
  origin: string,
  token: string,
  limit: number = 10
): Promise<Array<{ destination: string; price: number }>> {
  try {
    const api = new URL('https://api.travelpayouts.com/aviasales/v3/prices_for_dates');
    api.searchParams.set('origin', origin.toUpperCase());
    api.searchParams.set('one_way', 'false');
    api.searchParams.set('currency', 'eur');
    api.searchParams.set('limit', String(limit));
    api.searchParams.set('sorting', 'price');
    api.searchParams.set('token', token);
    
    const response = await fetch(api.toString(), {
      headers: {
        'X-Access-Token': token,
        'Accept': 'application/json',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.data) {
        return data.data.map((item: any) => ({
          destination: item.destination,
          price: item.price,
        }));
      }
    }
  } catch (err) {
    console.error('Error fetching cheapest destinations:', err);
  }
  return [];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversationHistory = [] } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const TRAVELPAYOUTS_TOKEN = Deno.env.get("TRAVELPAYOUTS_API_TOKEN");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }
    
    console.log("Processing message:", message);
    console.log("Has Travelpayouts token:", !!TRAVELPAYOUTS_TOKEN);

    // Try to extract origin from conversation or message
    let detectedOrigin: string | null = null;
    const allText = [message, ...conversationHistory.map((m: any) => m.content)].join(' ').toLowerCase();
    
    for (const [cityName, info] of Object.entries(CITY_TO_IATA)) {
      if (allText.includes(cityName)) {
        detectedOrigin = info.code;
        console.log(`Detected origin city: ${cityName} (${info.code})`);
        break;
      }
    }

    // Fetch live prices if we have origin and token
    let livePrices: Record<string, number> = {};
    let cheapestDeals: Array<{ destination: string; price: number }> = [];
    
    if (detectedOrigin && TRAVELPAYOUTS_TOKEN) {
      const destinationCodes = DESTINATIONS.slice(0, 8).map(d => d.iataCode);
      
      // Fetch both specific destinations and cheapest overall
      const [prices, cheapest] = await Promise.all([
        fetchLivePrices(detectedOrigin, destinationCodes, TRAVELPAYOUTS_TOKEN),
        fetchCheapestDestinations(detectedOrigin, TRAVELPAYOUTS_TOKEN, 10),
      ]);
      
      livePrices = prices;
      cheapestDeals = cheapest;
      console.log("Live prices fetched:", Object.keys(livePrices).length);
      console.log("Cheapest deals:", cheapestDeals.length);
    }

    // Build context with live prices
    let priceContext = "";
    if (Object.keys(livePrices).length > 0) {
      priceContext = `\n\nLIVE PRICES (from ${detectedOrigin}, roundtrip, next month):\n`;
      for (const [dest, price] of Object.entries(livePrices)) {
        const destInfo = DESTINATIONS.find(d => d.iataCode === dest);
        if (destInfo) {
          priceContext += `- ${destInfo.city}: €${price}\n`;
        }
      }
    }
    
    if (cheapestDeals.length > 0) {
      priceContext += `\nCHEAPEST DEALS RIGHT NOW:\n`;
      cheapestDeals.slice(0, 5).forEach(deal => {
        priceContext += `- ${deal.destination}: €${deal.price}\n`;
      });
    }

    const systemPrompt = `You are GoFlyFinder, a friendly and knowledgeable travel guide AI.

YOUR PERSONALITY:
- Enthusiastic but concise
- Like a friend who knows all the travel hacks
- Give genuine recommendations, not generic ones
- Share insider tips and best times to visit
- Be encouraging about travel dreams

YOUR JOB:
1. Help users discover amazing destinations
2. Find the cheapest flights using LIVE PRICES
3. Give travel tips and recommendations
4. Compare nearby airports to save money

CRITICAL FIRST STEP:
${detectedOrigin ? `User is flying from: ${detectedOrigin}. You can now give them personalized prices!` : `
⚠️ YOU DON'T KNOW WHERE THE USER IS FLYING FROM YET!
Your FIRST response MUST ask where they're flying from. Be friendly and explain why:
"Hey! 👋 To find you the best deals with accurate prices, I need to know where you're flying from. What city or airport will you be departing from?"

DO NOT suggest any destinations or prices until you know their origin city!
DO NOT make up prices — they won't be accurate without knowing the origin.
`}

CONVERSATION FLOW:
1. ALWAYS check if origin is known first
2. If NO origin → Ask where they're flying from (friendly, explain it helps get real prices)
3. If origin IS known → Suggest destinations with REAL LIVE prices
4. Give travel tips for suggested destinations
5. Mention the best time to visit, what to see, local tips

GEOGRAPHY KNOWLEDGE:
You know major cities and their airports. Never ask which country a city is in.
Examples: Stuttgart → Germany (STR), Barcelona → Spain (BCN), etc.

AIRPORT COMPARISON DATA:
${JSON.stringify(NEARBY_AIRPORTS, null, 2)}

When user is near a major hub, compare prices from nearby airports.
Example: "I also checked Frankfurt — it's €45 cheaper than Stuttgart for this route!"

DESTINATION DATA:
${JSON.stringify(DESTINATIONS, null, 2)}
${priceContext}

HOW TO SUGGEST DESTINATIONS:
- Lead with the VIBE, not just the price
- "Barcelona is perfect if you want beaches + nightlife. From ${detectedOrigin || 'your city'}: €180"
- Give 3-4 options with variety (beach vs city, cheap vs experience)
- Include one "dream destination" even if pricier

TRAVEL TIPS TO INCLUDE:
- Best months to visit
- Must-see spots or neighborhoods  
- Food recommendations
- Money-saving hacks (e.g., "book 6 weeks ahead", "Tuesday flights are cheaper")

RESPONSE FORMAT - Always use this JSON:
{
  "message": "Your friendly, helpful response with travel tips",
  "askingForOrigin": true/false,
  "userOrigin": { "city": "City", "country": "Country", "iataCode": "XXX" },
  "suggestions": [
    {
      "city": "City name",
      "country": "Country name", 
      "iataCode": "IATA code",
      "price": price_as_number,
      "reason": "Why this destination is great + any travel tip",
      "cheaperFromAirport": "Alternative airport if cheaper (optional)"
    }
  ],
  "travelTip": "One actionable travel tip related to the conversation"
}

RULES:
✅ Use LIVE PRICES when available (shown above)
✅ Be enthusiastic but brief
✅ Give specific recommendations, not generic ones
✅ Always include a travel tip
❌ Never ask which country a city is in
❌ Never repeat the same question
❌ Never give long paragraphs — keep it snappy`;

    console.log("Calling Lovable AI...");
    
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...conversationHistory,
          { role: "user", content: message }
        ],
      }),
    });
    
    console.log("AI response status:", response.status);

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
      const cleanedContent = content.replace(/```json\n?|\n?```/g, '').trim();
      parsedResponse = JSON.parse(cleanedContent);
      
      // Inject live prices into suggestions if available
      if (parsedResponse.suggestions && Object.keys(livePrices).length > 0) {
        parsedResponse.suggestions = parsedResponse.suggestions.map((s: any) => {
          const livePrice = livePrices[s.iataCode];
          if (livePrice) {
            return { ...s, price: livePrice, isLivePrice: true };
          }
          return s;
        });
      }
    } catch {
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
