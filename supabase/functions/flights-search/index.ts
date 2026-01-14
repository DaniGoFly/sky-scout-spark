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
 * Add days to a date
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

/**
 * Generate Aviasales search URL for direct fallback
 */
function generateAviasalesSearchUrl(params: {
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
  
  const formatDateShort = (dateStr: string): string => {
    const [year, month, day] = dateStr.split('-');
    return `${day}${month}`;
  };
  
  const classMap: Record<string, string> = {
    'economy': 'Y',
    'premium_economy': 'W',
    'business': 'C',
    'first': 'F',
  };
  const cabin = classMap[travelClass] || 'Y';
  
  let passengers = String(adults);
  if (children > 0) passengers += String(children);
  if (infants > 0) passengers += String(infants);
  
  const searchPath = returnDate 
    ? `${origin}${formatDateShort(departDate)}${destination}${formatDateShort(returnDate)}${passengers}`
    : `${origin}${formatDateShort(departDate)}${destination}${passengers}`;
  
  const searchParams = new URLSearchParams();
  searchParams.set('adults', String(adults));
  searchParams.set('children', String(children));
  searchParams.set('infants', String(infants));
  searchParams.set('cabin', cabin);
  searchParams.set('with_request', 'true');
  
  return `https://www.aviasales.com/search/${searchPath}?${searchParams.toString()}`;
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
const PUBLISH_WINDOW_DAYS = 330; // Airlines publish ~330-360 days ahead (be conservative)
const MAX_FLEXIBLE_DAYS = 14; // How far to search for flexible dates

/**
 * Fetch prices from Travelpayouts API for a specific date
 */
async function fetchPricesForDate(params: {
  token: string;
  origin: string;
  destination: string;
  departDate: string;
  returnDate: string | null;
  tripType: string;
  currency: string;
  market: string;
  direct: boolean;
}): Promise<{ success: boolean; data: any[]; error?: string; httpStatus?: number; rawResponse?: string }> {
  const { token, origin, destination, departDate, returnDate, tripType, currency, market, direct } = params;
  
  const api = new URL('https://api.travelpayouts.com/aviasales/v3/prices_for_dates');
  api.searchParams.set('origin', String(origin).toUpperCase());
  api.searchParams.set('destination', String(destination).toUpperCase());
  api.searchParams.set('departure_at', departDate);
  
  if (tripType === 'roundtrip' && returnDate) {
    api.searchParams.set('return_at', returnDate);
    api.searchParams.set('one_way', 'false');
  } else {
    api.searchParams.set('one_way', 'true');
  }
  
  api.searchParams.set('direct', direct ? 'true' : 'false');
  api.searchParams.set('currency', currency);
  api.searchParams.set('market', market);
  api.searchParams.set('limit', '30');
  api.searchParams.set('sorting', 'price');
  api.searchParams.set('unique', 'false');
  api.searchParams.set('token', token);

  try {
    const response = await fetch(api.toString(), {
      headers: {
        'X-Access-Token': token,
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
    });
    
    const rawText = await response.text();
    
    if (!response.ok) {
      return { 
        success: false, 
        data: [], 
        error: `HTTP ${response.status}: ${response.statusText}`,
        httpStatus: response.status,
        rawResponse: rawText.substring(0, 500)
      };
    }
    
    const parsed = JSON.parse(rawText);
    
    if (parsed.success === false || parsed.error) {
      return { 
        success: false, 
        data: [], 
        error: parsed.error || 'API returned success=false',
        rawResponse: rawText.substring(0, 500)
      };
    }
    
    return { 
      success: true, 
      data: Array.isArray(parsed.data) ? parsed.data : [],
      httpStatus: response.status,
      rawResponse: rawText.substring(0, 500)
    };
  } catch (err) {
    return { 
      success: false, 
      data: [], 
      error: err instanceof Error ? err.message : 'Unknown fetch error'
    };
  }
}

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
      debug: debugFromBody = false,
      flexibleDates = true, // Enable flexible date search by default
    } = body ?? {};
    
    const debug = debugFromQuery || debugFromBody;
    
    // Server UTC date for consistent calculations
    const serverNow = new Date();
    const serverDateUTC = toISODateOnly(serverNow);
    
    console.log('=== FLIGHT SEARCH REQUEST ===');
    console.log('Server UTC Date:', serverDateUTC);
    console.log('Params:', { origin, destination, departDate, returnDate, adults, children, infants, tripType, travelClass, currency, market, flexibleDates });
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

    // Check how far in the future the date is
    const todayUTC = parseDateUTC(serverDateUTC);
    const daysAhead = daysBetweenUTC(todayUTC, dep);
    
    console.log('Days ahead:', daysAhead, '(publish window:', PUBLISH_WINDOW_DAYS, ')');

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

    // Generate direct Aviasales search URL for fallback
    const aviasalesDirectUrl = generateAviasalesSearchUrl({
      origin,
      destination,
      departDate,
      returnDate: returnDate || undefined,
      adults,
      children,
      infants,
      travelClass,
    });

    // If date is beyond publish window, provide helpful response with alternatives
    if (daysAhead > PUBLISH_WINDOW_DAYS) {
      const suggestedDate = addDays(todayUTC, PUBLISH_WINDOW_DAYS - 30); // 30 days before edge of window
      const suggestedDateStr = toISODateOnly(suggestedDate);
      
      // Calculate the duration between depart and return for the suggested dates
      let suggestedReturn: string | undefined;
      if (tripType === 'roundtrip' && returnDate) {
        const tripDuration = daysBetweenUTC(dep, ret!);
        const suggestedReturnDate = addDays(suggestedDate, tripDuration);
        suggestedReturn = toISODateOnly(suggestedReturnDate);
      }
      
      console.log('=== DATE TOO FAR IN FUTURE ===');
      console.log('Requested:', daysAhead, 'days ahead. Max:', PUBLISH_WINDOW_DAYS);
      console.log('Suggested date:', suggestedDateStr);
      
      return json({
        status: 'CACHE_LIMITATION',
        emptyReason: 'far_future',
        message: 'Airlines typically publish fares 9-11 months in advance. Your selected date is beyond the current booking window.',
        userFriendlyMessage: 'No cached prices available yet for these dates. Airlines usually release prices 9–12 months in advance. Try nearer dates or use the direct search link below.',
        daysAhead,
        publishWindowDays: PUBLISH_WINDOW_DAYS,
        suggestedSearchDate: suggestedDateStr,
        suggestedReturnDate: suggestedReturn,
        aviasalesDirectUrl,
        searchParams: { origin, destination, departDate, returnDate, adults, children, infants, tripType, travelClass, currency, market },
      });
    }

    // Build API request for primary date
    const api = new URL('https://api.travelpayouts.com/aviasales/v3/prices_for_dates');
    api.searchParams.set('origin', String(origin).toUpperCase());
    api.searchParams.set('destination', String(destination).toUpperCase());
    api.searchParams.set('departure_at', departDate);
    
    if (tripType === 'roundtrip' && returnDate) {
      api.searchParams.set('return_at', returnDate);
      api.searchParams.set('one_way', 'false');
    } else {
      api.searchParams.set('one_way', 'true');
    }
    
    api.searchParams.set('direct', direct ? 'true' : 'false');
    api.searchParams.set('currency', currency);
    api.searchParams.set('market', market);
    api.searchParams.set('limit', '30');
    api.searchParams.set('sorting', 'price');
    api.searchParams.set('unique', 'false');
    api.searchParams.set('token', token);

    const apiUrlRedacted = api.toString().replace(token, '[TOKEN_REDACTED]');
    console.log('API URL (redacted):', apiUrlRedacted);

    // Make primary request
    let response: Response;
    let rawText: string;
    let parseError: string | null = null;

    try {
      response = await fetch(api.toString(), {
        headers: {
          'X-Access-Token': token,
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
        emptyReason: 'service_unavailable',
        error: `Service temporarily unavailable`,
        userFriendlyMessage: 'Unable to connect to the flight data service. Please try again in a moment.',
        errorType: 'fetch',
        aviasalesDirectUrl,
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
      serverDateUTC,
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
      daysAhead,
      searchParams: { origin, destination, departDate, returnDate, adults, children, infants, tripType, travelClass, market, currency }
    } : undefined;

    // Handle non-200 responses (real API errors)
    if (!response.ok) {
      console.error('=== UPSTREAM ERROR (non-200) ===');
      console.error('Status:', response.status);
      
      return json({ 
        status: 'ERROR',
        emptyReason: 'service_unavailable',
        message: `Service returned an error`,
        userFriendlyMessage: 'The flight data service is temporarily unavailable. Please try again or use the direct search link.',
        httpStatus: response.status,
        aviasalesDirectUrl,
        raw: debug ? (data ?? rawText.substring(0, 500)) : undefined,
        debug: debugObj
      });
    }

    // Handle parse failure
    if (parseError || !data) {
      return json({ 
        status: 'ERROR',
        emptyReason: 'service_unavailable',
        message: 'Unable to process flight data',
        userFriendlyMessage: 'We encountered an issue loading flight data. Please try again or use the direct search link.',
        aviasalesDirectUrl,
        debug: debugObj
      });
    }

    // Handle API-level errors (success: false)
    if (data.success === false || data.error) {
      console.error('=== API ERROR ===');
      console.error('Error:', data.error);
      
      return json({ 
        status: 'ERROR',
        emptyReason: 'service_unavailable',
        message: 'Flight data service error',
        userFriendlyMessage: 'The flight data service returned an error. Please try again or use the direct search link.',
        aviasalesDirectUrl,
        debug: debugObj
      });
    }

    // Handle empty results - THIS IS NOT AN ERROR!
    // Aviasales Data API is cache-based, empty results are normal for many routes
    if (!data.data || data.data.length === 0) {
      console.log('=== EMPTY CACHE - TRYING FLEXIBLE DATES ===');
      
      // Try flexible date searches if enabled
      let flexibleResults: any[] = [];
      let flexibleSearchDates: string[] = [];
      
      if (flexibleDates) {
        const offsets = [-7, 7, 14]; // Days to try
        
        for (const offset of offsets) {
          const flexDate = addDays(dep, offset);
          const flexDaysAhead = daysBetweenUTC(todayUTC, flexDate);
          
          // Only try if within valid range (past today but within publish window)
          if (flexDaysAhead >= 1 && flexDaysAhead <= PUBLISH_WINDOW_DAYS) {
            const flexDateStr = toISODateOnly(flexDate);
            
            let flexReturn: string | null = null;
            if (tripType === 'roundtrip' && ret) {
              const tripDuration = daysBetweenUTC(dep, ret);
              flexReturn = toISODateOnly(addDays(flexDate, tripDuration));
            }
            
            console.log(`Trying flexible date: ${flexDateStr} (offset: ${offset})`);
            
            const flexResult = await fetchPricesForDate({
              token,
              origin,
              destination,
              departDate: flexDateStr,
              returnDate: flexReturn,
              tripType,
              currency,
              market,
              direct,
            });
            
            if (flexResult.success && flexResult.data.length > 0) {
              flexibleSearchDates.push(flexDateStr);
              flexibleResults.push(...flexResult.data.map(f => ({
                ...f,
                isFlexibleDate: true,
                originalDepartDate: departDate,
                flexibleDepartDate: flexDateStr,
              })));
            }
          }
        }
      }
      
      // If we found flexible results, return them
      if (flexibleResults.length > 0) {
        console.log(`=== FOUND ${flexibleResults.length} FLEXIBLE RESULTS ===`);
        
        // Transform and deduplicate
        const seen = new Set<string>();
        const flights = flexibleResults
          .filter(flight => {
            const key = `${flight.departure_at}-${flight.price}-${flight.airline}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          })
          .slice(0, 30)
          .map((flight: any, index: number) => {
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
              departDate: flight.flexibleDepartDate || departDate,
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
              departDate: flight.flexibleDepartDate || departDate,
              returnDate: returnDate || undefined,
              adults,
              children,
              infants,
              travelClass,
            });

            return {
              id: `flight-flex-${index}-${flight.flight_number || Math.random().toString(36).substr(2, 9)}`,
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
              isFlexibleDate: true,
              flexibleDepartDate: flight.flexibleDepartDate,
            };
          });

        return json({
          status: 'OK_FLEXIBLE',
          emptyReason: null,
          message: 'No exact date matches found, showing nearby dates',
          userFriendlyMessage: `No cached prices for ${departDate}. Showing prices for nearby dates.`,
          flights,
          flexibleDatesUsed: flexibleSearchDates,
          currency: data.currency || currency,
          marker,
          aviasalesDirectUrl,
          searchParams: { origin, destination, departDate, returnDate, adults, children, infants, tripType, travelClass, market, currency },
          debug: debugObj
        });
      }
      
      // No results even with flexible dates - this is a cache limitation, NOT an error
      console.log('=== NO CACHED PRICES (cache limitation) ===');
      console.log('Route:', origin, '->', destination);
      console.log('Dates tried:', departDate, ...flexibleSearchDates);
      
      return json({
        status: 'CACHE_EMPTY',
        emptyReason: 'no_cached_prices',
        message: 'No cached prices available',
        userFriendlyMessage: 'No cached prices available yet for these dates. Airlines usually release prices 9–12 months in advance. Try nearer dates or flexible search.',
        aviasalesDirectUrl,
        searchParams: { origin, destination, departDate, returnDate, adults, children, infants, tripType, travelClass, market, currency },
        flexibleDatesSearched: flexibleSearchDates,
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
      aviasalesDirectUrl,
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
      userFriendlyMessage: 'An unexpected error occurred. Please try again.',
      errorType: 'exception',
      debug: { timestamp: new Date().toISOString() }
    }, 500);
  }
});
