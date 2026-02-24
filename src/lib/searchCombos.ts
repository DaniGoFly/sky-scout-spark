/**
 * Search Combo Generation
 * Expands flex dates and generates origin×destination×date combos
 * with a configurable max limit, prioritizing closest dates.
 */

import { formatDateForApi } from "./dateUtils";

export interface SearchCombo {
  origin: string;
  destination: string;
  departDate: string;
  returnDate?: string;
  distanceFromBase: number;
}

/**
 * Expand a base date by flex before/after, skipping past dates.
 */
export function expandFlexDates(baseDate: string, flexBefore: number, flexAfter: number): string[] {
  const [year, month, day] = baseDate.split("-").map(Number);
  const base = new Date(year, month - 1, day, 12, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dates: string[] = [];
  for (let i = -flexBefore; i <= flexAfter; i++) {
    const d = new Date(base);
    d.setDate(d.getDate() + i);
    if (d >= today) dates.push(formatDateForApi(d));
  }
  return dates;
}

function dayDiff(a: string, b: string): number {
  return Math.round(
    (new Date(a + "T12:00:00").getTime() - new Date(b + "T12:00:00").getTime()) / 86400000
  );
}

/**
 * Generate cartesian product of origins × destinations × date combos.
 * Sorted by distance from base dates; capped at maxCombos.
 */
export function generateSearchCombos(
  origins: string[],
  destinations: string[],
  departDates: string[],
  returnDates: string[] | null,
  baseDepartDate: string,
  baseReturnDate: string | null,
  maxCombos: number = 25
): SearchCombo[] {
  const combos: SearchCombo[] = [];

  for (const origin of origins) {
    for (const dest of destinations) {
      if (origin.toUpperCase() === dest.toUpperCase()) continue;

      if (returnDates && baseReturnDate) {
        for (const dd of departDates) {
          for (const rd of returnDates) {
            if (rd <= dd) continue;
            const distance =
              Math.abs(dayDiff(dd, baseDepartDate)) +
              Math.abs(dayDiff(rd, baseReturnDate));
            combos.push({
              origin: origin.toUpperCase(),
              destination: dest.toUpperCase(),
              departDate: dd,
              returnDate: rd,
              distanceFromBase: distance,
            });
          }
        }
      } else {
        for (const dd of departDates) {
          const distance = Math.abs(dayDiff(dd, baseDepartDate));
          combos.push({
            origin: origin.toUpperCase(),
            destination: dest.toUpperCase(),
            departDate: dd,
            distanceFromBase: distance,
          });
        }
      }
    }
  }

  combos.sort((a, b) => a.distanceFromBase - b.distanceFromBase);
  return combos.slice(0, maxCombos);
}
