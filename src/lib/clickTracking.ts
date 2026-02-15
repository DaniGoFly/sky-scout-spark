/**
 * Click tracking for monetization analytics.
 * GDPR: Only runs when user has given marketing consent.
 */
import { supabase } from "@/lib/supabaseClient";
import { hasConsent } from "@/lib/consent";

interface ClickEvent {
  search_id: string;
  proposal_id: string;
  airline?: string;
  price?: number;
  currency?: string;
  origin?: string;
  destination?: string;
}

export async function trackFlightClick(event: ClickEvent): Promise<void> {
  // GDPR: Only track if user consented to marketing/affiliate cookies
  if (!hasConsent("marketing")) {
    console.log("[monetization] tracking skipped — no marketing consent");
    return;
  }

  try {
    console.log("[monetization] tracking click", event);
    const { error } = await supabase.from("flight_clicks").insert({
      search_id: event.search_id,
      proposal_id: event.proposal_id,
      airline: event.airline || null,
      price: event.price || null,
      currency: event.currency || null,
      origin: event.origin || null,
      destination: event.destination || null,
    });
    if (error) {
      console.warn("[monetization] tracking insert failed:", error.message);
    } else {
      console.log("[monetization] click tracked successfully");
    }
  } catch (err) {
    console.warn("[monetization] tracking error:", err);
  }
}
