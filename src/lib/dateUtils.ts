/**
 * Centralized date utilities for flight search
 * NO hardcoded dates - all dates are dynamic based on current date
 */

/**
 * Get default departure and return dates
 * Depart: today + 30 days
 * Return: today + 37 days
 */
export function getDefaultDates(): { depart: Date; return: Date } {
  const today = new Date();
  today.setHours(12, 0, 0, 0); // Normalize to noon to avoid timezone issues
  
  const depart = new Date(today);
  depart.setDate(depart.getDate() + 30);
  
  const ret = new Date(today);
  ret.setDate(ret.getDate() + 37);
  
  return { depart, return: ret };
}

/**
 * Get short-term default dates (for compact search bar)
 * Depart: today + 7 days
 * Return: today + 14 days
 */
export function getShortTermDates(): { depart: Date; return: Date } {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  
  const depart = new Date(today);
  depart.setDate(depart.getDate() + 7);
  
  const ret = new Date(today);
  ret.setDate(ret.getDate() + 14);
  
  return { depart, return: ret };
}

/**
 * Calculate months between two dates
 */
export function monthsBetween(a: Date, b: Date): number {
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}

/**
 * Check if a date is too far in the future for airline pricing
 * Airlines typically release pricing 9-12 months in advance
 * We use 11 months as the threshold
 */
export function isTooFarForPricing(departDate: Date): boolean {
  const today = new Date();
  return monthsBetween(today, departDate) > 11;
}

/**
 * Get a human-readable message for when pricing is not available
 */
export function getPricingUnavailableMessage(departDate: Date): string {
  const months = monthsBetween(new Date(), departDate);
  if (months > 18) {
    return "Airlines typically release pricing 9-12 months before departure. Your selected date is over a year away.";
  }
  return "Prices for this date are not available yet. Airlines usually publish fares 6-11 months in advance.";
}

/**
 * Format date for API calls (YYYY-MM-DD)
 */
export function formatDateForApi(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse date string to Date object safely
 */
export function parseDateSafe(dateStr: string | null): Date | null {
  if (!dateStr) return null;
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    return date;
  } catch {
    return null;
  }
}
