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
 * Parse date string YYYY-MM-DD to Date object at noon UTC to avoid timezone issues
 */
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

/**
 * Calculate months between two dates (from date a to date b)
 * Returns positive number if b is after a
 */
function monthsBetween(a: Date, b: Date): number {
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}

/**
 * Check if date is too far for airline pricing (>11 months ahead)
 * Airlines typically release pricing 9-12 months before departure
 */
function isTooFarForPricing(departDateStr: string): boolean {
  const departDate = parseLocalDate(departDateStr);
  const now = new Date();
  now.setHours(12, 0, 0, 0); // Normalize to noon
  const months = monthsBetween(now, departDate);
  return months > 11;
}

/**
 * Calculate months ahead from today for a given date string
 */
function getMonthsAhead(departDateStr: string): number {
  const departDate = parseLocalDate(departDateStr);
  const now = new Date();
  now.setHours(12, 0, 0, 0);
  return monthsBetween(now, departDate);
}

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
  
  // tp.media redirect with tracking - marker is REQUIRED
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
    // Check for debug mode from BOTH query string AND body
    const url = new URL(req.url);
    const debugFromQuery = url.searchParams.get('debug') === '1';
    
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
      debug: debugFromBody = false
    } = requestBody;
    
    // Debug is enabled if either query param or body flag is set
    const debug = debugFromQuery || debugFromBody;
    
    console.log('=== FLIGHT SEARCH REQUEST ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Origin:', origin);
    console.log('Destination:', destination);
    console.log('Depart Date:', departDate);
    console.log('Return Date:', returnDate);
    console.log('Adults:', adults, 'Children:', children, 'Infants:', infants);
    console.log('Trip Type:', tripType);
    console.log('Travel Class:', travelClass);
    console.log('Debug Mode:', debug);

    // SECURITY: API token MUST come from environment - no hardcoded fallbacks
    const apiToken = Deno.env.get('TRAVELPAYOUTS_API_TOKEN');
    const marker = Deno.env.get('TRAVELPAYOUTS_MARKER');

    console.log('API Token configured:', !!apiToken);
    console.log('API Token length:', apiToken?.length || 0);
    console.log('Marker configured:', marker ? `${marker.substring(0, 6)}...` : 'NOT SET');

    if (!apiToken) {
      console.error('CRITICAL: TRAVELPAYOUTS_API_TOKEN not configured');
      return new Response(
        JSON.stringify({ 
          flights: [],
          status: 'ERROR',
          emptyReason: 'missing_config',
          error: 'API credentials not configured. Please add your Travelpayouts API token.',
          errorType: 'config',
          debug: debug ? { 
            timestamp: new Date().toISOString(),
            hasToken: false,
            hasMarker: !!marker
          } : undefined
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!marker) {
      console.error('CRITICAL: TRAVELPAYOUTS_MARKER not configured');
      return new Response(
        JSON.stringify({ 
          flights: [],
          status: 'ERROR',
          emptyReason: 'missing_config',
          error: 'Affiliate marker not configured. Please add your Travelpayouts marker.',
          errorType: 'config',
          debug: debug ? { 
            timestamp: new Date().toISOString(),
            hasToken: !!apiToken,
            hasMarker: false
          } : undefined
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    const apiUrlForLogging = searchUrl.toString().replace(apiToken, '[TOKEN_REDACTED]');
    console.log('=== API REQUEST ===');
    console.log('Full URL (redacted):', apiUrlForLogging);

    // Make the upstream request
    let response: Response;
    let rawText: string;
    let data: any;
    let parseError: string | null = null;

    try {
      response = await fetch(searchUrl.toString());
      rawText = await response.text();
      
      console.log('=== UPSTREAM RESPONSE ===');
      console.log('HTTP Status:', response.status);
      console.log('Status Text:', response.statusText);
      console.log('Content-Type:', response.headers.get('content-type'));
      console.log('Raw Response Length:', rawText.length);
      console.log('Raw Response Preview (first 500 chars):', rawText.substring(0, 500));
      
      // Try to parse JSON
      try {
        data = JSON.parse(rawText);
        console.log('JSON Parsed Successfully');
        console.log('Response keys:', Object.keys(data));
        console.log('data.success:', data.success);
        console.log('data.data exists:', !!data.data);
        console.log('data.data length:', data.data?.length);
        console.log('data.error:', data.error);
      } catch (jsonErr) {
        parseError = `JSON parse failed: ${jsonErr instanceof Error ? jsonErr.message : String(jsonErr)}`;
        console.error('JSON Parse Error:', parseError);
        data = null;
      }
    } catch (fetchErr) {
      const fetchError = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
      console.error('Fetch Error:', fetchError);
      
      return new Response(
        JSON.stringify({ 
          flights: [],
          status: 'ERROR',
          emptyReason: 'upstream_error',
          error: `Failed to connect to flight provider: ${fetchError}`,
          errorType: 'fetch',
          debug: debug ? { 
            timestamp: new Date().toISOString(),
            requestUrl: apiUrlForLogging,
            error: fetchError,
            searchParams: { origin, destination, departDate, returnDate, adults, children, infants, tripType, travelClass }
          } : undefined
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build debug object for response
    const debugObj = debug ? {
      timestamp: new Date().toISOString(),
      requestUrl: apiUrlForLogging,
      httpStatus: response.status,
      httpStatusText: response.statusText,
      contentType: response.headers.get('content-type'),
      responseLength: rawText.length,
      responsePreview: rawText.substring(0, 2000),
      responseJsonParsed: data ? {
        success: data.success,
        currency: data.currency,
        dataLength: data.data?.length || 0,
        dataPreview: data.data?.slice(0, 3) || null,
        error: data.error,
        allKeys: Object.keys(data)
      } : null,
      parseError: parseError,
      searchParams: { origin, destination, departDate, returnDate, adults, children, infants, tripType, travelClass }
    } : undefined;

    // Handle non-200 responses from upstream
    if (!response.ok) {
      console.error('=== UPSTREAM ERROR (non-200) ===');
      console.error('Status:', response.status);
      console.error('Body:', rawText.substring(0, 1000));
      
      return new Response(
        JSON.stringify({ 
          flights: [],
          status: 'ERROR',
          emptyReason: 'upstream_error',
          error: `Flight provider returned HTTP ${response.status}: ${response.statusText}`,
          errorType: 'upstream_http',
          details: data?.error || data?.message || rawText.substring(0, 200),
          debug: debugObj
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle JSON parse failure
    if (parseError || !data) {
      console.error('=== JSON PARSE ERROR ===');
      
      return new Response(
        JSON.stringify({ 
          flights: [],
          status: 'ERROR',
          emptyReason: 'upstream_error',
          error: parseError || 'Failed to parse upstream response',
          errorType: 'parse',
          debug: debugObj
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle API-level errors (success: false or error field)
    if (data.success === false || data.error) {
      console.error('=== API ERROR RESPONSE ===');
      console.error('Error:', data.error);
      console.error('Message:', data.message);
      
      return new Response(
        JSON.stringify({ 
          flights: [],
          status: 'ERROR',
          emptyReason: 'upstream_error',
          error: data.error || data.message || 'Flight provider returned an error',
          errorType: 'api',
          debug: debugObj
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Check for empty results - provide clear reason with correct monthsAhead calculation
    if (!data.data || data.data.length === 0) {
      const monthsAhead = getMonthsAhead(departDate);
      const farFuture = monthsAhead > 11;
      
      console.log('=== NO FLIGHTS FOUND ===');
      console.log('Depart date:', departDate);
      console.log('Today:', new Date().toISOString().split('T')[0]);
      console.log('Months ahead:', monthsAhead);
      console.log('Is far future (>11 months):', farFuture);
      console.log('Reason:', farFuture ? 'NO_PRICING_YET - Airlines have not released pricing' : 'NO_RESULTS - API returned empty data array');
      console.log('API success field:', data.success);
      console.log('API currency:', data.currency);
      
      return new Response(
        JSON.stringify({ 
          flights: [],
          status: farFuture ? 'NO_PRICING_YET' : 'NO_RESULTS',
          emptyReason: farFuture ? 'far_future' : 'no_results',
          message: farFuture 
            ? 'Prices for this date are not available yet. Airlines usually publish fares 6-11 months in advance.'
            : 'No flights found for this route and date combination. The API returned an empty result set.',
          monthsAhead,
          searchParams: { origin, destination, departDate, returnDate, adults, children, infants, tripType, travelClass },
          debug: debugObj
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
      // Marker is ALWAYS included via the function parameters
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
      // Marker is ALWAYS included in the tp.media link
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
        deepLink, // Primary: White Label link with marker
        alternativeLink, // Backup: tp.media redirect with marker
        returnAt: returnTime ? returnTime.toISOString() : null,
        foundAt: flight.found_at,
      };
    });

    console.log(`=== SUCCESS: Returning ${flights.length} flights ===`);

    return new Response(
      JSON.stringify({ 
        flights,
        marker, // Include marker for client-side verification
        searchParams: { origin, destination, departDate, returnDate, adults, children, infants, tripType, travelClass },
        debug: debug ? { 
          url: apiUrlForLogging, 
          status: response.status, 
          rawDataCount: data.data?.length,
          timestamp: new Date().toISOString()
        } : undefined
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
        errorType: 'exception',
        debug: { timestamp: new Date().toISOString() }
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
