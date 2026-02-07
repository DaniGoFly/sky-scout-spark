import type { Flight } from "@/lib/flightNormalizer";

function safeStr(x: unknown): string {
  return typeof x === "string" ? x : "";
}

/**
 * Extract search_id with required alias fallbacks.
 */
export function extractSearchId(raw: unknown, fallbackSearchId: string): string {
  const r: any = raw;
  return (
    safeStr(r?.search_id) ||
    safeStr(r?.searchId) ||
    safeStr(r?.searchid) ||
    safeStr(fallbackSearchId)
  );
}

/**
 * Extract click_id with required alias fallbacks.
 * Includes legacy proposalId as last resort for older backend responses.
 */
export function extractClickId(raw: unknown): string {
  const r: any = raw;
  return (
    safeStr(r?.click_id) ||
    safeStr(r?.str_click_id) ||
    safeStr(r?.clickId) ||
    safeStr(r?.deeplink_id) ||
    safeStr(r?.link_id) ||
    safeStr(r?.booking_click_id) ||
    safeStr(r?.proposalId) ||
    ""
  );
}

export function attachDealContextToFlights(args: {
  flights: Flight[];
  search_id: string;
  results_base?: string | null;
}): Flight[] {
  const search_id = safeStr(args.search_id);
  const results_base = args.results_base ? safeStr(args.results_base) : undefined;

  return (args.flights || []).map((f) => {
    const click_id = extractClickId(f);
    const resolvedSearchId = extractSearchId(f, search_id);

    return {
      ...f,
      // snake_case IDs for deal resolution
      search_id: resolvedSearchId,
      click_id,
      results_base,
      // camelCase aliases used by UI components
      searchId: resolvedSearchId,
      proposalId: click_id,
      resultsBase: results_base ?? undefined,
    } as Flight;
  });
}
