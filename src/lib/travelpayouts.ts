// Travelpayouts affiliate URL builder
const AFFILIATE_MARKER = "694224";

interface FlightSearchParams {
  origin: string;
  destination: string;
  departDate: string; // YYYY-MM-DD
  returnDate?: string; // YYYY-MM-DD (optional for one-way)
  adults?: number;
}

/**
 * Build a Travelpayouts flight search URL
 * Format: https://www.aviasales.com/search/NYC1502LON2202Y1
 * Pattern: {origin}{DDMM}{destination}{DDMM (return)}Y{adults}
 */
export function buildTravelpayoutsUrl(params: FlightSearchParams): string {
  const { origin, destination, departDate, returnDate, adults = 1 } = params;

  // Convert YYYY-MM-DD to DDMM
  const formatDateForUrl = (dateStr: string): string => {
    const [, month, day] = dateStr.split("-");
    return `${day}${month}`;
  };

  const departFormatted = formatDateForUrl(departDate);
  const returnFormatted = returnDate ? formatDateForUrl(returnDate) : "";

  // Build search string: ORG{DDMM}DST{DDMM}Y{adults}
  const searchString = `${origin}${departFormatted}${destination}${returnFormatted}${adults}`;

  return `https://www.aviasales.com/search/${searchString}?marker=${AFFILIATE_MARKER}`;
}

/**
 * Log a clickout event for tracking
 */
export function logClickout(data: {
  origin: string;
  destination: string;
  price?: number;
  url: string;
}) {
  const event = {
    timestamp: new Date().toISOString(),
    ...data,
  };

  console.log("Affiliate Clickout:", event);

  // Store in localStorage for tracking
  const existing = JSON.parse(localStorage.getItem("flight_clickouts") || "[]");
  existing.push(event);
  localStorage.setItem("flight_clickouts", JSON.stringify(existing));
}
