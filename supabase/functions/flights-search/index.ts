import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { origin, destination, departDate, returnDate, adults, tripType } = await req.json();
    
    console.log('Flight search request:', { origin, destination, departDate, returnDate, adults, tripType });

    const apiToken = Deno.env.get('TRAVELPAYOUTS_API_TOKEN');
    const marker = Deno.env.get('TRAVELPAYOUTS_MARKER');

    if (!apiToken) {
      console.error('TRAVELPAYOUTS_API_TOKEN not configured');
      return new Response(
        JSON.stringify({ error: 'API token not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use Aviasales/Travelpayouts Prices API for flight prices
    // This endpoint returns cached prices which are available without special API access
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

    console.log('Calling Travelpayouts API:', searchUrl.toString().replace(apiToken, '[REDACTED]'));

    const response = await fetch(searchUrl.toString());
    const data = await response.json();

    console.log('Travelpayouts API response status:', response.status);
    console.log('Travelpayouts API response:', JSON.stringify(data).substring(0, 500));

    if (!response.ok) {
      console.error('Travelpayouts API error:', data);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch flights', details: data }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Transform API response to our format
    const flights = (data.data || []).map((flight: any, index: number) => {
      const departureTime = flight.departure_at ? new Date(flight.departure_at) : null;
      const returnTime = flight.return_at ? new Date(flight.return_at) : null;
      
      // Calculate arrival time based on duration
      const durationMinutes = flight.duration || 180;
      const arrivalTime = departureTime ? new Date(departureTime.getTime() + durationMinutes * 60000) : null;
      
      // Build deeplink URL
      const deepLink = `https://www.aviasales.com/search/${origin}${departDate.replace(/-/g, '').slice(2)}${destination}${returnDate ? returnDate.replace(/-/g, '').slice(2) : ''}${adults}?marker=${marker}`;

      return {
        id: `flight-${index}-${flight.flight_number || Math.random().toString(36).substr(2, 9)}`,
        airline: flight.airline || 'Multiple Airlines',
        airlineLogo: `https://pics.avs.io/60/60/${flight.airline || 'XX'}.png`,
        flightNumber: flight.flight_number || '',
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
      };
    });

    console.log(`Returning ${flights.length} flights`);

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
