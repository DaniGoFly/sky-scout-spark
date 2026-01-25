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

/**
 * Generate MD5 signature for Travelpayouts API
 * The signature is MD5 of: token + ":" + sorted parameter values
 * Uses a simple MD5 implementation since Web Crypto doesn't support MD5
 */
function md5(str: string): string {
  // Simple MD5 implementation for Deno
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
      else return result ^ 0x40000000 ^ x8 ^ y8;
    } else {
      return result ^ x8 ^ y8;
    }
  }
  
  function F(x: number, y: number, z: number): number { return (x & y) | (~x & z); }
  function G(x: number, y: number, z: number): number { return (x & z) | (y & ~z); }
  function H(x: number, y: number, z: number): number { return x ^ y ^ z; }
  function I(x: number, y: number, z: number): number { return y ^ (x | ~z); }
  
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
  
  function convertToWordArray(str: string): number[] {
    const lWordCount = (((str.length + 8) - ((str.length + 8) % 64)) / 64 + 1) * 16;
    const lWordArray: number[] = Array(lWordCount - 1).fill(0);
    let lByteCount = 0, lBytePosition = 0;
    while (lByteCount < str.length) {
      const lWordPosition = (lByteCount - (lByteCount % 4)) / 4;
      lBytePosition = (lByteCount % 4) * 8;
      lWordArray[lWordPosition] = lWordArray[lWordPosition] | (str.charCodeAt(lByteCount) << lBytePosition);
      lByteCount++;
    }
    const lWordPosition = (lByteCount - (lByteCount % 4)) / 4;
    lBytePosition = (lByteCount % 4) * 8;
    lWordArray[lWordPosition] = lWordArray[lWordPosition] | (0x80 << lBytePosition);
    lWordArray[lWordCount - 2] = str.length << 3;
    lWordArray[lWordCount - 1] = str.length >>> 29;
    return lWordArray;
  }
  
  function wordToHex(lValue: number): string {
    let wordToHexValue = "", wordToHexValueTemp = "", lByte, lCount;
    for (lCount = 0; lCount <= 3; lCount++) {
      lByte = (lValue >>> (lCount * 8)) & 255;
      wordToHexValueTemp = "0" + lByte.toString(16);
      wordToHexValue = wordToHexValue + wordToHexValueTemp.substr(wordToHexValueTemp.length - 2, 2);
    }
    return wordToHexValue;
  }
  
  const x = convertToWordArray(str);
  let a = 0x67452301, b = 0xefcdab89, c = 0x98badcfe, d = 0x10325476;
  
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

function generateSignature(token: string, params: Record<string, unknown>): string {
  // Extract all values recursively, already sorted by key paths
  const values = extractValues(params);
  
  // Build signature: token:val1:val2:val3...
  const signatureData = token + ':' + values.join(':');
  
  console.log('[Signature] Input (first 200 chars):', signatureData.substring(0, 200));
  
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

// Mock booking providers with realistic URLs
const MOCK_PROVIDERS = [
  { name: 'Turna', urlBase: 'https://www.turna.com/en/flight/booking' },
  { name: 'Kiwi', urlBase: 'https://www.kiwi.com/en/booking' },
  { name: 'Trip.com', urlBase: 'https://www.trip.com/flights/booking' },
  { name: 'Expedia', urlBase: 'https://www.expedia.com/Flight-Checkout' },
  { name: 'CheapOair', urlBase: 'https://www.cheapoair.com/flight/checkout' },
  { name: 'Priceline', urlBase: 'https://www.priceline.com/checkout/flights' },
];

/**
 * Generate realistic mock flight data for any route
 * Used as fallback when API returns no results (e.g., before API approval)
 */
function generateMockFlights(origin: string, destination: string, searchId: string, marker: string): any[] {
  // Airlines with their typical base prices
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
  
  // Generate departure times spread throughout the day
  const departureTimes = ['06:15', '08:30', '10:45', '12:20', '14:55', '16:30', '18:15', '20:40', '22:05'];
  
  // Calculate route-specific variations
  const routeHash = (origin.charCodeAt(0) + destination.charCodeAt(0)) % 100;
  
  const flights = [];
  const numFlights = 8 + (routeHash % 5); // Generate 8-12 flights
  
  for (let i = 0; i < numFlights; i++) {
    const airline = mockAirlines[i % mockAirlines.length];
    const depTime = departureTimes[i % departureTimes.length];
    
    // Random-ish duration between 9-14 hours for long-haul
    const baseDuration = 540 + (routeHash + i * 37) % 300;
    const stops = i < 3 ? 0 : (i < 6 ? 1 : 2);
    const stopDuration = stops * 90; // 90 min per stop
    const totalDuration = baseDuration + stopDuration;
    
    // Calculate arrival time
    const [depHour, depMin] = depTime.split(':').map(Number);
    const arrMinutes = (depHour * 60 + depMin + totalDuration) % 1440;
    const arrHour = Math.floor(arrMinutes / 60);
    const arrMin = arrMinutes % 60;
    const arrivalTime = `${String(arrHour).padStart(2, '0')}:${String(arrMin).padStart(2, '0')}`;
    
    // Price variation based on stops and time
    const priceModifier = stops === 0 ? 1.3 : stops === 1 ? 1.0 : 0.8;
    const timeModifier = depHour < 8 || depHour > 20 ? 0.9 : 1.0;
    const price = Math.round(airline.basePrice * priceModifier * timeModifier + (routeHash * 3));
    
    // Pick a realistic provider for this flight
    const provider = MOCK_PROVIDERS[i % MOCK_PROVIDERS.length];
    
    // Create realistic booking URL pointing to actual OTA/provider (not Aviasales search)
    // Format: provider booking page with flight details as query params
    const bookingId = `${searchId.substring(0, 8)}-${i}`;
    const mockDeepLink = `${provider.urlBase}?ref=${bookingId}&origin=${origin}&dest=${destination}&carrier=${airline.code}&marker=${marker}`;
    
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
      deepLink: mockDeepLink,
      gateId: 'mock',
      isLive: false,
      isMock: true
    });
  }
  
  // Sort by price
  flights.sort((a, b) => a.price - b.price);
  
  console.log('[LiveFlightSearch] Generated', flights.length, 'mock flights for', origin, '->', destination);
  
  return flights;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { action, searchId, ...searchParams } = body;

    const token = Deno.env.get('TRAVELPAYOUTS_API_TOKEN') || '';
    const marker = Deno.env.get('TRAVELPAYOUTS_MARKER') || '';
    
    // Feature flag: enable/disable mock data fallback
    // When LIVE_RESULTS_ENABLED is "true", we only return real API data
    // When API returns no results and LIVE_RESULTS_ENABLED is true, we return empty + liveUnavailable flag
    const liveResultsEnabled = Deno.env.get('LIVE_RESULTS_ENABLED') !== 'false'; // Default to true

    if (!token || !marker) {
      return json({ 
        status: 'MISCONFIGURED', 
        error: 'Missing API credentials' 
      }, 500);
    }

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
        currency = 'USD',
        userIp = '127.0.0.1'
      } = searchParams;

      if (!origin || !destination || !departDate) {
        return json({ 
          status: 'BAD_REQUEST', 
          error: 'origin, destination, and departDate are required' 
        }, 400);
      }

      // Build segments
      const segments: Array<{ origin: string; destination: string; date: string }> = [
        { origin: origin.toUpperCase(), destination: destination.toUpperCase(), date: departDate }
      ];

      // Add return segment for roundtrip
      if (returnDate) {
        segments.push({
          origin: destination.toUpperCase(),
          destination: origin.toUpperCase(),
          date: returnDate
        });
      }

      // Build request payload
      const requestPayload = {
        marker,
        host: 'www.goflyfinder.com',
        user_ip: userIp,
        locale: 'en',
        trip_class: tripClass,
        passengers: {
          adults: Number(adults),
          children: Number(children),
          infants: Number(infants)
        },
        segments,
        currency: currency.toUpperCase()
      };

      // Generate signature
      const signature = generateSignature(token, requestPayload);
      const finalPayload = { signature, ...requestPayload };

      console.log('[LiveFlightSearch] Creating search:', { origin, destination, departDate, returnDate });

      // Call Travelpayouts Flight Search API to create search
      const response = await fetch('https://api.travelpayouts.com/v1/flight_search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate'
        },
        body: JSON.stringify(finalPayload)
      });

      const responseText = await response.text();
      console.log('[LiveFlightSearch] Create response status:', response.status);

      if (!response.ok) {
        console.error('[LiveFlightSearch] Create failed:', responseText);
        return json({ 
          status: 'ERROR', 
          error: 'Failed to create search',
          details: responseText.substring(0, 500)
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

      // Return search_id for polling
      const searchIdFromApi = data.search_id || data.uuid;
      if (!searchIdFromApi) {
        console.error('[LiveFlightSearch] No search_id in response:', data);
        return json({ 
          status: 'ERROR', 
          error: 'No search ID received',
          details: JSON.stringify(data).substring(0, 500)
        }, 500);
      }

      console.log('[LiveFlightSearch] Search created:', searchIdFromApi);
      return json({
        status: 'SEARCH_CREATED',
        searchId: searchIdFromApi,
        message: 'Search initiated, poll for results'
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

      // Extract origin/destination for mock data fallback
      const { origin = '', destination = '' } = searchParams;

      console.log('[LiveFlightSearch] Polling results for:', searchId, 'route:', origin, '->', destination);

      const response = await fetch(
        `https://api.travelpayouts.com/v1/flight_search_results?uuid=${searchId}`,
        {
          headers: {
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip, deflate'
          }
        }
      );

      const responseText = await response.text();

      if (!response.ok) {
        console.error('[LiveFlightSearch] Poll failed:', response.status);
        return json({ 
          status: 'ERROR', 
          error: 'Failed to fetch results' 
        }, 500);
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('[LiveFlightSearch] Failed to parse poll response');
        return json({ 
          status: 'ERROR', 
          error: 'Invalid poll response' 
        }, 500);
      }

      // Check if search is complete
      // When complete, we get an object with only search_id (or empty proposals for a long time)
      const isComplete = data && typeof data === 'object' && 
        Object.keys(data).length === 1 && 
        (data.search_id || data.uuid);

      if (isComplete) {
        console.log('[LiveFlightSearch] Search complete, no more results');
        return json({
          status: 'COMPLETE',
          searchId,
          flights: [],
          isComplete: true
        });
      }

      // Travelpayouts response structure: { proposals: [], airports: {}, airlines: {}, ... }
      const proposals = data?.proposals || [];
      const airlines = data?.airlines || {};
      const airports = data?.airports || {};
      const gates = data?.gates_info || {};
      
      console.log('[LiveFlightSearch] Response contains:', proposals.length, 'proposals,', Object.keys(airlines).length, 'airlines');
      
      // If no real results from API
      if (proposals.length === 0) {
        console.log('[LiveFlightSearch] No proposals from API for:', origin, '->', destination);
        
        // If live results are enabled, don't return mock data - indicate live is unavailable
        if (liveResultsEnabled) {
          console.log('[LiveFlightSearch] Live results enabled but no API data - returning liveUnavailable flag');
          return json({
            status: 'COMPLETE',
            searchId,
            flights: [],
            isComplete: true,
            rawCount: 0,
            liveUnavailable: true,
            message: 'Live flight results are not available yet. API approval may be pending.'
          });
        }
        
        // Only return mock data when LIVE_RESULTS_ENABLED is explicitly set to 'false'
        console.log('[LiveFlightSearch] LIVE_RESULTS_ENABLED=false, returning demo data for:', origin, '->', destination);
        
        // Use origin/destination from poll params or fallback
        const originCode = origin || 'ZRH';
        const destCode = destination || 'JFK';
        
        const mockFlights = generateMockFlights(originCode.toUpperCase(), destCode.toUpperCase(), searchId, marker);
        
        return json({
          status: 'POLLING',
          searchId,
          flights: mockFlights,
          isComplete: true, // Mark as complete so we don't keep polling
          rawCount: mockFlights.length,
          isMock: true,
          isDemo: true
        });
      }
      
      // Log first proposal for debugging
      if (proposals.length > 0) {
        console.log('[LiveFlightSearch] Sample proposal:', JSON.stringify(proposals[0]).substring(0, 800));
      }
      
      const flights = proposals.flatMap((proposal: any, index: number) => {
        try {
          // Terms contain pricing from different agencies/gates
          const terms = proposal.terms || {};
          const termKeys = Object.keys(terms);
          if (termKeys.length === 0) return [];
          
          // Get the first (often cheapest) term
          const term = terms[termKeys[0]];
          const price = term?.unified_price || term?.price || 0;
          const currency = term?.currency || 'USD';
          const gateId = termKeys[0];
          
          // Booking URL from the term
          const bookingUrl = term?.url || '';
          
          // Segments contain flight details
          const segments = proposal.segment || proposal.segments || [];
          const firstSegment = segments[0] || {};
          
          // Get flights within the segment
          const segmentFlights = firstSegment.flight || [];
          const firstFlight = Array.isArray(segmentFlights) ? segmentFlights[0] : segmentFlights;
          
          // Extract carrier code
          const carrierCode = proposal.carriers?.[0] || 
            firstFlight?.operating_carrier || 
            firstFlight?.marketing_carrier || 
            proposal.validating_carrier || 
            'XX';
          const airlineName = AIRLINE_NAMES[carrierCode] || carrierCode;
          
          // Get origin/destination from segment
          const origin = firstSegment.origin || firstFlight?.origin || '';
          const destination = firstSegment.destination || firstFlight?.destination || '';
          
          // Get times - parse from timestamps or time strings
          let departureTime = '00:00';
          let arrivalTime = '00:00';
          let durationMinutes = 0;
          
          if (firstSegment.departure_timestamp && firstSegment.arrival_timestamp) {
            const depDate = new Date(firstSegment.departure_timestamp * 1000);
            const arrDate = new Date(firstSegment.arrival_timestamp * 1000);
            departureTime = `${String(depDate.getUTCHours()).padStart(2, '0')}:${String(depDate.getUTCMinutes()).padStart(2, '0')}`;
            arrivalTime = `${String(arrDate.getUTCHours()).padStart(2, '0')}:${String(arrDate.getUTCMinutes()).padStart(2, '0')}`;
            durationMinutes = Math.round((firstSegment.arrival_timestamp - firstSegment.departure_timestamp) / 60);
          } else if (firstFlight?.departure && firstFlight?.arrival) {
            departureTime = firstFlight.departure.time || firstFlight.departure || '00:00';
            arrivalTime = firstFlight.arrival.time || firstFlight.arrival || '00:00';
            durationMinutes = firstFlight.duration || 0;
          } else if (firstSegment.duration) {
            durationMinutes = firstSegment.duration;
          }
          
          // Count stops (number of flights minus 1, or transfers)
          const flightCount = Array.isArray(segmentFlights) ? segmentFlights.length : 1;
          const stops = Math.max(0, flightCount - 1);
          
          // Build affiliate booking URL with marker
          const affiliateUrl = bookingUrl 
            ? (bookingUrl.includes('?') 
                ? `${bookingUrl}&marker=${marker}`
                : `${bookingUrl}?marker=${marker}`)
            : '';

          return [{
            id: `${searchId}-${index}-${gateId}`,
            airline: airlineName,
            airlineLogo: getAirlineLogo(carrierCode),
            flightNumber: firstFlight?.number || carrierCode,
            departureTime,
            arrivalTime,
            departureCode: origin,
            arrivalCode: destination,
            duration: formatDuration(durationMinutes),
            durationMinutes,
            stops,
            price: Math.round(price),
            currency,
            deepLink: affiliateUrl,
            gateId,
            isLive: true
          }];
        } catch (e) {
          console.warn('[LiveFlightSearch] Failed to parse proposal:', e);
          return [];
        }
      });

      console.log('[LiveFlightSearch] Parsed flights:', flights.length);

      return json({
        status: 'POLLING',
        searchId,
        flights,
        isComplete: false,
        rawCount: proposals.length
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
