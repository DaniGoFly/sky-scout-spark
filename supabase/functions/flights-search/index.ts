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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { origin, destination, departDate, returnDate, adults = 1, children = 0, infants = 0, tripType, travelClass } = await req.json();
    
    console.log('Flight search request:', { origin, destination, departDate, returnDate, adults, tripType });

    const apiToken = Deno.env.get('TRAVELPAYOUTS_API_TOKEN');
    const marker = Deno.env.get('TRAVELPAYOUTS_MARKER') || '485833';

    if (!apiToken) {
      console.error('TRAVELPAYOUTS_API_TOKEN not configured');
      return new Response(
        JSON.stringify({ error: 'API token not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Get flight prices using prices_for_dates API
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

    // Generate deep links using the Aviasales Link Generator format
    // Format: https://www.aviasales.com/search/ORIGDDMMYYYY{DESTDDMMYYYY}{passengers}{class}?marker=MARKER&with_request=true
    const generateDeepLink = (flight: any): string => {
      // Format dates as DDMM
      const formatDateShort = (dateStr: string): string => {
        const date = new Date(dateStr);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        return `${day}${month}`;
      };

      const departFormatted = formatDateShort(departDate);
      const returnFormatted = returnDate ? formatDateShort(returnDate) : '';
      
      // Build passenger string
      let passengers = '';
      const totalPassengers = adults + children + infants;
      if (totalPassengers > 1 || children > 0 || infants > 0) {
        passengers = String(adults);
        if (children > 0) passengers += String(children);
        if (infants > 0) passengers += String(infants);
      }
      
      // Travel class: empty for economy, 1 for business, 2 for first
      let classCode = '';
      if (travelClass === 'business') classCode = '1';
      else if (travelClass === 'first') classCode = '2';
      
      // Build search term: ORIGDDMMDESTDDMM{passengers}{class}
      let searchTerm = `${origin}${departFormatted}${destination}`;
      if (returnFormatted) searchTerm += returnFormatted;
      if (passengers) searchTerm += passengers;
      if (classCode) searchTerm += classCode;
      
      // The with_request=true parameter triggers an actual search on Aviasales
      // which then shows direct booking links to OTAs (Expedia, CheapOair, etc.)
      const deepLink = `https://www.aviasales.com/search/${searchTerm}?marker=${marker}&with_request=true`;
      
      return deepLink;
    };

    // Transform API response to our format with proper deep links
    const flights = (data.data || []).map((flight: any, index: number) => {
      const departureTime = flight.departure_at ? new Date(flight.departure_at) : null;
      const returnTime = flight.return_at ? new Date(flight.return_at) : null;
      
      // Calculate arrival time based on duration
      const durationMinutes = flight.duration || 180;
      const arrivalTime = departureTime ? new Date(departureTime.getTime() + durationMinutes * 60000) : null;
      
      // Get airline name
      const airlineCode = flight.airline || 'XX';
      const airlineName = AIRLINE_NAMES[airlineCode] || airlineCode;
      
      // Generate proper deep link that goes to search results with booking options
      const deepLink = generateDeepLink(flight);

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
        deepLink,
        returnAt: returnTime ? returnTime.toISOString() : null,
        // Additional metadata for potential future use
        foundAt: flight.found_at,
        expires_at: flight.expires_at,
      };
    });

    console.log(`Returning ${flights.length} flights with deep links`);

    return new Response(
      JSON.stringify({ 
        flights,
        marker,
        searchParams: { origin, destination, departDate, returnDate, adults, tripType }
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
