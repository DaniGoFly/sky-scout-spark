/**
 * Multi-Origin Search Hook
 * Fires parallel searches for multiple origins, merges results
 * with origin_source property, handles partial failures gracefully.
 */

import { useState, useCallback, useRef } from "react";
import { Flight } from "@/lib/flightNormalizer";
import {
  searchFlights as apiSearchFlights,
  pollResults as apiPollResults,
  SearchParams,
  SearchResponse,
  Direction,
} from "@/lib/flightSearchApi";
import { attachDealContextToFlights } from "@/lib/flightDealIds";

export type MultiSearchStatus = "idle" | "searching" | "complete" | "error" | "no_results";

export interface MultiOriginFlight extends Flight {
  origin_source: string;
}

interface OriginResult {
  origin: string;
  flights: MultiOriginFlight[];
  error?: string;
}

interface UseMultiOriginSearchResult {
  flights: MultiOriginFlight[];
  status: MultiSearchStatus;
  error: string | null;
  isSearching: boolean;
  failedOrigins: string[];
  searchMultiOrigin: (params: MultiOriginSearchParams) => Promise<void>;
  cancelSearch: () => void;
}

export interface MultiOriginSearchParams {
  origins: string[];
  destination: string;
  departDate: string;
  returnDate?: string;
  isRoundtrip: boolean;
  adults?: number;
  children?: number;
  infants?: number;
  currency?: string;
  sort?: "best" | "cheapest" | "fastest";
  limit?: number;
  tripClass?: string;
  market?: string;
}

function detectMarket(override?: string): string {
  if (override) return override.toUpperCase();
  try {
    const lang = navigator.language || "en-US";
    const parts = lang.split("-");
    if (parts.length > 1) return parts[1].toUpperCase();
    const langToCountry: Record<string, string> = {
      de: "DE", fr: "FR", es: "ES", it: "IT", pt: "PT",
      tr: "TR", ar: "SA", nl: "NL", pl: "PL", ru: "RU",
    };
    return langToCountry[parts[0].toLowerCase()] || "US";
  } catch { return "US"; }
}

const POLL_INTERVAL_MS = 1300;
const POLL_TIMEOUT_MS = 45000;

async function searchSingleOrigin(
  origin: string,
  params: MultiOriginSearchParams,
  signal: AbortSignal,
  market: string,
): Promise<OriginResult> {
  const directions: Direction[] = [];
  if (params.isRoundtrip && params.returnDate) {
    directions.push(
      { origin: origin.toUpperCase(), destination: params.destination.toUpperCase(), date: params.departDate },
      { origin: params.destination.toUpperCase(), destination: origin.toUpperCase(), date: params.returnDate },
    );
  } else {
    directions.push({ origin: origin.toUpperCase(), destination: params.destination.toUpperCase(), date: params.departDate });
  }

  const apiParams: SearchParams = {
    directions,
    adults: params.adults || 1,
    children: params.children || 0,
    infants: params.infants || 0,
    currency: params.currency || "USD",
    sort: params.sort || "best",
    limit: params.limit || 100,
    tripClass: params.tripClass || "economy",
    market,
  };

  try {
    const data: SearchResponse = await apiSearchFlights(apiParams, signal);
    if (signal.aborted) return { origin, flights: [], error: "cancelled" };

    if (!data.ok) {
      return { origin, flights: [], error: data.error || "Search failed" };
    }

    // Handle polling
    if (data.status === "pending" && data.search_id && data.results_base) {
      const pollStart = Date.now();
      let lastTimestamp = data.last_update_timestamp || 0;

      while (!signal.aborted && Date.now() - pollStart < POLL_TIMEOUT_MS) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        if (signal.aborted) return { origin, flights: [], error: "cancelled" };

        const pollData = await apiPollResults(
          { search_id: data.search_id!, results_base: data.results_base!, last_update_timestamp: lastTimestamp },
          signal,
        );
        if (signal.aborted) return { origin, flights: [], error: "cancelled" };
        if (!pollData.ok) continue;
        if (pollData.last_update_timestamp) lastTimestamp = pollData.last_update_timestamp;

        if (pollData.flights && pollData.flights.length > 0) {
          const flightResults = attachDealContextToFlights({
            flights: pollData.flights as Flight[],
            search_id: data.search_id!,
            results_base: data.results_base || null,
          });
          return {
            origin,
            flights: flightResults.map((f) => ({ ...f, origin_source: origin.toUpperCase() } as MultiOriginFlight)),
          };
        }

        if (pollData.status && pollData.status !== "pending") break;
      }
      return { origin, flights: [], error: "Polling timed out" };
    }

    // Direct results
    const flightResults = attachDealContextToFlights({
      flights: (data.flights || []) as Flight[],
      search_id: data.search_id || "",
      results_base: data.results_base || null,
    });

    return {
      origin,
      flights: flightResults.map((f) => ({ ...f, origin_source: origin.toUpperCase() } as MultiOriginFlight)),
    };
  } catch (err) {
    if (signal.aborted) return { origin, flights: [], error: "cancelled" };
    return { origin, flights: [], error: err instanceof Error ? err.message : "Network error" };
  }
}

export function useMultiOriginSearch(): UseMultiOriginSearchResult {
  const [flights, setFlights] = useState<MultiOriginFlight[]>([]);
  const [status, setStatus] = useState<MultiSearchStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [failedOrigins, setFailedOrigins] = useState<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const cancelSearch = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setStatus("idle");
  }, []);

  const searchMultiOrigin = useCallback(async (params: MultiOriginSearchParams) => {
    if (abortRef.current) abortRef.current.abort();

    setFlights([]);
    setError(null);
    setFailedOrigins([]);
    setStatus("searching");

    const controller = new AbortController();
    abortRef.current = controller;

    const market = detectMarket(params.market);

    try {
      console.log("[multi-origin] Searching", params.origins.length, "origins in parallel");
      
      const results = await Promise.all(
        params.origins.map((origin) =>
          searchSingleOrigin(origin, params, controller.signal, market)
        )
      );

      if (controller.signal.aborted) return;

      const allFlights: MultiOriginFlight[] = [];
      const failed: string[] = [];

      for (const result of results) {
        if (result.error && result.error !== "cancelled") {
          failed.push(result.origin);
          console.warn(`[multi-origin] ${result.origin} failed:`, result.error);
        }
        allFlights.push(...result.flights);
      }

      setFailedOrigins(failed);

      if (allFlights.length === 0) {
        setStatus("no_results");
        if (failed.length === params.origins.length) {
          setError("All origin searches failed");
        }
        return;
      }

      // Deduplicate by content key + origin
      const seen = new Set<string>();
      const deduped = allFlights.filter((f) => {
        const key = [
          f.origin_source,
          f.airlines?.[0] || "",
          f.departureTime || "",
          f.arrivalTime || "",
          Math.round(f.price?.amount || 0),
          f.durationMinutes || 0,
        ].join("|");
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      setFlights(deduped);
      setStatus("complete");
      console.log("[multi-origin] Merged", deduped.length, "flights from", params.origins.length, "origins");
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : "Network error");
      setStatus("error");
    }
  }, []);

  return {
    flights,
    status,
    error,
    isSearching: status === "searching",
    failedOrigins,
    searchMultiOrigin,
    cancelSearch,
  };
}
