import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple in-memory rate limiting (per IP, resets on function cold start)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_REQUESTS = 30; // Max requests per window
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute window

function checkRateLimit(clientIP: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const record = rateLimitMap.get(clientIP);
  
  // Clean up expired entries periodically
  if (rateLimitMap.size > 1000) {
    for (const [ip, data] of rateLimitMap.entries()) {
      if (now > data.resetTime) {
        rateLimitMap.delete(ip);
      }
    }
  }
  
  if (!record || now > record.resetTime) {
    // New window
    rateLimitMap.set(clientIP, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_REQUESTS - 1, resetIn: RATE_LIMIT_WINDOW_MS };
  }
  
  if (record.count >= RATE_LIMIT_REQUESTS) {
    return { allowed: false, remaining: 0, resetIn: record.resetTime - now };
  }
  
  record.count++;
  return { allowed: true, remaining: RATE_LIMIT_REQUESTS - record.count, resetIn: record.resetTime - now };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limiting - get client IP from headers
  const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                   req.headers.get('cf-connecting-ip') || 
                   req.headers.get('x-real-ip') || 
                   'unknown';
  
  const rateLimit = checkRateLimit(clientIP);
  
  if (!rateLimit.allowed) {
    console.warn(`Rate limit exceeded for IP: ${clientIP}`);
    return new Response(
      JSON.stringify({ 
        error: 'Too many requests. Please try again later.',
        errorType: 'rate_limit',
        retryAfter: Math.ceil(rateLimit.resetIn / 1000)
      }),
      { 
        status: 429, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil(rateLimit.resetIn / 1000))
        } 
      }
    );
  }

  try {
    const { location, checkIn, checkOut, guests } = await req.json();
    
    console.log('Hotel search request:', { location, checkIn, checkOut, guests });

    const apiToken = Deno.env.get('TRAVELPAYOUTS_API_TOKEN');
    const marker = Deno.env.get('TRAVELPAYOUTS_MARKER');

    if (!apiToken) {
      console.error('TRAVELPAYOUTS_API_TOKEN not configured');
      return new Response(
        JSON.stringify({ error: 'API configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // First, get location ID from city name
    const locationUrl = new URL('https://engine.hotellook.com/api/v2/lookup.json');
    locationUrl.searchParams.set('query', location);
    locationUrl.searchParams.set('lang', 'en');
    locationUrl.searchParams.set('lookFor', 'both');
    locationUrl.searchParams.set('limit', '1');

    console.log('Looking up location:', location);
    
    const locationResponse = await fetch(locationUrl.toString());
    const locationData = await locationResponse.json();
    
    console.log('Location lookup response:', JSON.stringify(locationData).substring(0, 300));

    let locationId = location; // fallback to using input as IATA code
    if (locationData.results?.locations?.[0]?.id) {
      locationId = locationData.results.locations[0].id;
    } else if (locationData.results?.cities?.[0]?.id) {
      locationId = locationData.results.cities[0].id;
    }

    // Search for hotels using the cache API
    const searchUrl = new URL('https://engine.hotellook.com/api/v2/cache.json');
    searchUrl.searchParams.set('location', locationId);
    searchUrl.searchParams.set('checkIn', checkIn);
    searchUrl.searchParams.set('checkOut', checkOut);
    searchUrl.searchParams.set('adults', guests.toString());
    searchUrl.searchParams.set('limit', '20');
    searchUrl.searchParams.set('currency', 'usd');

    console.log('Calling Hotels API:', searchUrl.toString());

    const response = await fetch(searchUrl.toString());
    const data = await response.json();

    console.log('Hotels API response status:', response.status);
    console.log('Hotels API response:', JSON.stringify(data).substring(0, 500));

    if (!response.ok) {
      console.error('Hotels API error:', data);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch hotels' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Transform API response to our format
    const hotels = (Array.isArray(data) ? data : []).map((hotel: any, index: number) => {
      const deepLink = `https://search.hotellook.com/hotels?destination=${locationId}&checkIn=${checkIn}&checkOut=${checkOut}&adults=${guests}&marker=${marker}`;

      return {
        id: `hotel-${hotel.hotelId || index}`,
        name: hotel.hotelName || 'Hotel',
        location: hotel.location?.name || location,
        stars: hotel.stars || 3,
        rating: hotel.rating || null,
        price: Math.round(hotel.priceFrom || hotel.price || 100),
        pricePerNight: Math.round((hotel.priceFrom || hotel.price || 100)),
        image: hotel.photoUrl || `https://photo.hotellook.com/image_v2/limit/h${hotel.hotelId}_1/320/240.auto`,
        amenities: ['WiFi', 'Breakfast'],
        deepLink,
      };
    });

    console.log(`Returning ${hotels.length} hotels`);

    return new Response(
      JSON.stringify({ 
        hotels,
        marker,
        searchParams: { location, checkIn, checkOut, guests }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in hotels-search function:', error);
    return new Response(
      JSON.stringify({ error: 'An error occurred while searching for hotels' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
