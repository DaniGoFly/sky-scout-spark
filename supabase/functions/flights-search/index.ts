import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Airline name mapping for better display
const AIRLINE_NAMES: Record<string, string> = {
  'AA': 'American Airlines',
  'UA': 'United Airlines',
  'DL': 'Delta Air Lines',
  'WN': 'Southwest Airlines',
  'B6': 'JetBlue Airways',
  'AS': 'Alaska Airlines',
  'NK': 'Spirit Airlines',
  'F9': 'Frontier Airlines',
  'BA': 'British Airways',
  'AF': 'Air France',
  'LH': 'Lufthansa',
  'EK': 'Emirates',
  'QR': 'Qatar Airways',
  'SQ': 'Singapore Airlines',
  'CX': 'Cathay Pacific',
  'JL': 'Japan Airlines',
  'NH': 'All Nippon Airways',
  'TK': 'Turkish Airlines',
  'QF': 'Qantas',
  'AC': 'Air Canada',
};

/**
 * Generate White Label booking link using the user's custom domain
 * This provides the best user experience with branded booking flow
 * 
 * White Label domain: flights.goflyfinder.com (CNAME -> whitelabel.travelpayouts.com)
 */
function generateWhiteLabelLink(params: {
  marker: string;
  origin: string;
  destination: string;
  departDate: string;
  returnDate?: string;
  adults: number;
  children: number;
  infants: number;
  travelClass: string;
}): string {
  const { origin, destination, departDate, returnDate, adults, children, infants, travelClass } = params;
  
  // Travel class mapping for White Label: Y = economy, C = business
  const classMap: Record<string, string> = {
    'economy': 'Y',
    'premium_economy': 'W',
    'business': 'C',
    'first': 'F',
  };
  const cabinClass = classMap[travelClass] || 'Y';
  
  // Format date as DDMM for Aviasales URL format
  const formatDateShort = (dateStr: string): string => {
    const [year, month, day] = dateStr.split('-');
    return `${day}${month}`;
  };
  
  // Build passenger string: e.g., "1" for 1 adult, "2" for 2 adults, "11" for 1 adult + 1 child
  let passengers = String(adults);
  if (children > 0) passengers += String(children);
  if (infants > 0) passengers += String(infants);
  
  // White Label URL format: /search/ORIGIN_DEST_DATE1_DATE2_CABIN_PASSENGERS
  // Example: /search/JFK_CDG_1501_2201_Y_1
  const searchPath = returnDate 
    ? `${origin}${destination}${formatDateShort(departDate)}${formatDateShort(returnDate)}${passengers}`
    : `${origin}${destination}${formatDateShort(departDate)}${passengers}`;
  
  // Use custom White Label domain
  return `https://flights.goflyfinder.com/search/${searchPath}`;
}

/**
 * Fallback: Generate official tp.media redirect link
 * Used when White Label link might not work
 */
function generateTpMediaLink(params: {
  marker: string;
  origin: string;
  destination: string;
  departDate: string;
  returnDate?: string;
  adults: number;
  children: number;
  infants: number;
  travelClass: string;
}): string {
  const { marker, origin, destination, departDate, returnDate, adults, children, infants, travelClass } = params;
  
  const classMap: Record<string, string> = {
    'economy': 'Y',
    'premium_economy': 'W', 
    'business': 'C',
    'first': 'F',
  };
  const cabinClass = classMap[travelClass] || 'Y';
  
  // Build Aviasales search URL
  const searchParams = new URLSearchParams();
  searchParams.set('adults', String(adults));
  searchParams.set('children', String(children));
  searchParams.set('infants', String(infants));
  searchParams.set('cabin', cabinClass);
  searchParams.set('with_request', 'true');
  
  const formatDateShort = (dateStr: string): string => {
    const [year, month, day] = dateStr.split('-');
    return `${day}${month}`;
  };
  
  const route = returnDate
    ? `${origin}${formatDateShort(departDate)}${destination}${formatDateShort(returnDate)}`
    : `${origin}${formatDateShort(departDate)}${destination}`;
  
  const targetUrl = `https://www.aviasales.com/search/${route}?${searchParams.toString()}`;
  
  // tp.media redirect with tracking
  const redirectParams = new URLSearchParams();
  redirectParams.set('marker', marker);
  redirectParams.set('p', '4114'); // Aviasales program ID
  redirectParams.set('u', encodeURIComponent(targetUrl));
  
  return `https://tp.media/r?${redirectParams.toString()}`;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    const { 
      origin, 
      destination, 
      departDate, 
      returnDate, 
      adults = 1, 
      children = 0, 
      infants = 0, 
      tripType, 
      travelClass = 'economy',
      debug = false
    } = requestBody;
    
    console.log('=== FLIGHT SEARCH REQUEST ===');
    console.log('Origin:', origin);
    console.log('Destination:', destination);
    console.log('Depart Date:', departDate);
    console.log('Return Date:', returnDate);
    console.log('Adults:', adults, 'Children:', children, 'Infants:', infants);
    console.log('Trip Type:', tripType);
    console.log('Travel Class:', travelClass);

    const apiToken = Deno.env.get('TRAVELPAYOUTS_API_TOKEN');
    const marker = Deno.env.get('TRAVELPAYOUTS_MARKER');

    console.log('API Token configured:', !!apiToken);
    console.log('Marker configured:', marker ? `${marker.substring(0, 6)}...` : 'NOT SET');

    if (!apiToken) {
      console.error('TRAVELPAYOUTS_API_TOKEN not configured');
      return new Response(
        JSON.stringify({ 
          error: 'API credentials not configured. Please add your Travelpayouts API token.',
          errorType: 'config'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!marker) {
      console.error('TRAVELPAYOUTS_MARKER not configured');
      return new Response(
        JSON.stringify({ 
          error: 'Affiliate marker not configured. Please add your Travelpayouts marker.',
          errorType: 'config'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get flight prices using prices_for_dates API
    const searchUrl = new URL('https://api.travelpayouts.com/aviasales/v3/prices_for_dates');
    searchUrl.searchParams.set('origin', origin);
    searchUrl.searchParams.set('destination', destination);
    searchUrl.searchParams.set('departure_at', departDate);
    if (returnDate && tripType === 'roundtrip') {
      searchUrl.searchParams.set('return_at', returnDate);
    }
    searchUrl.searchParams.set('unique', 'false');
    searchUrl.searchParams.set('sorting', 'price');
    searchUrl.searchParams.set('direct', 'false');
    searchUrl.searchParams.set('currency', 'usd');
    searchUrl.searchParams.set('limit', '30');
    searchUrl.searchParams.set('token', apiToken);

    const apiUrlForLogging = searchUrl.toString().replace(apiToken, 'TOKEN_HIDDEN');
    console.log('=== API REQUEST ===');
    console.log('URL:', apiUrlForLogging);

    const response = await fetch(searchUrl.toString());
    const data = await response.json();

    console.log('=== API RESPONSE ===');
    console.log('HTTP Status:', response.status);
    console.log('Success:', data.success);
    console.log('Data count:', data.data?.length || 0);
    
    if (debug || data.data?.length === 0) {
      console.log('Raw response:', JSON.stringify(data, null, 2));
    }

    if (!response.ok) {
      console.error('API Error Response:', data);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch flights from provider', 
          errorType: 'api',
          details: data,
          debug: debug ? { url: apiUrlForLogging, status: response.status } : undefined
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Check for empty results - provide clear reason
    if (!data.data || data.data.length === 0) {
      // Check if date is far in the future (more than 9 months)
      const departDateObj = new Date(departDate);
      const now = new Date();
      const monthsDiff = (departDateObj.getFullYear() - now.getFullYear()) * 12 + (departDateObj.getMonth() - now.getMonth());
      
      const isFarFuture = monthsDiff > 9;
      
      console.log('=== NO FLIGHTS FOUND ===');
      console.log('Months ahead:', monthsDiff);
      console.log('Is far future:', isFarFuture);
      console.log('Reason:', isFarFuture ? 'Pricing not released yet' : 'No available flights');
      
      return new Response(
        JSON.stringify({ 
          flights: [],
          status: isFarFuture ? 'NO_PRICING_YET' : 'NO_RESULTS',
          emptyReason: isFarFuture ? 'far_future' : 'no_results',
          message: isFarFuture 
            ? 'Prices for this date are not available yet. Airlines release pricing closer to departure.'
            : 'No flights found for this route and date combination.',
          monthsAhead: monthsDiff,
          searchParams: { origin, destination, departDate, returnDate, adults, children, infants, tripType, travelClass },
          debug: debug ? { url: apiUrlForLogging, status: response.status, rawResponse: data } : undefined
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Transform API response with official redirect links
    const flights = (data.data || []).map((flight: any, index: number) => {
      const departureTime = flight.departure_at ? new Date(flight.departure_at) : null;
      const returnTime = flight.return_at ? new Date(flight.return_at) : null;
      
      // Calculate arrival time based on duration
      const durationMinutes = flight.duration || 180;
      const arrivalTime = departureTime ? new Date(departureTime.getTime() + durationMinutes * 60000) : null;
      
      // Get airline name
      const airlineCode = flight.airline || 'XX';
      const airlineName = AIRLINE_NAMES[airlineCode] || airlineCode;
      
      // Generate White Label booking link (primary - branded experience)
      const deepLink = generateWhiteLabelLink({
        marker,
        origin,
        destination,
        departDate,
        returnDate: returnDate || undefined,
        adults,
        children,
        infants,
        travelClass,
      });
      
      // Fallback: tp.media redirect link (if White Label has issues)
      const alternativeLink = generateTpMediaLink({
        marker,
        origin,
        destination,
        departDate,
        returnDate: returnDate || undefined,
        adults,
        children,
        infants,
        travelClass,
      });

      return {
        id: `flight-${index}-${flight.flight_number || Math.random().toString(36).substr(2, 9)}`,
        airline: airlineName,
        airlineCode: airlineCode,
        airlineLogo: `https://pics.avs.io/60/60/${airlineCode}.png`,
        flightNumber: flight.flight_number || `${airlineCode}${Math.floor(Math.random() * 9000) + 1000}`,
        departureTime: departureTime ? departureTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '00:00',
        arrivalTime: arrivalTime ? arrivalTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '00:00',
        departureCode: origin,
        arrivalCode: destination,
        duration: `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`,
        durationMinutes,
        stops: flight.transfers || 0,
        price: Math.round(flight.price * adults),
        deepLink, // Primary: White Label link
        alternativeLink, // Backup: tp.media redirect
        returnAt: returnTime ? returnTime.toISOString() : null,
        foundAt: flight.found_at,
      };
    });

    console.log(`=== SUCCESS: Returning ${flights.length} flights ===`);

    return new Response(
      JSON.stringify({ 
        flights,
        marker,
        searchParams: { origin, destination, departDate, returnDate, adults, children, infants, tripType, travelClass },
        debug: debug ? { url: apiUrlForLogging, status: response.status, rawDataCount: data.data?.length } : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('=== EDGE FUNCTION ERROR ===');
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        errorType: 'exception'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});