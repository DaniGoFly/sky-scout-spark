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
 * Generate official Travelpayouts redirect link using tp.media
 * This is the officially recommended method that ensures:
 * - Proper affiliate tracking
 * - Valid session creation
 * - Correct redirect to booking providers
 * 
 * Documentation: https://support.travelpayouts.com/hc/en-us/articles/210995998
 */
function generateOfficialRedirectLink(params: {
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
  
  // Format dates as YYYY-MM-DD for the redirect API
  const formatDate = (dateStr: string): string => dateStr; // Already in YYYY-MM-DD format
  
  // Travel class mapping: Y = economy, C = business, F = first
  const classMap: Record<string, string> = {
    'economy': 'Y',
    'premium_economy': 'W',
    'business': 'C',
    'first': 'F',
  };
  const cabinClass = classMap[travelClass] || 'Y';
  
  // Build the official tp.media redirect URL
  // Program ID 4114 = Aviasales
  const baseUrl = 'https://tp.media/r';
  
  // Build search parameters for the target URL
  const searchParams = new URLSearchParams();
  searchParams.set('origin_iata', origin);
  searchParams.set('destination_iata', destination);
  searchParams.set('depart_date', formatDate(departDate));
  if (returnDate) {
    searchParams.set('return_date', formatDate(returnDate));
  }
  searchParams.set('adults', String(adults));
  searchParams.set('children', String(children));
  searchParams.set('infants', String(infants));
  searchParams.set('cabin', cabinClass);
  searchParams.set('with_request', 'true'); // Triggers actual search
  
  // The destination URL for Aviasales search
  const targetUrl = `https://www.aviasales.com/search/${origin}${destination}${departDate.replace(/-/g, '').slice(4)}?${searchParams.toString()}`;
  
  // Build the official redirect URL with tracking
  const redirectParams = new URLSearchParams();
  redirectParams.set('marker', marker);
  redirectParams.set('p', '4114'); // Aviasales program ID
  redirectParams.set('u', encodeURIComponent(targetUrl));
  
  return `${baseUrl}?${redirectParams.toString()}`;
}

/**
 * Alternative: Generate Jetradar direct link (same network, often more reliable)
 */
function generateJetradarLink(params: {
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
    'economy': '0',
    'premium_economy': '1',
    'business': '2',
    'first': '3',
  };
  
  const searchParams = new URLSearchParams();
  searchParams.set('origin_iata', origin);
  searchParams.set('destination_iata', destination);
  searchParams.set('depart_date', departDate);
  if (returnDate) {
    searchParams.set('return_date', returnDate);
  }
  searchParams.set('adults', String(adults));
  searchParams.set('children', String(children));
  searchParams.set('infants', String(infants));
  searchParams.set('trip_class', classMap[travelClass] || '0');
  searchParams.set('marker', marker);
  searchParams.set('with_request', 'true');
  
  return `https://www.jetradar.com/searches/new?${searchParams.toString()}`;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      origin, 
      destination, 
      departDate, 
      returnDate, 
      adults = 1, 
      children = 0, 
      infants = 0, 
      tripType, 
      travelClass = 'economy' 
    } = await req.json();
    
    console.log('Flight search request:', { origin, destination, departDate, returnDate, adults, children, infants, tripType, travelClass });

    const apiToken = Deno.env.get('TRAVELPAYOUTS_API_TOKEN');
    const marker = Deno.env.get('TRAVELPAYOUTS_MARKER') || '485833';

    if (!apiToken) {
      console.error('TRAVELPAYOUTS_API_TOKEN not configured');
      return new Response(
        JSON.stringify({ error: 'API token not configured' }),
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

    console.log('Calling Travelpayouts Prices API');

    const response = await fetch(searchUrl.toString());
    const data = await response.json();

    console.log('Travelpayouts API response status:', response.status);

    if (!response.ok) {
      console.error('Travelpayouts API error:', data);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch flights', details: data }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
      
      // Generate official Travelpayouts redirect link (preferred)
      const deepLink = generateJetradarLink({
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
      
      // Alternative: Use tp.media redirect (backup)
      const alternativeLink = generateOfficialRedirectLink({
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
        deepLink, // Primary: Jetradar link (more reliable)
        alternativeLink, // Backup: tp.media redirect
        returnAt: returnTime ? returnTime.toISOString() : null,
        foundAt: flight.found_at,
      };
    });

    console.log(`Returning ${flights.length} flights with official redirect links`);

    return new Response(
      JSON.stringify({ 
        flights,
        marker,
        searchParams: { origin, destination, departDate, returnDate, adults, children, infants, tripType, travelClass }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in flights-search function:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
