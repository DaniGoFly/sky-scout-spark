import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple in-memory rate limiting (per IP, resets on function cold start)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_REQUESTS = 30;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

function checkRateLimit(clientIP: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const record = rateLimitMap.get(clientIP);
  
  if (rateLimitMap.size > 1000) {
    for (const [ip, data] of rateLimitMap.entries()) {
      if (now > data.resetTime) {
        rateLimitMap.delete(ip);
      }
    }
  }
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(clientIP, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_REQUESTS - 1, resetIn: RATE_LIMIT_WINDOW_MS };
  }
  
  if (record.count >= RATE_LIMIT_REQUESTS) {
    return { allowed: false, remaining: 0, resetIn: record.resetTime - now };
  }
  
  record.count++;
  return { allowed: true, remaining: RATE_LIMIT_REQUESTS - record.count, resetIn: record.resetTime - now };
}

// Airline name mapping
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
  'LX': 'Swiss International',
  'KL': 'KLM Royal Dutch',
  'IB': 'Iberia',
  'AY': 'Finnair',
  'SK': 'SAS Scandinavian',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  });
}

/**
 * Format date as YYYY-MM-DD in UTC to avoid timezone issues
 */
function toISODateOnly(d: Date): string {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Calculate days between two dates in UTC
 */
function daysBetweenUTC(a: Date, b: Date): number {
  const msA = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
  const msB = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
  return Math.floor((msB - msA) / (1000 * 60 * 60 * 24));
}

/**
 * Parse date string safely (YYYY-MM-DD) to UTC Date
 */
function parseDateUTC(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
}

/**
 * Generate White Label booking link
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
  
  const classMap: Record<string, string> = {
    'economy': 'Y',
    'premium_economy': 'W',
    'business': 'C',
    'first': 'F',
  };
  const cabinClass = classMap[travelClass] || 'Y';
  
  const formatDateShort = (dateStr: string): string => {
    const [year, month, day] = dateStr.split('-');
    return `${day}${month}`;
  };
  
  let passengers = String(adults);
  if (children > 0) passengers += String(children);
  if (infants > 0) passengers += String(infants);
  
  const searchPath = returnDate 
    ? `${origin}${destination}${formatDateShort(departDate)}${formatDateShort(returnDate)}${passengers}`
    : `${origin}${destination}${formatDateShort(departDate)}${passengers}`;
  
  return `https://flights.goflyfinder.com/search/${searchPath}`;
}

/**
 * Generate tp.media redirect link (fallback)
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
  
  const redirectParams = new URLSearchParams();
  redirectParams.set('marker', marker);
  redirectParams.set('p', '4114');
  redirectParams.set('u', encodeURIComponent(targetUrl));
  
  return `https://tp.media/r?${redirectParams.toString()}`;
}

// Constants
const PUBLISH_WINDOW_DAYS = 360; // Airlines publish ~330-360 days ahead

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limiting
  const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                   req.headers.get('cf-connecting-ip') || 
                   req.headers.get('x-real-ip') || 
                   'unknown';
  
  const rateLimit = checkRateLimit(clientIP);
  
  if (!rateLimit.allowed) {
    console.warn(`Rate limit exceeded for IP: ${clientIP}`);
    return json({ 
      status: 'ERROR',
      error: 'Too many requests. Please try again later.',
      errorType: 'rate_limit',
      retryAfter: Math.ceil(rateLimit.resetIn / 1000)
    }, 429);
  }

  try {
    // Check for debug mode
    const url = new URL(req.url);
    const debugFromQuery = url.searchParams.get('debug') === '1';
    
    if (req.method !== 'POST') {
      return json({ status: 'BAD_REQUEST', error: 'Use POST' }, 405);
    }

    const body = await req.json().catch(() => ({}));
    const { 
      origin, 
      destination, 
      departDate, 
      returnDate, 
      adults = 1, 
      children = 0, 
      infants = 0, 
      tripType = 'roundtrip', 
      travelClass = 'economy',
      currency = 'usd',
      market = 'us',
      direct = false,
      debug: debugFromBody = false
    } = body ?? {};
    
    const debug = debugFromQuery || debugFromBody;
    
    console.log('=== FLIGHT SEARCH REQUEST ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Params:', { origin, destination, departDate, returnDate, adults, children, infants, tripType, travelClass, currency, market });
    console.log('Debug Mode:', debug);

    // Validation
    if (!origin || !destination || !departDate) {
      return json({ 
        status: 'BAD_REQUEST', 
        error: 'origin, destination, and departDate are required',
        received: { origin, destination, departDate }
      }, 400);
    }

    // Parse and validate dates
    const dep = parseDateUTC(departDate);
    const ret = returnDate ? parseDateUTC(returnDate) : null;
    
    if (isNaN(dep.getTime())) {
      return json({ status: 'BAD_REQUEST', error: 'Invalid departDate format. Use YYYY-MM-DD.' }, 400);
    }
    if (returnDate && ret && isNaN(ret.getTime())) {
      return json({ status: 'BAD_REQUEST', error: 'Invalid returnDate format. Use YYYY-MM-DD.' }, 400);
    }
    if (ret && ret.getTime() < dep.getTime()) {
      return json({ status: 'BAD_REQUEST', error: 'returnDate must be >= departDate' }, 400);
    }

    // Check if date is too far in the future
    const todayUTC = new Date();
    const daysAhead = daysBetweenUTC(todayUTC, dep);
    
    console.log('Days ahead:', daysAhead, '(publish window:', PUBLISH_WINDOW_DAYS, ')');
    
    if (daysAhead > PUBLISH_WINDOW_DAYS) {
      const suggested = new Date(todayUTC);
      suggested.setUTCDate(suggested.getUTCDate() + (PUBLISH_WINDOW_DAYS - 14));
      
      return json({
        status: 'NOT_AVAILABLE_YET',
        emptyReason: 'far_future',
        message: 'Airline inventory is usually published ~330-360 days ahead. Your selected date is too far in the future for reliable results.',
        daysAhead,
        publishWindowDays: PUBLISH_WINDOW_DAYS,
        suggestedSearchDate: toISODateOnly(suggested),
        searchParams: { origin, destination, departDate, returnDate, adults, children, infants, tripType, travelClass, currency, market },
      });
    }

    // Get secrets
    const token = Deno.env.get('TRAVELPAYOUTS_API_TOKEN') || '';
    const marker = Deno.env.get('TRAVELPAYOUTS_MARKER') || '';

    console.log('Token configured:', !!token, '(length:', token.length, ')');
    console.log('Marker configured:', !!marker);

    if (!token) {
      return json({ 
        status: 'MISCONFIGURED',
        emptyReason: 'missing_config',
        error: 'Missing TRAVELPAYOUTS_API_TOKEN in secrets.',
        debug: debug ? { hasToken: false, hasMarker: !!marker } : undefined
      });
    }

    if (!marker) {
      return json({ 
        status: 'MISCONFIGURED',
        emptyReason: 'missing_config', 
        error: 'Missing TRAVELPAYOUTS_MARKER in secrets.',
        debug: debug ? { hasToken: !!token, hasMarker: false } : undefined
      });
    }

    // Build Travelpayouts API request
    // CRITICAL: Correct endpoint is /aviasales/v3/prices_for_dates
    const api = new URL('https://api.travelpayouts.com/aviasales/v3/prices_for_dates');
    api.searchParams.set('origin', String(origin).toUpperCase());
    api.searchParams.set('destination', String(destination).toUpperCase());
    api.searchParams.set('departure_at', departDate);
    
    // CRITICAL: one_way parameter determines roundtrip vs oneway
    if (tripType === 'roundtrip' && returnDate) {
      api.searchParams.set('return_at', returnDate);
      api.searchParams.set('one_way', 'false');
    } else {
      api.searchParams.set('one_way', 'true');
    }
    
    api.searchParams.set('direct', direct ? 'true' : 'false');
    api.searchParams.set('currency', currency);
    api.searchParams.set('market', market); // CRITICAL: market affects cache availability
    api.searchParams.set('limit', '30');
    api.searchParams.set('sorting', 'price');
    api.searchParams.set('unique', 'false');
    api.searchParams.set('token', token);

    const apiUrlRedacted = api.toString().replace(token, '[TOKEN_REDACTED]');
    console.log('API URL (redacted):', apiUrlRedacted);

    // Make upstream request
    let response: Response;
    let rawText: string;
    let parseError: string | null = null;

    try {
      response = await fetch(api.toString(), {
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
      });
      rawText = await response.text();
      
      console.log('=== UPSTREAM RESPONSE ===');
      console.log('HTTP Status:', response.status, response.statusText);
      console.log('Content-Type:', response.headers.get('content-type'));
      console.log('Response Length:', rawText.length);
      console.log('Response Preview:', rawText.substring(0, 500));
      
    } catch (fetchErr) {
      const fetchError = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
      console.error('Fetch Error:', fetchError);
      
      return json({ 
        status: 'ERROR',
        emptyReason: 'upstream_error',
        error: `Failed to connect to Travelpayouts: ${fetchError}`,
        errorType: 'fetch',
        debug: debug ? { 
          requestUrl: apiUrlRedacted,
          fetchError,
          searchParams: { origin, destination, departDate, returnDate, adults, children, infants, tripType, travelClass }
        } : undefined
      });
    }

    // Parse JSON
    let data: any = null;
    try {
      data = JSON.parse(rawText);
      console.log('JSON parsed. Keys:', Object.keys(data));
      console.log('success:', data.success, 'data length:', data.data?.length, 'error:', data.error);
    } catch (jsonErr) {
      parseError = `JSON parse failed: ${jsonErr instanceof Error ? jsonErr.message : String(jsonErr)}`;
      console.error('Parse Error:', parseError);
    }

    // Build debug object
    const debugObj = debug ? {
      timestamp: new Date().toISOString(),
      requestUrl: apiUrlRedacted,
      httpStatus: response.status,
      httpStatusText: response.statusText,
      contentType: response.headers.get('content-type'),
      responseLength: rawText.length,
      responsePreview: rawText.substring(0, 2000),
      responseJsonParsed: data ? {
        success: data.success,
        currency: data.currency,
        dataLength: data.data?.length || 0,
        dataPreview: data.data?.slice(0, 3),
        error: data.error,
        allKeys: Object.keys(data)
      } : null,
      parseError,
      searchParams: { origin, destination, departDate, returnDate, adults, children, infants, tripType, travelClass, market, currency }
    } : undefined;

    // Handle non-200 responses
    if (!response.ok) {
      console.error('=== UPSTREAM ERROR (non-200) ===');
      console.error('Status:', response.status);
      
      return json({ 
        status: 'TP_ERROR',
        emptyReason: 'upstream_error',
        message: `Travelpayouts returned HTTP ${response.status}: ${response.statusText}`,
        httpStatus: response.status,
        raw: debug ? (data ?? rawText.substring(0, 500)) : undefined,
        debug: debugObj
      });
    }

    // Handle parse failure
    if (parseError || !data) {
      return json({ 
        status: 'TP_ERROR',
        emptyReason: 'upstream_error',
        message: parseError || 'Failed to parse Travelpayouts response',
        debug: debugObj
      });
    }

    // Handle API-level errors (success: false)
    if (data.success === false || data.error) {
      console.error('=== API ERROR ===');
      console.error('Error:', data.error);
      
      return json({ 
        status: 'TP_ERROR',
        emptyReason: 'upstream_error',
        message: data.error || 'Travelpayouts returned an error',
        debug: debugObj
      });
    }

    // Handle empty results - this is NOT an error, just no cached prices
    if (!data.data || data.data.length === 0) {
      console.log('=== NO CACHED PRICES ===');
      console.log('Route:', origin, '->', destination);
      console.log('Dates:', departDate, returnDate);
      console.log('This is normal for many routes - the Data API is cache-based');
      
      return json({
        status: 'NO_CACHED_PRICES',
        emptyReason: 'no_cached_prices',
        message: 'No cached prices found for this route/dates in the Aviasales Data API. This is normal for less popular routes. Try different dates or nearby airports.',
        searchParams: { origin, destination, departDate, returnDate, adults, children, infants, tripType, travelClass, market, currency },
        debug: debugObj
      });
    }

    // Transform results
    const flights = data.data.map((flight: any, index: number) => {
      const departureTime = flight.departure_at ? new Date(flight.departure_at) : null;
      const returnTime = flight.return_at ? new Date(flight.return_at) : null;
      
      const durationMinutes = flight.duration || 180;
      const arrivalTime = departureTime ? new Date(departureTime.getTime() + durationMinutes * 60000) : null;
      
      const airlineCode = flight.airline || 'XX';
      const airlineName = AIRLINE_NAMES[airlineCode] || airlineCode;
      
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
        airlineCode,
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
        alternativeLink,
        returnAt: returnTime ? returnTime.toISOString() : null,
        foundAt: flight.found_at,
      };
    });

    console.log(`=== SUCCESS: ${flights.length} flights ===`);

    return json({
      status: 'OK',
      flights,
      currency: data.currency || currency,
      marker,
      searchParams: { origin, destination, departDate, returnDate, adults, children, infants, tripType, travelClass, market, currency },
      debug: debugObj
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('=== EXCEPTION ===');
    console.error('Error:', error);
    
    return json({ 
      status: 'ERROR',
      emptyReason: 'exception',
      error: errorMessage,
      errorType: 'exception',
      debug: { timestamp: new Date().toISOString() }
    }, 500);
  }
});
