/**
 * Multi-Origin Search Hook
 * Fires parallel searches (max 3 concurrent) for multiple origins,
 * merges results with origin_source property, reports progress,
 * handles partial failures gracefully with retry support.
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

export interface MultiOriginProgress {
  completed: number;
  total: number;
  currentOrigin?: string;
}

interface UseMultiOriginSearchResult {
  flights: MultiOriginFlight[];
  status: MultiSearchStatus;
  error: string | null;
  isSearching: boolean;
  failedOrigins: string[];
  progress: MultiOriginProgress;
  searchMultiOrigin: (params: MultiOriginSearchParams) => Promise<void>;
  retryFailedOrigins: () => Promise<void>;
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
const MAX_CONCURRENT = 3;

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

/** Run tasks with max concurrency */
async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  maxConcurrent: number,
  onComplete?: (index: number) => void,
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let nextIndex = 0;

  async function runNext(): Promise<void> {
    while (nextIndex < tasks.length) {
      const idx = nextIndex++;
      results[idx] = await tasks[idx]();
      onComplete?.(idx);
    }
  }

  const workers = Array.from({ length: Math.min(maxConcurrent, tasks.length) }, () => runNext());
  await Promise.all(workers);
  return results;
}

export function useMultiOriginSearch(): UseMultiOriginSearchResult {
  const [flights, setFlights] = useState<MultiOriginFlight[]>([]);
  const [status, setStatus] = useState<MultiSearchStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [failedOrigins, setFailedOrigins] = useState<string[]>([]);
  const [progress, setProgress] = useState<MultiOriginProgress>({ completed: 0, total: 0 });
  const abortRef = useRef<AbortController | null>(null);
  const lastParamsRef = useRef<MultiOriginSearchParams | null>(null);

  const cancelSearch = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setStatus("idle");
  }, []);

  const executeSearch = useCallback(async (params: MultiOriginSearchParams, originsToSearch?: string[]) => {
    if (abortRef.current) abortRef.current.abort();

    const searchOrigins = originsToSearch || params.origins;
    const isRetry = !!originsToSearch;

    if (!isRetry) {
      setFlights([]);
      setError(null);
      setFailedOrigins([]);
    }
    setStatus("searching");
    setProgress({ completed: 0, total: searchOrigins.length });

    const controller = new AbortController();
    abortRef.current = controller;
    lastParamsRef.current = params;

    const market = detectMarket(params.market);

    try {
      const tasks = searchOrigins.map((origin) => () =>
        searchSingleOrigin(origin, params, controller.signal, market)
      );

      let completed = 0;
      const results = await runWithConcurrency(tasks, MAX_CONCURRENT, () => {
        completed++;
        setProgress({ completed, total: searchOrigins.length, currentOrigin: searchOrigins[Math.min(completed, searchOrigins.length - 1)] });
      });

      if (controller.signal.aborted) return;

      const newFlights: MultiOriginFlight[] = [];
      const failed: string[] = [];

      for (const result of results) {
        if (result.error && result.error !== "cancelled") {
          failed.push(result.origin);
        }
        newFlights.push(...result.flights);
      }

      if (isRetry) {
        // Merge with existing flights
        setFlights((prev) => {
          const combined = [...prev, ...newFlights];
          // Deduplicate
          const seen = new Set<string>();
          return combined.filter((f) => {
            const key = [f.origin_source, f.airlines?.[0] || "", f.departureTime || "", f.arrivalTime || "", Math.round(f.price?.amount || 0), f.durationMinutes || 0].join("|");
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        });
        setFailedOrigins((prev) => {
          const retried = new Set(searchOrigins.map((s) => s.toUpperCase()));
          return [...prev.filter((o) => !retried.has(o.toUpperCase())), ...failed];
        });
      } else {
        // Deduplicate
        const seen = new Set<string>();
        const deduped = newFlights.filter((f) => {
          const key = [f.origin_source, f.airlines?.[0] || "", f.departureTime || "", f.arrivalTime || "", Math.round(f.price?.amount || 0), f.durationMinutes || 0].join("|");
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setFlights(deduped);
        setFailedOrigins(failed);
      }

      // Determine final status
      setFlights((current) => {
        if (current.length === 0) {
          setStatus("no_results");
          if (failed.length === searchOrigins.length) {
            setError("All origin searches failed");
          }
        } else {
          setStatus("complete");
        }
        return current;
      });
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : "Network error");
      setStatus("error");
    }
  }, []);

  const searchMultiOrigin = useCallback(async (params: MultiOriginSearchParams) => {
    await executeSearch(params);
  }, [executeSearch]);

  const retryFailedOrigins = useCallback(async () => {
    if (!lastParamsRef.current || failedOrigins.length === 0) return;
    await executeSearch(lastParamsRef.current, failedOrigins);
  }, [executeSearch, failedOrigins]);

  return {
    flights,
    status,
    error,
    isSearching: status === "searching",
    failedOrigins,
    progress,
    searchMultiOrigin,
    retryFailedOrigins,
    cancelSearch,
  };
}
