import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Airline name mapping for display
const AIRLINE_NAMES: Record<string, string> = {
  'AA': 'American Airlines', 'UA': 'United Airlines', 'DL': 'Delta Air Lines',
  'WN': 'Southwest Airlines', 'B6': 'JetBlue Airways', 'AS': 'Alaska Airlines',
  'NK': 'Spirit Airlines', 'F9': 'Frontier Airlines', 'BA': 'British Airways',
  'AF': 'Air France', 'LH': 'Lufthansa', 'EK': 'Emirates', 'QR': 'Qatar Airways',
  'SQ': 'Singapore Airlines', 'CX': 'Cathay Pacific', 'JL': 'Japan Airlines',
  'NH': 'All Nippon Airways', 'TK': 'Turkish Airlines', 'QF': 'Qantas',
  'AC': 'Air Canada', 'LX': 'Swiss International', 'KL': 'KLM Royal Dutch',
  'IB': 'Iberia', 'AY': 'Finnair', 'SK': 'SAS Scandinavian', 'VS': 'Virgin Atlantic',
  'EI': 'Aer Lingus', 'TP': 'TAP Portugal', 'A3': 'Aegean Airlines',
  'OS': 'Austrian Airlines', 'LO': 'LOT Polish', 'SN': 'Brussels Airlines',
  'AZ': 'ITA Airways', 'RO': 'TAROM', 'OK': 'Czech Airlines',
  'U2': 'easyJet', 'FR': 'Ryanair', 'W6': 'Wizz Air', 'VY': 'Vueling',
  'PC': 'Pegasus Airlines', 'XQ': 'SunExpress', '4U': 'Germanwings',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function md5(str: string): string {
  // Minimal MD5 implementation (avoids external hash imports that may be unavailable in edge runtime)
  function rotateLeft(x: number, n: number): number {
    return (x << n) | (x >>> (32 - n));
  }

  function addUnsigned(x: number, y: number): number {
    const x8 = x & 0x80000000;
    const y8 = y & 0x80000000;
    const x4 = x & 0x40000000;
    const y4 = y & 0x40000000;
    const result = (x & 0x3fffffff) + (y & 0x3fffffff);
    if (x4 & y4) return result ^ 0x80000000 ^ x8 ^ y8;
    if (x4 | y4) {
      if (result & 0x40000000) return result ^ 0xc0000000 ^ x8 ^ y8;
      return result ^ 0x40000000 ^ x8 ^ y8;
    }
    return result ^ x8 ^ y8;
  }

  function F(x: number, y: number, z: number): number {
    return (x & y) | (~x & z);
  }
  function G(x: number, y: number, z: number): number {
    return (x & z) | (y & ~z);
  }
  function H(x: number, y: number, z: number): number {
    return x ^ y ^ z;
  }
  function I(x: number, y: number, z: number): number {
    return y ^ (x | ~z);
  }

  function FF(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
    a = addUnsigned(a, addUnsigned(addUnsigned(F(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function GG(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
    a = addUnsigned(a, addUnsigned(addUnsigned(G(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function HH(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
    a = addUnsigned(a, addUnsigned(addUnsigned(H(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function II(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
    a = addUnsigned(a, addUnsigned(addUnsigned(I(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }

  function convertToWordArray(s: string): number[] {
    const lWordCount = (((s.length + 8) - ((s.length + 8) % 64)) / 64 + 1) * 16;
    const lWordArray: number[] = Array(lWordCount - 1).fill(0);
    let lByteCount = 0;
    while (lByteCount < s.length) {
      const lWordPosition = (lByteCount - (lByteCount % 4)) / 4;
      const lBytePosition = (lByteCount % 4) * 8;
      lWordArray[lWordPosition] = lWordArray[lWordPosition] | (s.charCodeAt(lByteCount) << lBytePosition);
      lByteCount++;
    }
    const lWordPosition = (lByteCount - (lByteCount % 4)) / 4;
    const lBytePosition = (lByteCount % 4) * 8;
    lWordArray[lWordPosition] = lWordArray[lWordPosition] | (0x80 << lBytePosition);
    lWordArray[lWordCount - 2] = s.length << 3;
    lWordArray[lWordCount - 1] = s.length >>> 29;
    return lWordArray;
  }

  function wordToHex(lValue: number): string {
    let wordToHexValue = "";
    for (let lCount = 0; lCount <= 3; lCount++) {
      const lByte = (lValue >>> (lCount * 8)) & 255;
      const wordToHexValueTemp = "0" + lByte.toString(16);
      wordToHexValue = wordToHexValue + wordToHexValueTemp.slice(-2);
    }
    return wordToHexValue;
  }

  const x = convertToWordArray(str);
  let a = 0x67452301;
  let b = 0xefcdab89;
  let c = 0x98badcfe;
  let d = 0x10325476;

  const S11 = 7, S12 = 12, S13 = 17, S14 = 22;
  const S21 = 5, S22 = 9, S23 = 14, S24 = 20;
  const S31 = 4, S32 = 11, S33 = 16, S34 = 23;
  const S41 = 6, S42 = 10, S43 = 15, S44 = 21;

  for (let k = 0; k < x.length; k += 16) {
    const AA = a, BB = b, CC = c, DD = d;
    a = FF(a, b, c, d, x[k + 0], S11, 0xd76aa478); d = FF(d, a, b, c, x[k + 1], S12, 0xe8c7b756);
    c = FF(c, d, a, b, x[k + 2], S13, 0x242070db); b = FF(b, c, d, a, x[k + 3], S14, 0xc1bdceee);
    a = FF(a, b, c, d, x[k + 4], S11, 0xf57c0faf); d = FF(d, a, b, c, x[k + 5], S12, 0x4787c62a);
    c = FF(c, d, a, b, x[k + 6], S13, 0xa8304613); b = FF(b, c, d, a, x[k + 7], S14, 0xfd469501);
    a = FF(a, b, c, d, x[k + 8], S11, 0x698098d8); d = FF(d, a, b, c, x[k + 9], S12, 0x8b44f7af);
    c = FF(c, d, a, b, x[k + 10], S13, 0xffff5bb1); b = FF(b, c, d, a, x[k + 11], S14, 0x895cd7be);
    a = FF(a, b, c, d, x[k + 12], S11, 0x6b901122); d = FF(d, a, b, c, x[k + 13], S12, 0xfd987193);
    c = FF(c, d, a, b, x[k + 14], S13, 0xa679438e); b = FF(b, c, d, a, x[k + 15], S14, 0x49b40821);
    a = GG(a, b, c, d, x[k + 1], S21, 0xf61e2562); d = GG(d, a, b, c, x[k + 6], S22, 0xc040b340);
    c = GG(c, d, a, b, x[k + 11], S23, 0x265e5a51); b = GG(b, c, d, a, x[k + 0], S24, 0xe9b6c7aa);
    a = GG(a, b, c, d, x[k + 5], S21, 0xd62f105d); d = GG(d, a, b, c, x[k + 10], S22, 0x2441453);
    c = GG(c, d, a, b, x[k + 15], S23, 0xd8a1e681); b = GG(b, c, d, a, x[k + 4], S24, 0xe7d3fbc8);
    a = GG(a, b, c, d, x[k + 9], S21, 0x21e1cde6); d = GG(d, a, b, c, x[k + 14], S22, 0xc33707d6);
    c = GG(c, d, a, b, x[k + 3], S23, 0xf4d50d87); b = GG(b, c, d, a, x[k + 8], S24, 0x455a14ed);
    a = GG(a, b, c, d, x[k + 13], S21, 0xa9e3e905); d = GG(d, a, b, c, x[k + 2], S22, 0xfcefa3f8);
    c = GG(c, d, a, b, x[k + 7], S23, 0x676f02d9); b = GG(b, c, d, a, x[k + 12], S24, 0x8d2a4c8a);
    a = HH(a, b, c, d, x[k + 5], S31, 0xfffa3942); d = HH(d, a, b, c, x[k + 8], S32, 0x8771f681);
    c = HH(c, d, a, b, x[k + 11], S33, 0x6d9d6122); b = HH(b, c, d, a, x[k + 14], S34, 0xfde5380c);
    a = HH(a, b, c, d, x[k + 1], S31, 0xa4beea44); d = HH(d, a, b, c, x[k + 4], S32, 0x4bdecfa9);
    c = HH(c, d, a, b, x[k + 7], S33, 0xf6bb4b60); b = HH(b, c, d, a, x[k + 10], S34, 0xbebfbc70);
    a = HH(a, b, c, d, x[k + 13], S31, 0x289b7ec6); d = HH(d, a, b, c, x[k + 0], S32, 0xeaa127fa);
    c = HH(c, d, a, b, x[k + 3], S33, 0xd4ef3085); b = HH(b, c, d, a, x[k + 6], S34, 0x4881d05);
    a = HH(a, b, c, d, x[k + 9], S31, 0xd9d4d039); d = HH(d, a, b, c, x[k + 12], S32, 0xe6db99e5);
    c = HH(c, d, a, b, x[k + 15], S33, 0x1fa27cf8); b = HH(b, c, d, a, x[k + 2], S34, 0xc4ac5665);
    a = II(a, b, c, d, x[k + 0], S41, 0xf4292244); d = II(d, a, b, c, x[k + 7], S42, 0x432aff97);
    c = II(c, d, a, b, x[k + 14], S43, 0xab9423a7); b = II(b, c, d, a, x[k + 5], S44, 0xfc93a039);
    a = II(a, b, c, d, x[k + 12], S41, 0x655b59c3); d = II(d, a, b, c, x[k + 3], S42, 0x8f0ccc92);
    c = II(c, d, a, b, x[k + 10], S43, 0xffeff47d); b = II(b, c, d, a, x[k + 1], S44, 0x85845dd1);
    a = II(a, b, c, d, x[k + 8], S41, 0x6fa87e4f); d = II(d, a, b, c, x[k + 15], S42, 0xfe2ce6e0);
    c = II(c, d, a, b, x[k + 6], S43, 0xa3014314); b = II(b, c, d, a, x[k + 13], S44, 0x4e0811a1);
    a = II(a, b, c, d, x[k + 4], S41, 0xf7537e82); d = II(d, a, b, c, x[k + 11], S42, 0xbd3af235);
    c = II(c, d, a, b, x[k + 2], S43, 0x2ad7d2bb); b = II(b, c, d, a, x[k + 9], S44, 0xeb86d391);
    a = addUnsigned(a, AA); b = addUnsigned(b, BB); c = addUnsigned(c, CC); d = addUnsigned(d, DD);
  }

  return wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d);
}

/**
 * Recursively extract all primitive values from an object, sorted alphabetically by key path
 */
function extractValues(obj: unknown, prefix = ''): string[] {
  if (obj === null || obj === undefined) return [];
  
  if (typeof obj !== 'object') {
    return [String(obj)];
  }
  
  if (Array.isArray(obj)) {
    const results: string[] = [];
    for (let i = 0; i < obj.length; i++) {
      results.push(...extractValues(obj[i], `${prefix}[${i}]`));
    }
    return results;
  }
  
  const sortedKeys = Object.keys(obj).sort();
  const results: string[] = [];
  
  for (const key of sortedKeys) {
    results.push(...extractValues((obj as Record<string, unknown>)[key], prefix ? `${prefix}.${key}` : key));
  }
  
  return results;
}

function generateV3Signature(token: string, marker: string, params: Record<string, unknown>): string {
  // Spec: md5(token:marker:all_request_parameter_values_sorted)
  // We exclude marker/signature keys from value collection to avoid duplication.
  const { marker: _m, signature: _s, ...rest } = params as Record<string, unknown>;
  const values = extractValues(rest);
  const signatureData = `${token}:${marker}:${values.join(':')}`;
  console.log('[SignatureV3] Input (first 200 chars):', signatureData.substring(0, 200));
  return md5(signatureData);
}

/**
 * Format duration in minutes to human readable string
 */
function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}

/**
 * Get airline logo URL
 */
function getAirlineLogo(iataCode: string): string {
  return `https://pics.avs.io/100/100/${iataCode}.png`;
}

// Realistic booking providers (demo mode only)
const BOOKING_PROVIDERS = [
  { name: 'Turna', urlBase: 'https://www.turna.com/en/flight/booking' },
  { name: 'Kiwi', urlBase: 'https://www.kiwi.com/en/booking' },
  { name: 'Trip.com', urlBase: 'https://www.trip.com/flights/booking' },
  { name: 'Expedia', urlBase: 'https://www.expedia.com/Flight-Checkout' },
  { name: 'CheapOair', urlBase: 'https://www.cheapoair.com/flight/checkout' },
  { name: 'Priceline', urlBase: 'https://www.priceline.com/checkout/flights' },
];

const AVIASALES_V3_BASE = 'https://api.travelpayouts.com/aviasales/v3';

/**
 * Generate realistic mock flight data with provider booking URLs
 */
function generateMockFlights(origin: string, destination: string, searchId: string, marker: string): any[] {
  const mockAirlines = [
    { code: 'LH', name: 'Lufthansa', basePrice: 650 },
    { code: 'LX', name: 'Swiss International', basePrice: 720 },
    { code: 'UA', name: 'United Airlines', basePrice: 580 },
    { code: 'DL', name: 'Delta Air Lines', basePrice: 610 },
    { code: 'BA', name: 'British Airways', basePrice: 690 },
    { code: 'AF', name: 'Air France', basePrice: 640 },
    { code: 'KL', name: 'KLM Royal Dutch', basePrice: 620 },
    { code: 'AA', name: 'American Airlines', basePrice: 595 },
    { code: 'TK', name: 'Turkish Airlines', basePrice: 520 },
    { code: 'EK', name: 'Emirates', basePrice: 890 },
  ];
  
  const departureTimes = ['06:15', '08:30', '10:45', '12:20', '14:55', '16:30', '18:15', '20:40', '22:05'];
  const routeHash = (origin.charCodeAt(0) + destination.charCodeAt(0)) % 100;
  
  const flights = [];
  const numFlights = 8 + (routeHash % 5);
  
  for (let i = 0; i < numFlights; i++) {
    const airline = mockAirlines[i % mockAirlines.length];
    const depTime = departureTimes[i % departureTimes.length];
    
    const baseDuration = 540 + (routeHash + i * 37) % 300;
    const stops = i < 3 ? 0 : (i < 6 ? 1 : 2);
    const stopDuration = stops * 90;
    const totalDuration = baseDuration + stopDuration;
    
    const [depHour, depMin] = depTime.split(':').map(Number);
    const arrMinutes = (depHour * 60 + depMin + totalDuration) % 1440;
    const arrHour = Math.floor(arrMinutes / 60);
    const arrMin = arrMinutes % 60;
    const arrivalTime = `${String(arrHour).padStart(2, '0')}:${String(arrMin).padStart(2, '0')}`;
    
    const priceModifier = stops === 0 ? 1.3 : stops === 1 ? 1.0 : 0.8;
    const timeModifier = depHour < 8 || depHour > 20 ? 0.9 : 1.0;
    const price = Math.round(airline.basePrice * priceModifier * timeModifier + (routeHash * 3));
    
    // Use real provider booking URLs (NOT aviasales search pages)
    const provider = BOOKING_PROVIDERS[i % BOOKING_PROVIDERS.length];
    const bookingId = `${searchId.substring(0, 8)}-${i}`;
    const deepLink = `${provider.urlBase}?ref=${bookingId}&origin=${origin}&dest=${destination}&carrier=${airline.code}&marker=${marker}`;
    
    flights.push({
      id: `${searchId}-mock-${i}`,
      airline: airline.name,
      airlineLogo: getAirlineLogo(airline.code),
      flightNumber: `${airline.code}${100 + (routeHash + i * 7) % 900}`,
      departureTime: depTime,
      arrivalTime,
      departureCode: origin,
      arrivalCode: destination,
      duration: formatDuration(totalDuration),
      durationMinutes: totalDuration,
      stops,
      price,
      currency: 'USD',
      deepLink,
      gateId: 'mock',
      isLive: false,
      isMock: true
    });
  }
  
  flights.sort((a, b) => a.price - b.price);
  console.log('[LiveFlightSearch] Generated', flights.length, 'sample flights for', origin, '->', destination);
  
  return flights;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { action, searchId, resultsUrl, lastUpdateTimestamp, ...searchParams } = body;

    const token = Deno.env.get('TRAVELPAYOUTS_API_TOKEN') || '';
    const marker = Deno.env.get('TRAVELPAYOUTS_MARKER') || '';

    // Feature flag:
    // - default TRUE (production-safe)
    // - if explicitly set to 'false' -> demo mode mock flights
    const liveResultsEnabled = Deno.env.get('LIVE_RESULTS_ENABLED') !== 'false';

    if (!token || !marker) {
      return json({ 
        status: 'MISCONFIGURED', 
        error: 'Missing API credentials' 
      }, 500);
    }

    const userIp =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('cf-connecting-ip') ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1';

    const realHost = 'www.goflyfinder.com';

    // ACTION: Create a new search
    if (action === 'create') {
      const { 
        origin, 
        destination, 
        departDate, 
        returnDate, 
        adults = 1, 
        children = 0, 
        infants = 0,
        tripClass = 'Y',
        currency = 'USD'
      } = searchParams;

      if (!origin || !destination || !departDate) {
        return json({ 
          status: 'BAD_REQUEST', 
          error: 'origin, destination, and departDate are required' 
        }, 400);
      }

      // Demo mode: ONLY when LIVE_RESULTS_ENABLED is explicitly false
      if (!liveResultsEnabled) {
        const searchIdGenerated = crypto.randomUUID();
        const mockFlights = generateMockFlights(origin.toUpperCase(), destination.toUpperCase(), searchIdGenerated, marker);
        return json({
          status: 'COMPLETE',
          searchId: searchIdGenerated,
          flights: mockFlights,
          isComplete: true,
          rawCount: mockFlights.length,
          isMock: true,
          isDemo: true,
          message: 'Demo mode enabled (LIVE_RESULTS_ENABLED=false)'
        });
      }

      // Build directions (1 = oneway, 2 = roundtrip)
      const directions: Array<{ origin: string; destination: string; date: string }> = [
        { origin: String(origin).toUpperCase(), destination: String(destination).toUpperCase(), date: departDate },
      ];

      if (returnDate) {
        directions.push({
          origin: String(destination).toUpperCase(),
          destination: String(origin).toUpperCase(),
          date: returnDate,
        });
      }

      // Aviasales Flight Search API v3 request
      const requestPayload = {
        marker,
        locale: 'en',
        currency_code: String(currency).toUpperCase(),
        market_code: 'us',
        search_params: {
          trip_class: String(tripClass).toUpperCase(),
          passengers: {
            adults: Number(adults),
            children: Number(children),
            infants: Number(infants),
          },
          directions,
        },
      };

      const signature = generateV3Signature(token, marker, requestPayload);
      const finalPayload = { signature, ...requestPayload };
      const url = `${AVIASALES_V3_BASE}/search`;

      console.log('[LiveFlightSearch][V3] URL:', url);
      console.log('[LiveFlightSearch][V3] Payload:', JSON.stringify(requestPayload));

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'x-affiliate-user-id': token,
          'x-signature': signature,
          'x-real-host': realHost,
          'x-user-ip': userIp,
        },
        body: JSON.stringify(finalPayload),
      });

      const responseText = await response.text();
      console.log('[LiveFlightSearch] Create response status:', response.status);

      if (!response.ok) {
        console.error('[LiveFlightSearch][V3] Create failed:', response.status, responseText.substring(0, 500));

        // Only show “Live results not active yet” for 401/403.
        if (response.status === 401 || response.status === 403) {
          return json({
            status: 'AUTH_ERROR',
            liveUnavailable: true,
            isComplete: true,
            flights: [],
            rawCount: 0,
            message: 'Live results not active yet (API authorization error).',
          });
        }

        return json({
          status: 'ERROR',
          error: 'Failed to create search',
          httpStatus: response.status,
          details: responseText.substring(0, 500),
        }, 500);
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('[LiveFlightSearch] Failed to parse response:', e);
        return json({ 
          status: 'ERROR', 
          error: 'Invalid response from search API' 
        }, 500);
      }

      const searchIdFromApi = data?.search_id || data?.searchId || data?.uuid;
      const resultsUrlFromApi = data?.results_url || data?.resultsUrl || null;

      if (!searchIdFromApi) {
        console.error('[LiveFlightSearch][V3] No search_id in response:', JSON.stringify(data).substring(0, 800));
        return json({
          status: 'ERROR',
          error: 'Missing search_id from API',
        }, 500);
      }

      console.log('[LiveFlightSearch][V3] search_id:', searchIdFromApi);
      if (resultsUrlFromApi) console.log('[LiveFlightSearch][V3] results_url:', resultsUrlFromApi);

      return json({
        status: 'SEARCH_CREATED',
        searchId: searchIdFromApi,
        resultsUrl: resultsUrlFromApi,
        message: 'Search initiated, poll for results',
      });
    }

    // ACTION: Poll for results
    if (action === 'poll') {
      if (!searchId) {
        return json({ 
          status: 'BAD_REQUEST', 
          error: 'searchId is required for polling' 
        }, 400);
      }

      const { origin = '', destination = '' } = searchParams;

      if (!liveResultsEnabled) {
        const mockFlights = generateMockFlights(String(origin || 'ZRH').toUpperCase(), String(destination || 'JFK').toUpperCase(), String(searchId), marker);
        return json({
          status: 'COMPLETE',
          searchId,
          flights: mockFlights,
          isComplete: true,
          rawCount: mockFlights.length,
          isMock: true,
          isDemo: true,
          message: 'Demo mode enabled (LIVE_RESULTS_ENABLED=false)',
        });
      }

      console.log('[LiveFlightSearch][V3] Polling:', searchId, 'route:', origin, '->', destination);

      // Preferred (as requested): GET /aviasales/v3/search/{search_id}
      let response: Response | null = null;
      let responseText = '';
      let usedUrl = `${AVIASALES_V3_BASE}/search/${encodeURIComponent(String(searchId))}`;

      response = await fetch(usedUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'x-affiliate-user-id': token,
          'x-real-host': realHost,
          'x-user-ip': userIp,
        },
      });

      responseText = await response.text();

      // If this endpoint isn't supported, fall back to results_url domain flow (still v3 search).
      if (!response.ok && (response.status === 404 || response.status === 405) && resultsUrl) {
        try {
          const resultsOrigin = new URL(String(resultsUrl)).origin;
          usedUrl = `${resultsOrigin}/search/affiliate/results`;

          const pollBody = {
            search_id: String(searchId),
            limit: 200,
            last_update_timestamp: Number(lastUpdateTimestamp || 0),
          };
          const pollSignature = generateV3Signature(token, marker, pollBody);

          console.log('[LiveFlightSearch][V3] Fallback poll URL:', usedUrl);

          response = await fetch(usedUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'x-affiliate-user-id': token,
              'x-signature': pollSignature,
              'x-real-host': realHost,
              'x-user-ip': userIp,
            },
            body: JSON.stringify({ signature: pollSignature, ...pollBody, marker }),
          });
          responseText = await response.text();
        } catch (e) {
          console.warn('[LiveFlightSearch][V3] Fallback poll failed to prepare:', e);
        }
      }

      console.log('[LiveFlightSearch][V3] Poll URL used:', usedUrl);

      if (!response || !response.ok) {
        const status = response?.status ?? 0;
        console.error('[LiveFlightSearch][V3] Poll failed:', status, responseText.substring(0, 500));

        if (status === 401 || status === 403) {
          return json({
            status: 'AUTH_ERROR',
            liveUnavailable: true,
            isComplete: true,
            flights: [],
            rawCount: 0,
            message: 'Live results not active yet (API authorization error).',
          });
        }

        return json({
          status: 'ERROR',
          error: 'Failed to fetch results',
          httpStatus: status,
        }, 500);
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('[LiveFlightSearch][V3] Failed to parse poll response');
        return json({ 
          status: 'ERROR', 
          error: 'Invalid poll response' 
        }, 500);
      }

      const isComplete = Boolean(
        data?.completed === true ||
          data?.is_over === true ||
          data?.isOver === true ||
          data?.is_complete === true ||
          data?.isComplete === true
      );

      const nextLastUpdateTimestamp =
        data?.last_update_timestamp ?? data?.lastUpdateTimestamp ?? null;

      const tickets: any[] = data?.tickets || data?.data?.tickets || [];
      const proposalsArr: any[] = data?.proposals || data?.data?.proposals || [];
      const airlinesMap: Record<string, any> = data?.airlines || data?.data?.airlines || {};
      const flightLegs: any[] = data?.flight_legs || data?.data?.flight_legs || [];

      console.log('[LiveFlightSearch][V3] completed:', isComplete);
      console.log('[LiveFlightSearch][V3] tickets:', tickets.length, 'proposals:', proposalsArr.length, 'legs:', flightLegs.length);

      const proposalsById = new Map<string, any>();
      for (const p of proposalsArr) {
        if (p?.id != null) proposalsById.set(String(p.id), p);
      }

      const legsById = new Map<string, any>();
      for (const l of flightLegs) {
        if (l?.id != null) legsById.set(String(l.id), l);
      }

      const resultsOrigin = (() => {
        try {
          if (resultsUrl) return new URL(String(resultsUrl)).origin;
        } catch {}
        try {
          if (data?.results_url) return new URL(String(data.results_url)).origin;
        } catch {}
        return null;
      })();

      async function resolveBookingUrl(proposalId: string): Promise<string | null> {
        if (!resultsOrigin) return null;
        const clickUrl = `${resultsOrigin}/searches/${encodeURIComponent(String(searchId))}/clicks/${encodeURIComponent(proposalId)}`;
        try {
          const r = await fetch(clickUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'x-affiliate-user-id': token,
              'x-real-host': realHost,
              'x-user-ip': userIp,
            },
          });
          const t = await r.text();
          if (!r.ok) {
            console.warn('[LiveFlightSearch][V3] click failed:', r.status, t.substring(0, 200));
            return null;
          }
          const parsed = JSON.parse(t);
          const url = parsed?.url || parsed?.booking_url || null;
          if (!url) return null;
          const lower = String(url).toLowerCase();
          if (lower.includes('aviasales.com/search') || lower.includes('mock=1')) return null;
          return String(url);
        } catch (e) {
          console.warn('[LiveFlightSearch][V3] click error:', e);
          return null;
        }
      }

      // Normalize results to UI-friendly shape.
      // NOTE: bookingUrl is resolved from the click endpoint when available.
      const normalized = tickets.map((ticket, idx) => {
        const ticketProposalsRaw =
          ticket?.proposals ||
          ticket?.proposal_ids ||
          ticket?.proposalIds ||
          ticket?.proposal_id ||
          [];

        let proposals: any[] = [];
        if (Array.isArray(ticketProposalsRaw)) {
          proposals = ticketProposalsRaw
            .map((x: any) => (typeof x === 'object' ? x : proposalsById.get(String(x))))
            .filter(Boolean);
        } else if (typeof ticketProposalsRaw === 'object') {
          proposals = [ticketProposalsRaw];
        } else if (ticketProposalsRaw != null) {
          const p = proposalsById.get(String(ticketProposalsRaw));
          if (p) proposals = [p];
        }

        const cheapest = proposals.reduce((best, p) => {
          const price = Number(p?.price ?? p?.price_per_person ?? p?.amount ?? 0);
          if (!best) return { p, price };
          return price > 0 && price < best.price ? { p, price } : best;
        }, null as null | { p: any; price: number });

        const proposal = cheapest?.p || null;
        const price = cheapest?.price || 0;
        const currency = String(proposal?.currency || data?.currency_code || 'USD').toUpperCase();
        const proposalId = proposal?.id != null ? String(proposal.id) : null;

        // segments / legs
        const segs = ticket?.segments || ticket?.segment || ticket?.flight_legs || ticket?.legs || [];
        let legs: any[] = [];
        if (Array.isArray(segs)) {
          // Could be leg objects or leg ids
          legs = segs
            .map((x: any) => (typeof x === 'object' ? x : legsById.get(String(x))))
            .filter(Boolean);
        }

        const firstLeg = legs[0] || {};
        const lastLeg = legs[legs.length - 1] || firstLeg;

        const carrier =
          proposal?.carrier ||
          firstLeg?.carrier ||
          firstLeg?.marketing_carrier ||
          firstLeg?.operating_carrier ||
          'XX';
        const airlineName =
          AIRLINE_NAMES[String(carrier)] || airlinesMap[String(carrier)]?.name || String(carrier);

        const depCode = String(firstLeg?.origin || firstLeg?.departure || origin || '').toUpperCase();
        const arrCode = String(lastLeg?.destination || lastLeg?.arrival || destination || '').toUpperCase();

        // Times can be ISO strings or timestamps
        const depAt = firstLeg?.departure_at || firstLeg?.departureAt || firstLeg?.departure_time || null;
        const arrAt = lastLeg?.arrival_at || lastLeg?.arrivalAt || lastLeg?.arrival_time || null;
        const depTs = firstLeg?.departure_timestamp || firstLeg?.departureTimestamp || null;
        const arrTs = lastLeg?.arrival_timestamp || lastLeg?.arrivalTimestamp || null;

        const depDate = depAt
          ? new Date(depAt)
          : depTs
            ? new Date(Number(depTs) * 1000)
            : null;
        const arrDate = arrAt
          ? new Date(arrAt)
          : arrTs
            ? new Date(Number(arrTs) * 1000)
            : null;

        const departureTime = depDate
          ? `${String(depDate.getUTCHours()).padStart(2, '0')}:${String(depDate.getUTCMinutes()).padStart(2, '0')}`
          : '00:00';
        const arrivalTime = arrDate
          ? `${String(arrDate.getUTCHours()).padStart(2, '0')}:${String(arrDate.getUTCMinutes()).padStart(2, '0')}`
          : '00:00';

        const durationMinutes =
          Number(proposal?.duration ?? ticket?.duration ?? firstLeg?.duration ?? 0) ||
          (depDate && arrDate ? Math.max(0, Math.round((arrDate.getTime() - depDate.getTime()) / 60000)) : 0);

        const stops = Math.max(0, legs.length - 1);

        return {
          id: `v3-${String(searchId)}-${proposalId ?? idx}`,
          airline: airlineName,
          airlineLogo: getAirlineLogo(String(carrier)),
          flightNumber: String(proposal?.number || proposal?.flight_number || carrier),
          departureTime,
          arrivalTime,
          departureCode: depCode,
          arrivalCode: arrCode,
          duration: formatDuration(durationMinutes),
          durationMinutes,
          stops,
          price: Math.round(price),
          currency,
          proposalId,
          segments: legs,
        };
      });

      // Resolve booking URLs for first N tickets (enough for UI without heavy fanout)
      const MAX_BOOKING_URLS = 30;
      const withBooking = await Promise.all(
        normalized.slice(0, MAX_BOOKING_URLS).map(async (f) => {
          if (!f.proposalId) return { ...f, bookingUrl: null, deepLink: '' };
          const bookingUrl = await resolveBookingUrl(f.proposalId);
          return { ...f, bookingUrl, deepLink: bookingUrl || '' };
        })
      );
      const rest = normalized.slice(MAX_BOOKING_URLS).map((f) => ({ ...f, bookingUrl: null, deepLink: '' }));
      const flights = [...withBooking, ...rest]
        .filter((f) => f.price > 0)
        // Strictly avoid rendering anything without a valid final provider URL
        .filter((f) => !!f.bookingUrl);

      console.log('[LiveFlightSearch][V3] normalized flights (with bookingUrl):', flights.length);
      if (flights[0]?.bookingUrl) {
        console.log('[LiveFlightSearch][V3] sample bookingUrl:', String(flights[0].bookingUrl).substring(0, 200));
      }

      return json({
        status: isComplete ? 'COMPLETE' : 'POLLING',
        searchId,
        resultsUrl: resultsUrl ?? data?.results_url ?? null,
        lastUpdateTimestamp: nextLastUpdateTimestamp,
        flights,
        isComplete,
        rawCount: flights.length,
        liveUnavailable: false,
      });
    }

    return json({ 
      status: 'BAD_REQUEST', 
      error: 'Invalid action. Use "create" or "poll"' 
    }, 400);

  } catch (error) {
    console.error('[LiveFlightSearch] Error:', error);
    return json({ 
      status: 'ERROR', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, 500);
  }
});
