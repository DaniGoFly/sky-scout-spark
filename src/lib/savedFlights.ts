/**
 * Saved Flights — localStorage persistence
 * Stores full flight card data for rendering on the Saved page.
 */

import type { Flight } from "./flightNormalizer";

const STORAGE_KEY = "gofly_saved_flights";

export interface SavedFilters {
  stopsMode?: "any" | "direct" | "1" | "2plus";
  airlines?: string[];
  priceRange?: [number, number];
  departureTime?: string[];
  selectedOrigin?: string;
  hideLongLayovers?: boolean;
}

export interface SavedSelection {
  itineraryId?: string;
  outboundItineraryId?: string;
  inboundItineraryId?: string;
  outboundFingerprint?: string;
  inboundFingerprint?: string;
  proposalId?: string;
  searchId?: string;
  resultsBase?: string;
}

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
  departDate?: string;
  returnDate?: string | null;
  adults?: number;
  children?: number;
  infants?: number;
  travelClass?: string;
  currency?: string;
  market?: string;
  sortBy?: "best" | "cheapest" | "fastest";
  searchParams?: Record<string, string>;
  filters?: SavedFilters;
  selection?: SavedSelection;
}

export interface SearchContext {
  tripType?: "oneway" | "roundtrip";
  departDate?: string;
  returnDate?: string | null;
  adults?: number;
  children?: number;
  infants?: number;
  travelClass?: string;
  currency?: string;
  market?: string;
  sortBy?: "best" | "cheapest" | "fastest";
  searchParams?: Record<string, string>;
  filters?: SavedFilters;
  selection?: SavedSelection;
}

function extractIsoDate(value?: string | null): string {
  if (!value) return "";
  const match = value.match(/\d{4}-\d{2}-\d{2}/);
  return match?.[0] || "";
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

  const inferredDepartDate =
    context?.departDate ||
    context?.searchParams?.depart ||
    extractIsoDate((flight as any).depart_date) ||
    extractIsoDate(flight.departureTime);

  const inferredReturnDate =
    context?.returnDate ||
    context?.searchParams?.return ||
    extractIsoDate((flight as any).return_date) ||
    extractIsoDate(flight.return?.departureTime) ||
    null;

  const resolvedTripType: "oneway" | "roundtrip" =
    context?.tripType || inferredReturnDate || flight.return ? "roundtrip" : "oneway";

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
    tripType: resolvedTripType,
    departDate: inferredDepartDate || undefined,
    returnDate: resolvedTripType === "roundtrip" ? inferredReturnDate : null,
    adults: context?.adults ?? 1,
    children: context?.children ?? 0,
    infants: context?.infants ?? 0,
    travelClass: context?.travelClass || "economy",
    currency: context?.currency,
    market: context?.market,
    sortBy: context?.sortBy,
    searchParams: context?.searchParams,
    filters: context?.filters,
    selection: {
      itineraryId: context?.selection?.itineraryId || flight.id,
      outboundItineraryId: context?.selection?.outboundItineraryId || flight.id,
      inboundItineraryId: context?.selection?.inboundItineraryId,
      outboundFingerprint: context?.selection?.outboundFingerprint,
      inboundFingerprint: context?.selection?.inboundFingerprint,
      proposalId: context?.selection?.proposalId || flight.proposalId || flight.click_id,
      searchId: context?.selection?.searchId || flight.searchId || flight.search_id,
      resultsBase: context?.selection?.resultsBase || flight.resultsBase || flight.results_base,
    },
  };

  if (saved.tripType === "roundtrip") {
    console.debug("[saved-flights][save-roundtrip]", {
      tripType: saved.tripType,
      departDate: saved.departDate,
      returnDate: saved.returnDate,
      outboundItineraryId: saved.selection?.outboundItineraryId,
      inboundItineraryId: saved.selection?.inboundItineraryId,
    });
  }

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
