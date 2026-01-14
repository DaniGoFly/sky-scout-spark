/**
 * Unified search parameters utility for flight search
 * Centralizes param normalization and defaults
 */

export type TripType = "oneway" | "roundtrip";
export type TravelClass = "economy" | "premium_economy" | "business" | "first";

/**
 * Normalize passenger counts from various input formats
 * Handles both `infants` and `infantsSeat + infantsLap` styles
 */
export function normalizeCounts(input: Record<string, unknown>): {
  adults: number;
  children: number;
  infants: number;
} {
  const adults = Math.max(1, Number(input.adults ?? 1) || 1);
  const children = Math.max(0, Number(input.children ?? 0) || 0);

  // Support both styles: infants OR infantsSeat/infantsLap
  const infants = Math.max(
    0,
    Number(input.infants ?? 0) ||
      (Number(input.infantsSeat ?? 0) + Number(input.infantsLap ?? 0))
  );

  return { adults, children, infants };
}

/**
 * Get default departure and return dates
 * Depart: today + 7 days
 * Return: today + 14 days
 * (shorter window for better cache hit rates)
 */
export function defaultDates(): { departDate: string; returnDate: string } {
  const today = new Date();
  today.setHours(12, 0, 0, 0); // Normalize to noon to avoid timezone issues

  const d1 = new Date(today);
  d1.setDate(d1.getDate() + 7);

  const d2 = new Date(today);
  d2.setDate(d2.getDate() + 14);

  const toISO = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  return { departDate: toISO(d1), returnDate: toISO(d2) };
}

/**
 * Parse URL search params into normalized search request
 */
export function parseSearchParams(params: URLSearchParams): {
  origin: string;
  destination: string;
  departDate: string;
  returnDate: string | null;
  tripType: TripType;
  travelClass: TravelClass;
  adults: number;
  children: number;
  infants: number;
  currency: string;
  market: string;
} {
  const defaults = defaultDates();
  const counts = normalizeCounts({
    adults: params.get("adults"),
    children: params.get("children"),
    infants: params.get("infants"),
    infantsSeat: params.get("infantsSeat"),
    infantsLap: params.get("infantsLap"),
  });

  const tripType = (params.get("trip") || "roundtrip") as TripType;

  return {
    origin: (params.get("from") || "").toUpperCase(),
    destination: (params.get("to") || "").toUpperCase(),
    departDate: params.get("depart") || defaults.departDate,
    returnDate:
      tripType === "roundtrip"
        ? params.get("return") || defaults.returnDate
        : null,
    tripType,
    travelClass: (params.get("class") || "economy") as TravelClass,
    adults: counts.adults,
    children: counts.children,
    infants: counts.infants,
    currency: params.get("currency") || "usd",
    market: params.get("market") || "us",
  };
}

/**
 * Build URL search params from search request
 */
export function buildSearchParams(request: {
  origin: string;
  destination: string;
  departDate: string;
  returnDate?: string | null;
  tripType: TripType;
  travelClass?: TravelClass;
  adults: number;
  children?: number;
  infants?: number;
}): URLSearchParams {
  const params = new URLSearchParams({
    from: request.origin,
    to: request.destination,
    depart: request.departDate,
    trip: request.tripType,
    adults: String(request.adults),
    children: String(request.children || 0),
    infants: String(request.infants || 0),
    class: request.travelClass || "economy",
  });

  if (request.tripType === "roundtrip" && request.returnDate) {
    params.set("return", request.returnDate);
  }

  return params;
}
