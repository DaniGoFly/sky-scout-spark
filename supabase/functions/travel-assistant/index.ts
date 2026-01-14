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

    const systemPrompt = `You are GoFlyFinder — a chill travel buddy who finds cheap flights.

VIBE: Casual, brief, like texting a friend. No fluff.

${detectedOrigin ? `✓ Flying from: ${detectedOrigin}` : `⚠️ Don't know origin yet!
First message: "Hey! Where are you flying from? 🛫"
That's it. Don't suggest anything until you know.`}

RULES:
- Max 2 sentences per response
- Use emojis sparingly (1-2 max)
- Lead with price or vibe, not both
- One tip per message, keep it punchy
- Never repeat yourself

WHEN YOU KNOW ORIGIN:
- "Barcelona €89 — beaches + great nightlife 🏖️"
- "Prague is dirt cheap rn, €45 roundtrip"
- Give 2-3 options max, not a list

AIRPORT DATA: ${JSON.stringify(NEARBY_AIRPORTS, null, 2)}
DESTINATIONS: ${JSON.stringify(DESTINATIONS.slice(0, 10), null, 2)}
${priceContext}

RESPONSE FORMAT (JSON):
{
  "message": "Short, friendly message (1-2 sentences)",
  "askingForOrigin": true/false,
  "userOrigin": { "city": "City", "country": "Country", "iataCode": "XXX" },
  "suggestions": [{ "city": "", "country": "", "iataCode": "", "price": 0, "reason": "One-liner why" }],
  "travelTip": "Quick tip if relevant"
}`;

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
