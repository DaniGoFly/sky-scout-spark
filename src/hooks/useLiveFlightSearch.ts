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

export type SearchStatus = "idle" | "searching" | "complete" | "error" | "no_results";

export interface SearchParamsHook {
  directions: Direction[];
  adults?: number;
  children?: number;
  infants?: number;
  currency?: string;
  sort?: "best" | "cheapest" | "fastest";
  limit?: number;
  tripClass?: string;
  market?: string;
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
  cachedAt: number | null;
  searchFlights: (params: SearchParamsHook) => Promise<void>;
  forceSearchFlights: (params: SearchParamsHook) => Promise<void>;
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
    dirs: params.directions.map(d => ({
      o: d.origin.toUpperCase(),
      d: d.destination.toUpperCase(),
      dt: d.date,
    })),
    a: params.adults || 1,
    c: params.children || 0,
    i: params.infants || 0,
    cur: (params.currency || "USD").toUpperCase(),
    cls: params.tripClass || "economy",
    mkt: (params.market || "US").toUpperCase(),
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

/* ── Detect market from browser locale ── */
function detectMarket(override?: string): string {
  if (override) return override.toUpperCase();
  try {
    const lang = navigator.language || "en-US";
    const parts = lang.split("-");
    if (parts.length > 1) return parts[1].toUpperCase();
    const langToCountry: Record<string, string> = {
      de: "DE", fr: "FR", es: "ES", it: "IT", pt: "PT",
      tr: "TR", ar: "SA", nl: "NL", pl: "PL", ru: "RU",
      ja: "JP", ko: "KR", zh: "CN", sv: "SE", da: "DK",
      no: "NO", fi: "FI", el: "GR", cs: "CZ", ro: "RO",
    };
    return langToCountry[parts[0].toLowerCase()] || "US";
  } catch { return "US"; }
}

/* ── Polling config ── */
const POLL_INTERVAL_MS = 1300;
const POLL_TIMEOUT_MS = 45000;

export function useLiveFlightSearch(): UseLiveFlightSearchResult {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [status, setStatus] = useState<SearchStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [searchId, setSearchId] = useState<string | null>(null);
  const [resultsBase, setResultsBase] = useState<string | null>(null);
  const [debugData, setDebugData] = useState<DebugData | null>(null);
  const [cachedAt, setCachedAt] = useState<number | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const cancelSearch = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setStatus("idle");
  }, []);

  /** Internal fetch — always hits backend */
  const fetchFromBackend = useCallback(async (params: SearchParamsHook) => {
    if (abortRef.current) abortRef.current.abort();

    setError(null);
    setDebugData(null);
    setStatus("searching");

    const controller = new AbortController();
    abortRef.current = controller;

    const detectedMarket = detectMarket(params.market);
    const cacheKey = buildCacheKey({ ...params, market: detectedMarket });

    const apiParams: SearchParams = {
      directions: params.directions,
      adults: params.adults || 1,
      children: params.children || 0,
      infants: params.infants || 0,
      currency: params.currency || "USD",
      sort: params.sort || "best",
      limit: params.limit || 100,
      tripClass: params.tripClass || "economy",
      market: detectedMarket,
    };

    const debug: DebugData = {
      requestUrl: "https://ycpqgsjhxzhkljlszbwc.supabase.co/functions/v1/flight-search",
      requestPayload: apiParams as unknown as Record<string, unknown>,
      pollCount: 0,
    };

    try {
      if (import.meta.env.DEV) {
        console.debug("[flight-search] Fetching flight-search", {
          directions: params.directions,
          sort: apiParams.sort, limit: apiParams.limit,
          currency: apiParams.currency, market: apiParams.market,
        });
      }
      console.log("[flight-search] POST directions", params.directions.map(d => `${d.origin}→${d.destination} ${d.date}`).join(", "));

      const data: SearchResponse = await apiSearchFlights(apiParams, controller.signal);
      if (controller.signal.aborted) return;

      debug.responseStep = data.step;
      debug.responseStatus = data.status;
      debug.searchId = data.search_id;
      debug.resultsBase = data.results_base;

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

      // Polling
      if (data.status === "pending" && data.search_id && data.results_base) {
        const pollStart = Date.now();
        let lastTimestamp = data.last_update_timestamp || 0;
        let pollCount = 0;

        while (!controller.signal.aborted && Date.now() - pollStart < POLL_TIMEOUT_MS) {
          await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
          if (controller.signal.aborted) return;

          pollCount++;
          debug.pollCount = pollCount;

          const pollData = await apiPollResults(
            { search_id: data.search_id!, results_base: data.results_base!, last_update_timestamp: lastTimestamp },
            controller.signal
          );
          if (controller.signal.aborted) return;

          if (!pollData.ok) continue;
          if (pollData.last_update_timestamp) lastTimestamp = pollData.last_update_timestamp;

          if (pollData.flights && pollData.flights.length > 0) {
            const flightResults = attachDealContextToFlights({
              flights: pollData.flights as Flight[],
              search_id: data.search_id!,
              results_base: data.results_base || null,
            });

            const now = Date.now();
            writeCache(cacheKey, { timestamp: now, searchId: data.search_id!, resultsBase: data.results_base || null, flights: flightResults });
            setCachedAt(now);
            setDebugData(debug);
            setFlights(flightResults);
            setStatus("complete");
            return;
          }

          if (pollData.status && pollData.status !== "pending") break;
        }

        debug.error = "Polling timed out — no flights returned";
        setDebugData(debug);
        setStatus("no_results");
        return;
      }

      // Direct results
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

      const now = Date.now();
      writeCache(cacheKey, { timestamp: now, searchId: data.search_id || null, resultsBase: data.results_base || null, flights: flightResults });
      setCachedAt(now);
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

  /**
   * searchFlights — cache-first.
   * If a fresh cache exists (<10 min), serve it immediately without backend call.
   * Otherwise fetch from backend.
   */
  const doSearch = useCallback(async (params: SearchParamsHook) => {
    const detectedMarket = detectMarket(params.market);
    const cacheKey = buildCacheKey({ ...params, market: detectedMarket });
    const cached = readCache(cacheKey);

    if (cached && cached.flights.length > 0) {
      // Stale-while-revalidate: serve cached immediately
      setFlights(cached.flights);
      setSearchId(cached.searchId);
      setResultsBase(cached.resultsBase);
      setCachedAt(cached.timestamp);
      setError(null);
      setDebugData(null);
      setStatus("complete");
      console.log("[flight-search] Serving cached, age:", Math.round((Date.now() - cached.timestamp) / 1000), "s — revalidating in background");

      // Background revalidate (don't clear flights, don't set status to searching)
      fetchFromBackend(params).catch(() => {});
      return;
    }

    // No cache — fetch fresh (show skeleton)
    setFlights([]);
    setCachedAt(null);
    await fetchFromBackend(params);
  }, [fetchFromBackend]);

  /**
   * forceSearchFlights — always hits backend, ignores cache.
   * Used by "Refresh prices" button.
   */
  const forceSearch = useCallback(async (params: SearchParamsHook) => {
    setFlights([]);
    setCachedAt(null);
    await fetchFromBackend(params);
  }, [fetchFromBackend]);

  return {
    flights,
    status,
    error,
    isSearching: status === "searching",
    searchId,
    resultsBase,
    debugData,
    cachedAt,
    searchFlights: doSearch,
    forceSearchFlights: forceSearch,
    cancelSearch,
  };
}

export type { Flight } from "@/lib/flightNormalizer";
