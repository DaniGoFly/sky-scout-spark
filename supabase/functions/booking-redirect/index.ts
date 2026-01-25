import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Validate that a URL is safe to redirect to
 * Blocks Aviasales search/results pages
 */
function isValidBookingUrl(url: string): { valid: boolean; reason?: string } {
  try {
    const parsed = new URL(url);
    
    // Must be HTTPS
    if (parsed.protocol !== 'https:') {
      return { valid: false, reason: 'URL must use HTTPS' };
    }
    
    // Block Aviasales search/results pages
    const hostname = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname.toLowerCase();
    const searchParams = parsed.search.toLowerCase();
    
    // Block aviasales.com/search URLs
    if (hostname.includes('aviasales.com') && pathname.includes('/search')) {
      return { valid: false, reason: 'Aviasales search pages are not allowed' };
    }
    
    // Block any URL with mock=1 parameter
    if (searchParams.includes('mock=1')) {
      return { valid: false, reason: 'Mock URLs are not valid booking links' };
    }
    
    // Block generic aviasales results pages
    if (hostname.includes('aviasales.com') && 
        (pathname === '/' || pathname.includes('/results') || pathname.includes('/tickets'))) {
      return { valid: false, reason: 'Aviasales result pages are not allowed' };
    }
    
    // Block aviasales subdomains that are search/results pages
    if (hostname.match(/^(www\.)?(search|tickets|results)\.aviasales/)) {
      return { valid: false, reason: 'Aviasales search subdomains are not allowed' };
    }
    
    return { valid: true };
  } catch (e) {
    return { valid: false, reason: 'Invalid URL format' };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const encodedUrl = url.searchParams.get('u');
    
    if (!encodedUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing URL parameter' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Decode the URL
    let decodedUrl: string;
    try {
      decodedUrl = decodeURIComponent(encodedUrl);
    } catch (e) {
      return new Response(
        JSON.stringify({ error: 'Failed to decode URL' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    console.log('[BookingRedirect] Validating URL:', decodedUrl);
    
    // Validate the URL
    const validation = isValidBookingUrl(decodedUrl);
    
    if (!validation.valid) {
      console.log('[BookingRedirect] Blocked:', validation.reason);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid booking URL', 
          reason: validation.reason,
          message: 'Booking link unavailable, try another offer.'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    console.log('[BookingRedirect] Redirecting to:', decodedUrl);
    
    // Return HTTP 302 redirect
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': decodedUrl
      }
    });
    
  } catch (error) {
    console.error('[BookingRedirect] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Redirect failed',
        message: 'Booking link unavailable, try another offer.'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
