/**
 * Centralized date utilities for flight search
 * NO hardcoded dates - all dates are dynamic based on current date
 */

/**
 * Get today's date normalized to noon to avoid timezone issues
 */
export function getToday(): Date {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return today;
}

/**
 * Get default departure and return dates
 * Depart: today + 30 days
 * Return: today + 37 days (7 days after depart)
 */
export function getDefaultDates(): { depart: Date; return: Date } {
  const today = getToday();
  
  const depart = new Date(today);
  depart.setDate(depart.getDate() + 30);
  
  const ret = new Date(depart);
  ret.setDate(ret.getDate() + 7);
  
  return { depart, return: ret };
}

/**
 * Get short-term default dates (for quick searches)
 * Depart: today + 7 days
 * Return: today + 14 days
 */
export function getShortTermDates(): { depart: Date; return: Date } {
  const today = getToday();
  
  const depart = new Date(today);
  depart.setDate(depart.getDate() + 7);
  
  const ret = new Date(depart);
  ret.setDate(ret.getDate() + 7);
  
  return { depart, return: ret };
}

/**
 * Calculate months between two dates (from a to b)
 * Returns positive if b is after a
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
  const today = getToday();
  const months = monthsBetween(today, departDate);
  return months > 11;
}

/**
 * Get months ahead from today
 */
export function getMonthsAhead(departDate: Date): number {
  const today = getToday();
  return monthsBetween(today, departDate);
}

/**
 * Get a human-readable message for when pricing is not available
 */
export function getPricingUnavailableMessage(departDate: Date): string {
  const months = getMonthsAhead(departDate);
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
 * Parse date string (YYYY-MM-DD) to Date object safely at noon
 */
export function parseDateSafe(dateStr: string | null): Date | null {
  if (!dateStr) return null;
  try {
    // Parse as local date to avoid timezone issues
    const [year, month, day] = dateStr.split('-').map(Number);
    if (!year || !month || !day) return null;
    const date = new Date(year, month - 1, day, 12, 0, 0, 0);
    if (isNaN(date.getTime())) return null;
    return date;
  } catch {
    return null;
  }
}
