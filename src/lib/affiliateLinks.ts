/**
 * Generates Travelpayouts/Aviasales affiliate booking URLs
 * 
 * Documentation: https://support.travelpayouts.com/hc/en-us/articles/360002653097
 */

// Your Travelpayouts affiliate marker - replace with your actual marker
const AFFILIATE_MARKER = "goflyfinder";

interface FlightSearchParams {
  departureCode: string;
  arrivalCode: string;
  departDate: string; // YYYY-MM-DD format
  returnDate?: string | null; // YYYY-MM-DD format
  adults?: number;
  children?: number;
  infants?: number;
  travelClass?: "Y" | "C" | "F"; // Y=Economy, C=Business, F=First
}

interface HotelSearchParams {
  locationId?: string;
  locationName: string;
  checkIn: string; // YYYY-MM-DD format
  checkOut: string; // YYYY-MM-DD format
  adults?: number;
  children?: number;
  rooms?: number;
}

/**
 * Generates Aviasales flight search/booking URL
 * Format: https://www.aviasales.com/search/ORIGDEST{date}{date}[passengers]{class}?marker={marker}
 */
export function generateFlightAffiliateUrl(params: FlightSearchParams): string {
  const {
    departureCode,
    arrivalCode,
    departDate,
    returnDate,
    adults = 1,
    children = 0,
    infants = 0,
    travelClass = "Y",
  } = params;

  // Format dates as DDMM (e.g., "1501" for January 15)
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${day}${month}`;
  };

  const departFormatted = formatDate(departDate);
  const returnFormatted = returnDate ? formatDate(returnDate) : "";

  // Build passenger string (e.g., "1" for 1 adult, "2" for 2 adults, "21" for 2 adults + 1 child)
  let passengers = "";
  if (adults > 1 || children > 0 || infants > 0) {
    passengers = `${adults}`;
    if (children > 0) passengers += `${children}`;
    if (infants > 0) passengers += `${infants}`;
  }

  // Build the search path
  // Format: /search/JFKLAX1501[1502][passengers][class]
  let searchPath = `${departureCode}${arrivalCode}${departFormatted}`;
  if (returnFormatted) {
    searchPath += returnFormatted;
  }
  if (passengers) {
    searchPath += passengers;
  }
  
  // Travel class mapping for URL
  const classMap: Record<string, string> = {
    Y: "", // Economy is default
    C: "1", // Business
    F: "2", // First
  };
  
  if (travelClass && classMap[travelClass]) {
    searchPath += classMap[travelClass];
  }

  // Build the full URL with affiliate marker
  const baseUrl = "https://www.aviasales.com/search";
  const affiliateParams = new URLSearchParams({
    marker: AFFILIATE_MARKER,
  });

  return `${baseUrl}/${searchPath}?${affiliateParams.toString()}`;
}

/**
 * Alternative: Generate Jetradar affiliate URL (same network as Aviasales)
 */
export function generateJetradarAffiliateUrl(params: FlightSearchParams): string {
  const {
    departureCode,
    arrivalCode,
    departDate,
    returnDate,
    adults = 1,
    children = 0,
    infants = 0,
    travelClass = "Y",
  } = params;

  const searchParams = new URLSearchParams({
    origin_iata: departureCode,
    destination_iata: arrivalCode,
    depart_date: departDate,
    adults: String(adults),
    children: String(children),
    infants: String(infants),
    trip_class: travelClass === "Y" ? "0" : travelClass === "C" ? "1" : "2",
    marker: AFFILIATE_MARKER,
  });

  if (returnDate) {
    searchParams.set("return_date", returnDate);
  }

  return `https://www.jetradar.com/searches/new?${searchParams.toString()}`;
}

/**
 * Generates Hotellook hotel search/booking URL
 */
export function generateHotelAffiliateUrl(params: HotelSearchParams): string {
  const {
    locationName,
    checkIn,
    checkOut,
    adults = 2,
    children = 0,
    rooms = 1,
  } = params;

  const searchParams = new URLSearchParams({
    destination: locationName,
    checkIn: checkIn,
    checkOut: checkOut,
    adults: String(adults),
    children: String(children),
    rooms: String(rooms),
    marker: AFFILIATE_MARKER,
  });

  return `https://search.hotellook.com/?${searchParams.toString()}`;
}

/**
 * Generate a direct booking link for a specific flight result
 * This uses the Aviasales format for deep linking to specific search results
 */
export function generateFlightBookingUrl(flight: {
  departureCode: string;
  arrivalCode: string;
  departureTime: string;
  price: number;
  returnAt?: string | null;
}, searchDate: string, returnDate?: string | null): string {
  return generateFlightAffiliateUrl({
    departureCode: flight.departureCode,
    arrivalCode: flight.arrivalCode,
    departDate: searchDate,
    returnDate: returnDate,
  });
}

/**
 * Get the affiliate marker for tracking
 */
export function getAffiliateMarker(): string {
  return AFFILIATE_MARKER;
}
