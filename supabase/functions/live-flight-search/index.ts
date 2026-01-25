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

// Tickets API endpoints
const TICKETS_API_START = 'https://tickets-api.travelpayouts.com/search/affiliate/start';

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

    if (!token || !marker) {
      console.error('[LiveFlightSearch] Missing credentials - token:', !!token, 'marker:', !!marker);
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

      // Tickets API request payload
      const requestPayload = {
        marker,
        locale: 'en',
        currency_code: String(currency).toUpperCase(),
        market_code: 'us',
        host: realHost,
        user_ip: userIp,
        trip_class: String(tripClass).toUpperCase(),
        passengers: {
          adults: Number(adults),
          children: Number(children),
          infants: Number(infants),
        },
        segments: directions.map(d => ({
          origin: d.origin,
          destination: d.destination,
          date: d.date,
        })),
      };

      console.log('[LiveFlightSearch] Start URL:', TICKETS_API_START);
      console.log('[LiveFlightSearch] Payload:', JSON.stringify(requestPayload));
      console.log('[LiveFlightSearch] Using Bearer token auth');

      const response = await fetch(TICKETS_API_START, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestPayload),
      });

      const responseText = await response.text();
      console.log('[LiveFlightSearch] Create response status:', response.status);
      console.log('[LiveFlightSearch] Create response (first 500 chars):', responseText.substring(0, 500));

      if (!response.ok) {
        console.error('[LiveFlightSearch] Create failed:', response.status, responseText.substring(0, 500));

        // Only show "Live results not active yet" for 401/403.
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
        console.error('[LiveFlightSearch] No search_id in response:', JSON.stringify(data).substring(0, 800));
        return json({
          status: 'ERROR',
          error: 'Missing search_id from API',
          details: JSON.stringify(data).substring(0, 500),
        }, 500);
      }

      console.log('[LiveFlightSearch] search_id:', searchIdFromApi);
      console.log('[LiveFlightSearch] results_url:', resultsUrlFromApi);

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

      console.log('[LiveFlightSearch] Polling:', searchId, 'route:', origin, '->', destination);

      // Use the results_url provided by the start response
      let pollUrl = resultsUrl;
      if (!pollUrl) {
        // Fallback to default results endpoint
        pollUrl = `https://tickets-api.travelpayouts.com/search/affiliate/results?search_id=${encodeURIComponent(String(searchId))}`;
      }

      // Add timestamp parameter if we have one (for incremental updates)
      if (lastUpdateTimestamp) {
        const separator = pollUrl.includes('?') ? '&' : '?';
        pollUrl = `${pollUrl}${separator}last_update_timestamp=${lastUpdateTimestamp}`;
      }

      console.log('[LiveFlightSearch] Poll URL:', pollUrl);

      const response = await fetch(pollUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const responseText = await response.text();
      console.log('[LiveFlightSearch] Poll response status:', response.status);

      if (!response.ok) {
        console.error('[LiveFlightSearch] Poll failed:', response.status, responseText.substring(0, 500));

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
          error: 'Failed to fetch results',
          httpStatus: response.status,
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

      const isComplete = Boolean(
        data?.completed === true ||
        data?.is_over === true ||
        data?.isOver === true ||
        data?.is_complete === true ||
        data?.isComplete === true
      );

      const nextLastUpdateTimestamp =
        data?.last_update_timestamp ?? data?.lastUpdateTimestamp ?? null;

      // Extract tickets/proposals from various possible response shapes
      const tickets: any[] = data?.tickets || data?.data?.tickets || [];
      const proposalsArr: any[] = data?.proposals || data?.data?.proposals || [];
      const airlinesMap: Record<string, any> = data?.airlines || data?.data?.airlines || {};
      const flightLegs: any[] = data?.flight_legs || data?.data?.flight_legs || [];
      const gatesMap: Record<string, any> = data?.gates || data?.data?.gates || {};

      console.log('[LiveFlightSearch] completed:', isComplete);
      console.log('[LiveFlightSearch] tickets:', tickets.length, 'proposals:', proposalsArr.length, 'legs:', flightLegs.length);

      // Build lookup maps
      const proposalsById = new Map<string, any>();
      for (const p of proposalsArr) {
        if (p?.id != null) proposalsById.set(String(p.id), p);
      }

      const legsById = new Map<string, any>();
      for (const l of flightLegs) {
        if (l?.id != null) legsById.set(String(l.id), l);
      }

      // Determine the base URL for click endpoint
      let clickBaseUrl = 'https://tickets-api.travelpayouts.com';
      try {
        if (resultsUrl) {
          clickBaseUrl = new URL(String(resultsUrl)).origin;
        }
      } catch {}

      /**
       * Resolve booking URL via click endpoint
       * POST /searches/{search_id}/clicks/{proposal_id}
       */
      async function resolveBookingUrl(proposalId: string): Promise<string | null> {
        const clickUrl = `${clickBaseUrl}/searches/${encodeURIComponent(String(searchId))}/clicks/${encodeURIComponent(proposalId)}`;
        try {
          console.log('[LiveFlightSearch] Click URL:', clickUrl);
          const r = await fetch(clickUrl, {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({}),
          });
          const t = await r.text();
          console.log('[LiveFlightSearch] Click response:', r.status, t.substring(0, 200));
          
          if (!r.ok) {
            console.warn('[LiveFlightSearch] Click failed:', r.status, t.substring(0, 200));
            return null;
          }
          
          const parsed = JSON.parse(t);
          const url = parsed?.url || parsed?.booking_url || parsed?.redirect_url || null;
          
          if (!url) {
            console.warn('[LiveFlightSearch] No URL in click response');
            return null;
          }
          
          const lower = String(url).toLowerCase();
          // NEVER allow aviasales search pages or mock URLs
          if (lower.includes('aviasales.com/search') || lower.includes('mock=1')) {
            console.warn('[LiveFlightSearch] Blocked aviasales/mock URL:', url.substring(0, 100));
            return null;
          }
          
          return String(url);
        } catch (e) {
          console.warn('[LiveFlightSearch] Click error:', e);
          return null;
        }
      }

      // Normalize results to UI-friendly shape
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

        // Find cheapest proposal
        const cheapest = proposals.reduce((best, p) => {
          const price = Number(p?.price ?? p?.price_per_person ?? p?.amount ?? 0);
          if (!best) return { p, price };
          return price > 0 && price < best.price ? { p, price } : best;
        }, null as null | { p: any; price: number });

        const proposal = cheapest?.p || null;
        const price = cheapest?.price || 0;
        const currency = String(proposal?.currency || data?.currency_code || 'USD').toUpperCase();
        const proposalId = proposal?.id != null ? String(proposal.id) : null;
        const gateId = proposal?.gate_id != null ? String(proposal.gate_id) : null;

        // Extract segments / legs
        const segs = ticket?.segments || ticket?.segment || ticket?.flight_legs || ticket?.legs || [];
        let legs: any[] = [];
        if (Array.isArray(segs)) {
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
          id: `live-${String(searchId)}-${proposalId ?? idx}`,
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
          gateId,
          segments: legs,
          isLive: true,
        };
      });

      // Resolve booking URLs for first N tickets (to avoid too many API calls)
      const MAX_BOOKING_URLS = 30;
      const withBooking = await Promise.all(
        normalized.slice(0, MAX_BOOKING_URLS).map(async (f) => {
          if (!f.proposalId) return { ...f, bookingUrl: null, deepLink: '' };
          const bookingUrl = await resolveBookingUrl(f.proposalId);
          return { ...f, bookingUrl, deepLink: bookingUrl || '' };
        })
      );
      
      const rest = normalized.slice(MAX_BOOKING_URLS).map((f) => ({ ...f, bookingUrl: null, deepLink: '' }));
      
      // Filter to only flights with valid price AND valid booking URL
      const flights = [...withBooking, ...rest]
        .filter((f) => f.price > 0)
        .filter((f) => !!f.bookingUrl);

      console.log('[LiveFlightSearch] Final flights count (with valid bookingUrl):', flights.length);
      if (flights[0]?.bookingUrl) {
        console.log('[LiveFlightSearch] Sample bookingUrl:', String(flights[0].bookingUrl).substring(0, 200));
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
