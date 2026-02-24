/**
 * Cartesian Flight Search Hook
 * Runs origins × destinations × date combos with concurrency limit,
 * merges results, deduplicates, and reports progress.
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
import { SearchCombo } from "@/lib/searchCombos";

export type CartesianStatus = "idle" | "searching" | "complete" | "error" | "no_results";

export interface CartesianFlight extends Flight {
  origin_source: string;
  dest_source: string;
  combo_depart: string;
  combo_return?: string;
}

export interface CartesianProgress {
  completed: number;
  total: number;
}

export interface CartesianSearchInput {
  combos: SearchCombo[];
  isRoundtrip: boolean;
  adults: number;
  children: number;
  infants: number;
  currency: string;
  tripClass: string;
  market?: string;
}

interface UseCartesianSearchResult {
  flights: CartesianFlight[];
  status: CartesianStatus;
  error: string | null;
  isSearching: boolean;
  progress: CartesianProgress;
  search: (params: CartesianSearchInput) => Promise<void>;
  cancelSearch: () => void;
}

const POLL_INTERVAL_MS = 1300;
const POLL_TIMEOUT_MS = 45000;
const MAX_CONCURRENT = 3;

function detectMarket(override?: string): string {
  if (override) return override.toUpperCase();
  try {
    const lang = navigator.language || "en-US";
    const parts = lang.split("-");
    if (parts.length > 1) return parts[1].toUpperCase();
    return "US";
  } catch {
    return "US";
  }
}

async function searchCombo(
  combo: SearchCombo,
  isRoundtrip: boolean,
  params: CartesianSearchInput,
  signal: AbortSignal,
  market: string
): Promise<CartesianFlight[]> {
  const directions: Direction[] = [
    { origin: combo.origin, destination: combo.destination, date: combo.departDate },
  ];
  if (isRoundtrip && combo.returnDate) {
    directions.push({
      origin: combo.destination,
      destination: combo.origin,
      date: combo.returnDate,
    });
  }

  const apiParams: SearchParams = {
    directions,
    adults: params.adults || 1,
    children: params.children || 0,
    infants: params.infants || 0,
    currency: params.currency || "USD",
    sort: "best",
    limit: 100,
    tripClass: params.tripClass || "economy",
    market,
  };

  try {
    const data: SearchResponse = await apiSearchFlights(apiParams, signal);
    if (signal.aborted || !data.ok) return [];

    // Polling
    if (data.status === "pending" && data.search_id && data.results_base) {
      const pollStart = Date.now();
      let lastTimestamp = data.last_update_timestamp || 0;
      while (!signal.aborted && Date.now() - pollStart < POLL_TIMEOUT_MS) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        if (signal.aborted) return [];
        const pollData = await apiPollResults(
          {
            search_id: data.search_id!,
            results_base: data.results_base!,
            last_update_timestamp: lastTimestamp,
          },
          signal
        );
        if (signal.aborted) return [];
        if (!pollData.ok) continue;
        if (pollData.last_update_timestamp) lastTimestamp = pollData.last_update_timestamp;
        if (pollData.flights?.length) {
          const enriched = attachDealContextToFlights({
            flights: pollData.flights as Flight[],
            search_id: data.search_id!,
            results_base: data.results_base || null,
          });
          return enriched.map(
            (f) =>
              ({
                ...f,
                origin_source: combo.origin,
                dest_source: combo.destination,
                combo_depart: combo.departDate,
                combo_return: combo.returnDate,
              } as CartesianFlight)
          );
        }
        if (pollData.status && pollData.status !== "pending") break;
      }
      return [];
    }

    // Direct results
    const enriched = attachDealContextToFlights({
      flights: (data.flights || []) as Flight[],
      search_id: data.search_id || "",
      results_base: data.results_base || null,
    });
    return enriched.map(
      (f) =>
        ({
          ...f,
          origin_source: combo.origin,
          dest_source: combo.destination,
          combo_depart: combo.departDate,
          combo_return: combo.returnDate,
        } as CartesianFlight)
    );
  } catch {
    return [];
  }
}

async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  maxConcurrent: number,
  onComplete?: (index: number) => void
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
  const workers = Array.from(
    { length: Math.min(maxConcurrent, tasks.length) },
    () => runNext()
  );
  await Promise.all(workers);
  return results;
}

export function useCartesianSearch(): UseCartesianSearchResult {
  const [flights, setFlights] = useState<CartesianFlight[]>([]);
  const [status, setStatus] = useState<CartesianStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<CartesianProgress>({
    completed: 0,
    total: 0,
  });
  const abortRef = useRef<AbortController | null>(null);

  const cancelSearch = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus("idle");
  }, []);

  const search = useCallback(async (params: CartesianSearchInput) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setFlights([]);
    setError(null);
    setStatus("searching");
    setProgress({ completed: 0, total: params.combos.length });

    const market = detectMarket(params.market);

    try {
      const tasks = params.combos.map(
        (combo) => () => searchCombo(combo, params.isRoundtrip, params, controller.signal, market)
      );

      let completed = 0;
      const results = await runWithConcurrency(tasks, MAX_CONCURRENT, () => {
        completed++;
        setProgress({ completed, total: params.combos.length });
      });

      if (controller.signal.aborted) return;

      const allFlights = results.flat();

      // Dedupe
      const seen = new Set<string>();
      const deduped = allFlights.filter((f) => {
        const key = [
          f.origin_source,
          f.dest_source,
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
      setStatus(deduped.length > 0 ? "complete" : "no_results");
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : "Search failed");
      setStatus("error");
    }
  }, []);

  return {
    flights,
    status,
    error,
    isSearching: status === "searching",
    progress,
    search,
    cancelSearch,
  };
}
