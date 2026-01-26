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

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}

function getAirlineLogo(iataCode: string): string {
  return `https://pics.avs.io/100/100/${iataCode}.png`;
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
    const marker = '694224'; // Fixed marker for goflyfinder.com

    if (!token) {
      console.error('[FlightSearch] Missing TRAVELPAYOUTS_API_TOKEN');
      return json({ ok: false, error: 'Missing API credentials' }, 500);
    }

    const userIp =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('cf-connecting-ip') ||
      req.headers.get('x-real-ip') ||
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
        currency_code = 'USD',
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

      console.log('[FlightSearch] START URL:', TICKETS_API_START);
      console.log('[FlightSearch] Payload:', JSON.stringify(requestPayload));

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

      console.log('[FlightSearch] search_id:', search_id);
      console.log('[FlightSearch] results_url:', results_url);

      return json({
        ok: true,
        search_id,
        results_url,
        last_update_timestamp: 0,
      });
    }

    // ===== ACTION: POLL RESULTS =====
    if (action === 'results') {
      const { search_id, results_url, last_update_timestamp = 0 } = body;

      if (!search_id) {
        return json({ ok: false, error: 'search_id is required' }, 400);
      }

      // Build poll URL
      let pollUrl = results_url;
      if (!pollUrl) {
        pollUrl = `https://tickets-api.travelpayouts.com/search/affiliate/results?search_id=${encodeURIComponent(String(search_id))}`;
      }

      // Add timestamp for incremental updates
      if (last_update_timestamp && last_update_timestamp > 0) {
        const sep = pollUrl.includes('?') ? '&' : '?';
        pollUrl = `${pollUrl}${sep}last_update_timestamp=${last_update_timestamp}`;
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
      console.log('[FlightSearch] RESULTS status:', response.status);

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

      // Extract raw data
      const tickets: any[] = data?.tickets || data?.data?.tickets || [];
      const proposalsArr: any[] = data?.proposals || data?.data?.proposals || [];
      const airlinesMap: Record<string, any> = data?.airlines || data?.data?.airlines || {};
      const flightLegs: any[] = data?.flight_legs || data?.data?.flight_legs || [];
      const gatesMap: Record<string, any> = data?.gates || data?.data?.gates || {};

      console.log('[FlightSearch] is_over:', is_over, 'tickets:', tickets.length, 'proposals:', proposalsArr.length);

      // Build lookup maps
      const proposalsById = new Map<string, any>();
      for (const p of proposalsArr) {
        if (p?.id != null) proposalsById.set(String(p.id), p);
      }

      const legsById = new Map<string, any>();
      for (const l of flightLegs) {
        if (l?.id != null) legsById.set(String(l.id), l);
      }

      // Click endpoint base URL
      let clickBaseUrl = 'https://tickets-api.travelpayouts.com';
      try {
        if (results_url) {
          clickBaseUrl = new URL(String(results_url)).origin;
        }
      } catch {}

      // Resolve booking URL via click endpoint
      async function resolveBookingUrl(proposalId: string): Promise<string | null> {
        const clickUrl = `${clickBaseUrl}/searches/${encodeURIComponent(String(search_id))}/clicks/${encodeURIComponent(proposalId)}`;
        try {
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
          if (!r.ok) return null;

          const parsed = JSON.parse(t);
          const url = parsed?.url || parsed?.booking_url || parsed?.redirect_url || null;
          if (!url) return null;

          const lower = String(url).toLowerCase();
          if (lower.includes('aviasales.com/search') || lower.includes('mock=1')) {
            console.warn('[FlightSearch] Blocked invalid booking URL');
            return null;
          }
          return String(url);
        } catch {
          return null;
        }
      }

      // Normalize tickets to UI format
      const results = tickets.map((ticket, idx) => {
        const ticketProposalsRaw =
          ticket?.proposals || ticket?.proposal_ids || ticket?.proposalIds || [];

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

        // Extract legs
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
          'XX';
        const airlineName =
          AIRLINE_NAMES[String(carrier)] || airlinesMap[String(carrier)]?.name || String(carrier);

        const depCode = String(firstLeg?.origin || firstLeg?.departure || '').toUpperCase();
        const arrCode = String(lastLeg?.destination || lastLeg?.arrival || '').toUpperCase();

        const depAt = firstLeg?.departure_at || firstLeg?.departureAt || firstLeg?.departure_time || null;
        const arrAt = lastLeg?.arrival_at || lastLeg?.arrivalAt || lastLeg?.arrival_time || null;
        const depTs = firstLeg?.departure_timestamp || firstLeg?.departureTimestamp || null;
        const arrTs = lastLeg?.arrival_timestamp || lastLeg?.arrivalTimestamp || null;

        const depDate = depAt ? new Date(depAt) : depTs ? new Date(Number(depTs) * 1000) : null;
        const arrDate = arrAt ? new Date(arrAt) : arrTs ? new Date(Number(arrTs) * 1000) : null;

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
          id: `live-${String(search_id)}-${proposalId ?? idx}`,
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
        };
      });

      // Resolve booking URLs for first N results
      const MAX_BOOKING_URLS = 30;
      const withBooking = await Promise.all(
        results.slice(0, MAX_BOOKING_URLS).map(async (f) => {
          if (!f.proposalId) return { ...f, bookingUrl: null };
          const bookingUrl = await resolveBookingUrl(f.proposalId);
          return { ...f, bookingUrl };
        })
      );

      // Merge booking URLs back
      const finalResults = results.map((f, i) => {
        if (i < MAX_BOOKING_URLS && withBooking[i]) {
          return withBooking[i];
        }
        return { ...f, bookingUrl: null };
      });

      // Sort by price
      finalResults.sort((a, b) => a.price - b.price);

      console.log('[FlightSearch] Returning', finalResults.length, 'results, is_over:', is_over);
      if (finalResults.length > 0) {
        console.log('[FlightSearch] Example bookingUrl:', finalResults[0].bookingUrl?.substring(0, 100));
      }

      return json({
        ok: true,
        is_over,
        last_update_timestamp: newTimestamp,
        results,
        results_count: finalResults.length,
      });
    }

    // Legacy action support (create -> start, poll -> results)
    if (action === 'create') {
      // Redirect to new format
      const newBody = {
        action: 'start',
        origin: body.origin,
        destination: body.destination,
        depart_date: body.departDate,
        return_date: body.returnDate,
        adults: body.adults,
        children: body.children,
        infants: body.infants,
        trip_class: body.tripClass,
        currency_code: body.currency,
      };
      const newReq = new Request(req.url, {
        method: 'POST',
        headers: req.headers,
        body: JSON.stringify(newBody),
      });
      // Re-invoke with new body format - process inline
      return json({ ok: false, error: 'Please use action: "start" format' }, 400);
    }

    if (action === 'poll') {
      return json({ ok: false, error: 'Please use action: "results" format' }, 400);
    }

    return json({ ok: false, error: 'Invalid action. Use "start" or "results".' }, 400);

  } catch (err) {
    console.error('[FlightSearch] Error:', err);
    return json({ ok: false, error: String(err) }, 500);
  }
});
