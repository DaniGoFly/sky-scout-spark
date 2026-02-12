import { useState, useCallback, useRef } from "react";
import { Flight } from "@/lib/flightNormalizer";
import {
  searchFlights as apiSearchFlights,
  pollResults as apiPollResults,
  SearchParams,
  SearchResponse,
} from "@/lib/flightSearchApi";
import { attachDealContextToFlights } from "@/lib/flightDealIds";

export type SearchStatus = "idle" | "searching" | "complete" | "error" | "no_results";

export interface SearchParamsHook {
  origin: string;
  destination: string;
  departDate: string;
  returnDate?: string;
  adults?: number;
  children?: number;
  infants?: number;
  currency?: string;
  sort?: "best" | "cheapest" | "fastest";
  limit?: number;
  tripClass?: string;
}

export interface DebugData {
  requestUrl: string;
  requestPayload: Record<string, unknown>;
  responseStep?: string;
  responseStatus?: string;
  searchId?: string;
  resultsBase?: string;
  pollCount?: number;
  error?: string;
  rawResponse?: unknown;
}

interface UseLiveFlightSearchResult {
  flights: Flight[];
  status: SearchStatus;
  error: string | null;
  isSearching: boolean;
  searchId: string | null;
  resultsBase: string | null;
  debugData: DebugData | null;
  searchFlights: (params: SearchParamsHook) => Promise<void>;
  cancelSearch: () => void;
}

/* ── sessionStorage cache helpers ── */

const CACHE_PREFIX = "goflyfinder:searchCache:";
const CACHE_TTL_MS = 10 * 60 * 1000;

interface CachedResult {
  timestamp: number;
  searchId: string | null;
  resultsBase: string | null;
  flights: Flight[];
}

function buildCacheKey(params: SearchParamsHook): string {
  const normalized = {
    o: params.origin?.toUpperCase(),
    d: params.destination?.toUpperCase(),
    dep: params.departDate,
    ret: params.returnDate || "",
    a: params.adults || 1,
    c: params.children || 0,
    i: params.infants || 0,
    cur: params.currency || "USD",
    cls: params.tripClass || "economy",
  };
  return CACHE_PREFIX + JSON.stringify(normalized);
}

function readCache(key: string): CachedResult | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed: CachedResult = JSON.parse(raw);
    if (Date.now() - parsed.timestamp > CACHE_TTL_MS) {
      sessionStorage.removeItem(key);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(key: string, data: CachedResult) {
  try {
    sessionStorage.setItem(key, JSON.stringify(data));
  } catch {
    /* sessionStorage full */
  }
}

/* ── Polling config ── */
const POLL_INTERVAL_MS = 1200;
const POLL_TIMEOUT_MS = 25000;

export function useLiveFlightSearch(): UseLiveFlightSearchResult {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [status, setStatus] = useState<SearchStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [searchId, setSearchId] = useState<string | null>(null);
  const [resultsBase, setResultsBase] = useState<string | null>(null);
  const [debugData, setDebugData] = useState<DebugData | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const cancelSearch = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setStatus("idle");
  }, []);

  const doSearch = useCallback(async (params: SearchParamsHook) => {
    if (abortRef.current) abortRef.current.abort();

    const cacheKey = buildCacheKey(params);
    const cached = readCache(cacheKey);

    if (cached && cached.flights.length > 0) {
      setFlights(cached.flights);
      setSearchId(cached.searchId);
      setResultsBase(cached.resultsBase);
      setError(null);
      setDebugData(null);
      setStatus("complete");
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    setFlights([]);
    setError(null);
    setSearchId(null);
    setResultsBase(null);
    setDebugData(null);
    setStatus("searching");

    // Build the exact request body
    const cabinMap: Record<string, string> = {
      economy: "Y", premium_economy: "W", business: "C", first: "F",
    };
    const tripClassCode = cabinMap[(params.tripClass || "economy").toLowerCase()] || "Y";

    const requestPayload: Record<string, unknown> = {
      action: "search",
      origin: params.origin.toUpperCase(),
      destination: params.destination.toUpperCase(),
      depart_date: params.departDate,
      adults: params.adults || 1,
      children: params.children || 0,
      infants: params.infants || 0,
      trip_class: tripClassCode,
      currency_code: (params.currency || "USD").toUpperCase(),
      market_code: "US",
    };
    if (params.returnDate) requestPayload.return_date = params.returnDate;

    const debug: DebugData = {
      requestUrl: "https://ycpqgsjhxzhkljlszbwc.supabase.co/functions/v1/flight-search",
      requestPayload,
      pollCount: 0,
    };

    try {
      console.log("[flight-search] POST", params.origin, "→", params.destination);
      const data: SearchResponse = await apiSearchFlights(
        params as SearchParams,
        controller.signal
      );

      if (controller.signal.aborted) return;

      debug.responseStep = data.step;
      debug.responseStatus = data.status;
      debug.searchId = data.search_id;
      debug.resultsBase = data.results_base;

      console.log("[flight-search] response", {
        ok: data.ok, step: data.step, status: data.status,
        flights: data.flights?.length || 0, error: data.error,
      });

      if (!data.ok) {
        if (data.error === "Search cancelled") return;
        debug.error = data.error;
        debug.rawResponse = data;
        setDebugData(debug);
        setError(data.error || "Search failed");
        setStatus("error");
        return;
      }

      if (data.search_id) setSearchId(data.search_id);
      if (data.results_base) setResultsBase(data.results_base);

      // If pending, poll for results
      if (data.status === "pending" && data.search_id && data.results_base) {
        console.log("[flight-search] status=pending, starting poll...");
        const pollStart = Date.now();
        let lastTimestamp = data.last_update_timestamp || 0;
        let pollCount = 0;

        while (!controller.signal.aborted && Date.now() - pollStart < POLL_TIMEOUT_MS) {
          await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
          if (controller.signal.aborted) return;

          pollCount++;
          debug.pollCount = pollCount;

          const pollData = await apiPollResults(
            {
              search_id: data.search_id!,
              results_base: data.results_base!,
              last_update_timestamp: lastTimestamp,
            },
            controller.signal
          );

          if (controller.signal.aborted) return;

          console.log(`[flight-search] poll #${pollCount}`, {
            ok: pollData.ok, status: pollData.status,
            flights: pollData.flights?.length || 0,
          });

          if (!pollData.ok) continue; // retry

          if (pollData.last_update_timestamp) {
            lastTimestamp = pollData.last_update_timestamp;
          }

          // If we got flights with segments, we're done
          if (pollData.flights && pollData.flights.length > 0) {
            const flightResults = attachDealContextToFlights({
              flights: pollData.flights as Flight[],
              search_id: data.search_id!,
              results_base: data.results_base || null,
            });

            writeCache(cacheKey, {
              timestamp: Date.now(),
              searchId: data.search_id!,
              resultsBase: data.results_base || null,
              flights: flightResults,
            });

            setDebugData(debug);
            setFlights(flightResults);
            setStatus("complete");
            return;
          }

          // If status changed from pending, break
          if (pollData.status && pollData.status !== "pending") break;
        }

        // Polling exhausted
        debug.error = "Polling timed out — no flights returned";
        setDebugData(debug);
        setStatus("no_results");
        return;
      }

      // Direct results (no polling needed)
      const flightResults: Flight[] = attachDealContextToFlights({
        flights: (data.flights || []) as Flight[],
        search_id: data.search_id || "",
        results_base: data.results_base || null,
      });

      if (flightResults.length === 0) {
        debug.error = "No flights in response";
        setDebugData(debug);
        setStatus("no_results");
        return;
      }

      writeCache(cacheKey, {
        timestamp: Date.now(),
        searchId: data.search_id || null,
        resultsBase: data.results_base || null,
        flights: flightResults,
      });

      setDebugData(debug);
      setFlights(flightResults);
      setStatus("complete");
    } catch (err) {
      if (controller.signal.aborted) return;
      const msg = err instanceof Error ? err.message : "Network error";
      debug.error = msg;
      setDebugData(debug);
      setError(msg);
      setStatus("error");
    }
  }, []);

  return {
    flights,
    status,
    error,
    isSearching: status === "searching",
    searchId,
    resultsBase,
    debugData,
    searchFlights: doSearch,
    cancelSearch,
  };
}

export type { Flight } from "@/lib/flightNormalizer";
