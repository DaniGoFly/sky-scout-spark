/**
 * Saved Flights — localStorage persistence
 * Stores full flight card data for rendering on the Saved page.
 */

import type { Flight } from "./flightNormalizer";

const STORAGE_KEY = "gofly_saved_flights";

export interface SavedFlight {
  id: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  stopsCount: number;
  airlines: string[];
  flightNumbers: string[];
  price: { amount: number; currency: string };
  proposalId?: string;
  searchId?: string;
  resultsBase?: string;
  savedAt: string; // ISO timestamp
  return?: {
    origin: string;
    destination: string;
    departureTime: string;
    arrivalTime: string;
    durationMinutes: number;
    stopsCount: number;
  };
  // Search context for full restoration
  tripType?: "oneway" | "roundtrip";
  adults?: number;
  children?: number;
  infants?: number;
  travelClass?: string;
  currency?: string;
  market?: string;
  sortBy?: "best" | "cheapest" | "fastest";
}

export interface SearchContext {
  tripType?: "oneway" | "roundtrip";
  adults?: number;
  children?: number;
  infants?: number;
  travelClass?: string;
  currency?: string;
  market?: string;
  sortBy?: "best" | "cheapest" | "fastest";
}

function readStore(): SavedFlight[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedFlight[];
  } catch {
    return [];
  }
}

function writeStore(flights: SavedFlight[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(flights));
}

export function getSavedFlights(): SavedFlight[] {
  return readStore();
}

export function isFlightSaved(flightId: string): boolean {
  return readStore().some(f => f.id === flightId);
}

export function saveFlight(flight: Flight, context?: SearchContext): void {
  const store = readStore();
  if (store.some(f => f.id === flight.id)) return;

  const saved: SavedFlight = {
    id: flight.id,
    origin: flight.origin,
    destination: flight.destination,
    departureTime: flight.departureTime,
    arrivalTime: flight.arrivalTime,
    durationMinutes: flight.durationMinutes,
    stopsCount: flight.stopsCount,
    airlines: flight.airlines,
    flightNumbers: flight.flightNumbers,
    price: { amount: flight.price.amount, currency: flight.price.currency },
    proposalId: flight.proposalId || flight.click_id,
    searchId: flight.searchId || flight.search_id,
    resultsBase: flight.resultsBase || flight.results_base,
    savedAt: new Date().toISOString(),
    ...(flight.return ? {
      return: {
        origin: flight.return.origin,
        destination: flight.return.destination,
        departureTime: flight.return.departureTime,
        arrivalTime: flight.return.arrivalTime,
        durationMinutes: flight.return.durationMinutes,
        stopsCount: flight.return.stopsCount,
      },
    } : {}),
    // Search context
    tripType: context?.tripType || (flight.return ? "roundtrip" : "oneway"),
    adults: context?.adults ?? 1,
    children: context?.children ?? 0,
    infants: context?.infants ?? 0,
    travelClass: context?.travelClass || "economy",
    currency: context?.currency,
    market: context?.market,
    sortBy: context?.sortBy,
  };

  store.unshift(saved);
  // Cap at 50 saved flights
  writeStore(store.slice(0, 50));
}

export function unsaveFlight(flightId: string): void {
  const store = readStore().filter(f => f.id !== flightId);
  writeStore(store);
}

export function toggleSavedFlight(flight: Flight, context?: SearchContext): boolean {
  if (isFlightSaved(flight.id)) {
    unsaveFlight(flight.id);
    return false;
  }
  saveFlight(flight, context);
  return true;
}
