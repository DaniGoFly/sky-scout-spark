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
  'PC': 'Pegasus Airlines', 'XQ': 'SunExpress', 'FI': 'Icelandair',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Tickets API endpoints
const TICKETS_API_START = 'https://tickets-api.travelpayouts.com/search/affiliate/start';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { action } = body;

    const token = Deno.env.get('TRAVELPAYOUTS_API_TOKEN') || '';
    const marker = Deno.env.get('TRAVELPAYOUTS_MARKER') || '694224';

    if (!token) {
      console.error('[FlightSearch] Missing TRAVELPAYOUTS_API_TOKEN');
      return json({ ok: false, error: 'Missing API credentials' }, 500);
    }

    const userIp =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('cf-connecting-ip') ||
      req.headers.get('x-real-ip') ||
      body.user_ip ||
      '127.0.0.1';

    const realHost = 'goflyfinder.com';

    // ===== ACTION: START SEARCH =====
    if (action === 'start') {
      const {
        origin,
        destination,
        depart_date,
        return_date,
        adults = 1,
        children = 0,
        infants = 0,
        trip_class = 'Y',
        locale = 'en',
        market_code = 'US',
        currency_code = 'EUR',
      } = body;

      if (!origin || !destination || !depart_date) {
        return json({ ok: false, error: 'origin, destination, and depart_date are required' }, 400);
      }

      // Build segments (directions)
      const segments: Array<{ origin: string; destination: string; date: string }> = [
        { origin: String(origin).toUpperCase(), destination: String(destination).toUpperCase(), date: depart_date },
      ];

      if (return_date) {
        segments.push({
          origin: String(destination).toUpperCase(),
          destination: String(origin).toUpperCase(),
          date: return_date,
        });
      }

      const requestPayload = {
        marker,
        locale: String(locale).toLowerCase(),
        currency_code: String(currency_code).toUpperCase(),
        market_code: String(market_code).toUpperCase(),
        host: realHost,
        user_ip: userIp,
        trip_class: String(trip_class).toUpperCase(),
        passengers: {
          adults: Number(adults),
          children: Number(children),
          infants: Number(infants),
        },
        segments,
      };

      console.log('[FlightSearch] START payload:', JSON.stringify(requestPayload));

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
      console.log('[FlightSearch] START response status:', response.status);
      console.log('[FlightSearch] START response:', responseText.substring(0, 500));

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          return json({
            ok: false,
            liveUnavailable: true,
            error: 'Live results not active yet (API authorization pending)',
          });
        }
        return json({
          ok: false,
          error: 'Failed to start search',
          details: responseText.substring(0, 300),
        }, 500);
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        return json({ ok: false, error: 'Invalid response from search API' }, 500);
      }

      const search_id = data?.search_id || data?.searchId || data?.uuid;
      const results_url = data?.results_url || data?.resultsUrl || null;

      if (!search_id) {
        console.error('[FlightSearch] No search_id in response:', JSON.stringify(data).substring(0, 500));
        return json({ ok: false, error: 'Missing search_id from API' }, 500);
      }

      console.log('[FlightSearch] search_id:', search_id, 'results_url:', results_url);

      return json({
        ok: true,
        step: 'start',
        search_id,
        results_url,
        results_base: results_url ? `https://${results_url}` : null,
        last_update_timestamp: 0,
      });
    }

    // ===== ACTION: POLL RESULTS =====
    if (action === 'results') {
      const { search_id, results_url, last_update_timestamp = 0 } = body;

      if (!search_id) {
        return json({ ok: false, error: 'search_id is required' }, 400);
      }

      // Build poll URL - the results_url from start response is the regional host
      let baseUrl = 'https://tickets-api.travelpayouts.com';
      if (results_url) {
        // Handle both full URL and host-only formats
        if (results_url.startsWith('http')) {
          baseUrl = results_url.replace(/\/$/, '');
        } else {
          baseUrl = `https://${results_url}`;
        }
      }

      let pollUrl = `${baseUrl}/search/affiliate/results?search_id=${encodeURIComponent(String(search_id))}`;

      // Add timestamp for incremental updates
      if (last_update_timestamp && last_update_timestamp > 0) {
        pollUrl += `&last_update_timestamp=${last_update_timestamp}`;
      }

      console.log('[FlightSearch] RESULTS URL:', pollUrl);

      const response = await fetch(pollUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const responseText = await response.text();
      console.log('[FlightSearch] RESULTS status:', response.status, 'length:', responseText.length);

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          return json({
            ok: false,
            liveUnavailable: true,
            is_over: true,
            error: 'Live results not active yet',
          });
        }
        return json({
          ok: false,
          error: 'Failed to fetch results',
          httpStatus: response.status,
        }, 500);
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        return json({ ok: false, error: 'Invalid poll response' }, 500);
      }

      const is_over = Boolean(
        data?.completed === true ||
        data?.is_over === true ||
        data?.isOver === true ||
        data?.is_complete === true
      );

      const newTimestamp = data?.last_update_timestamp ?? data?.lastUpdateTimestamp ?? last_update_timestamp;

      // CRITICAL: Pass through ALL data from Travelpayouts including flight_info, flights, airports, airlines
      // These contain the actual timestamps and airport details needed for display
      const tickets = data?.tickets || [];
      const flight_info = data?.flight_info || data?.flightInfo || {};
      const flights = data?.flights || [];
      const airports = data?.airports || {};
      const airlines = data?.airlines || {};
      const segments = data?.segments || [];

      console.log('[FlightSearch] is_over:', is_over, 
        'tickets:', tickets.length, 
        'flight_info keys:', Object.keys(flight_info).length,
        'flights:', flights.length);

      // Return the raw data - let frontend handle normalization
      return json({
        ok: true,
        step: 'results',
        is_over,
        last_update_timestamp: newTimestamp,
        // Raw ticket data
        tickets,
        // IMPORTANT: Include all lookup collections for the frontend to resolve flight details
        flight_info,
        flights,
        airports,
        airlines,
        segments,
        // Also include any other useful fields
        currency_code: data?.currency_code || data?.currency,
      });
    }

    // ===== ACTION: CLICK (resolve booking URL) =====
    if (action === 'click') {
      const { search_id, proposal_id, signature, results_url } = body;

      if (!search_id || !proposal_id) {
        return json({ ok: false, error: 'search_id and proposal_id are required' }, 400);
      }

      // Build click URL
      let baseUrl = 'https://tickets-api.travelpayouts.com';
      if (results_url) {
        if (results_url.startsWith('http')) {
          baseUrl = results_url.replace(/\/$/, '');
        } else {
          baseUrl = `https://${results_url}`;
        }
      }

      const clickUrl = `${baseUrl}/searches/${encodeURIComponent(String(search_id))}/clicks/${encodeURIComponent(String(proposal_id))}`;
      console.log('[FlightSearch] CLICK URL:', clickUrl);

      try {
        const clickResp = await fetch(clickUrl, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ signature: signature || '' }),
        });

        const clickText = await clickResp.text();
        console.log('[FlightSearch] CLICK response status:', clickResp.status);

        if (!clickResp.ok) {
          console.error('[FlightSearch] CLICK failed:', clickText.substring(0, 300));
          return json({
            ok: false,
            step: 'click',
            error: 'Failed to resolve booking URL',
            httpStatus: clickResp.status,
          });
        }

        let clickData;
        try {
          clickData = JSON.parse(clickText);
        } catch {
          return json({ ok: false, step: 'click', error: 'Invalid click response' });
        }

        const bookingUrl = clickData?.url || clickData?.booking_url || clickData?.redirect_url || null;

        if (!bookingUrl) {
          console.warn('[FlightSearch] No URL in click response');
          return json({ ok: false, step: 'click', error: 'No booking URL returned' });
        }

        // Validate URL - block aviasales search/mock links
        const lower = String(bookingUrl).toLowerCase();
        if (
          lower.includes('aviasales.com/search') ||
          lower.includes('aviasales.com/results') ||
          lower.includes('mock=1')
        ) {
          console.warn('[FlightSearch] Blocked invalid booking URL:', bookingUrl.substring(0, 100));
          return json({ ok: false, step: 'click', error: 'Provider link unavailable' });
        }

        console.log('[FlightSearch] Returning booking URL:', bookingUrl.substring(0, 100));
        return json({
          ok: true,
          step: 'click',
          url: bookingUrl,
        });
      } catch (err) {
        console.error('[FlightSearch] CLICK error:', err);
        return json({ ok: false, step: 'click', error: 'Click request failed' });
      }
    }

    return json({ ok: false, error: 'Invalid action. Use "start", "results", or "click".' }, 400);

  } catch (err) {
    console.error('[FlightSearch] Error:', err);
    return json({ ok: false, error: String(err) }, 500);
  }
});