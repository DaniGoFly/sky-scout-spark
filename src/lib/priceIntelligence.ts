/**
 * Price Intelligence System
 * Computes deal quality badges based on result-set percentiles.
 * No backend changes required — uses current returned results.
 */

import type { Flight } from "./flightNormalizer";

export type DealQuality = "great" | "fair" | "high" | null;

export interface PriceIntelligence {
  quality: DealQuality;
  label: string;
  color: string;         // Tailwind text color class
  bgColor: string;       // Tailwind bg class
}

/**
 * Compute price percentiles from the current result set,
 * then classify a flight's deal quality.
 */
export function getPriceIntelligence(
  flight: Flight,
  allFlights: Flight[],
): PriceIntelligence | null {
  if (!allFlights.length || allFlights.length < 3) return null;

  const prices = allFlights
    .map((f) => f.price?.amount)
    .filter((p) => p > 0 && Number.isFinite(p))
    .sort((a, b) => a - b);

  if (prices.length < 3) return null;

  const price = flight.price?.amount;
  if (!price || price <= 0) return null;

  const avg = prices.reduce((s, p) => s + p, 0) / prices.length;
  const p20Index = Math.floor(prices.length * 0.2);
  const p20Threshold = prices[p20Index];
  const duration = flight.durationMinutes || 0;

  // Great Deal: price in lowest 20% AND duration under 14h
  if (price <= p20Threshold && duration > 0 && duration < 840) {
    return {
      quality: "great",
      label: "Great Deal",
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    };
  }

  // Higher Than Average: price > average * 1.2
  if (price > avg * 1.2) {
    return {
      quality: "high",
      label: "Higher Than Average",
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    };
  }

  // Fair Price: everything in between
  if (price > p20Threshold && price <= avg * 1.2) {
    return {
      quality: "fair",
      label: "Fair Price",
      color: "text-sky-400",
      bgColor: "bg-sky-400/10",
    };
  }

  return null;
}
