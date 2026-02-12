/**
 * Click tracking for monetization analytics.
 * Inserts a row into flight_clicks table on the YCP Supabase project.
 */
import { supabase } from "@/lib/supabaseClient";

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
