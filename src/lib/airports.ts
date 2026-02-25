/**
 * Airport Database with coordinates for nearby airport calculations
 * Curated list of major + regional airports with verified lat/lon
 */

export interface AirportData {
  code: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
}

// Major + regional airports with verified coordinates
export const AIRPORTS: AirportData[] = [
  // United States
  { code: "JFK", name: "John F. Kennedy International", city: "New York", country: "US", lat: 40.6413, lon: -73.7781 },
  { code: "LGA", name: "LaGuardia", city: "New York", country: "US", lat: 40.7769, lon: -73.8740 },
  { code: "EWR", name: "Newark Liberty International", city: "Newark", country: "US", lat: 40.6895, lon: -74.1745 },
  { code: "LAX", name: "Los Angeles International", city: "Los Angeles", country: "US", lat: 33.9425, lon: -118.4081 },
  { code: "SFO", name: "San Francisco International", city: "San Francisco", country: "US", lat: 37.6213, lon: -122.3790 },
  { code: "OAK", name: "Oakland International", city: "Oakland", country: "US", lat: 37.7126, lon: -122.2197 },
  { code: "SJC", name: "San Jose International", city: "San Jose", country: "US", lat: 37.3639, lon: -121.9289 },
  { code: "ORD", name: "O'Hare International", city: "Chicago", country: "US", lat: 41.9742, lon: -87.9073 },
  { code: "MDW", name: "Midway International", city: "Chicago", country: "US", lat: 41.7868, lon: -87.7522 },
  { code: "MIA", name: "Miami International", city: "Miami", country: "US", lat: 25.7959, lon: -80.2870 },
  { code: "FLL", name: "Fort Lauderdale-Hollywood", city: "Fort Lauderdale", country: "US", lat: 26.0742, lon: -80.1506 },
  { code: "ATL", name: "Hartsfield-Jackson", city: "Atlanta", country: "US", lat: 33.6407, lon: -84.4277 },
  { code: "DFW", name: "Dallas/Fort Worth", city: "Dallas", country: "US", lat: 32.8998, lon: -97.0403 },
  { code: "DEN", name: "Denver International", city: "Denver", country: "US", lat: 39.8561, lon: -104.6737 },
  { code: "SEA", name: "Seattle-Tacoma", city: "Seattle", country: "US", lat: 47.4502, lon: -122.3088 },
  { code: "BOS", name: "Logan International", city: "Boston", country: "US", lat: 42.3656, lon: -71.0096 },
  { code: "PHL", name: "Philadelphia International", city: "Philadelphia", country: "US", lat: 39.8744, lon: -75.2424 },
  { code: "IAD", name: "Dulles International", city: "Washington DC", country: "US", lat: 38.9531, lon: -77.4565 },
  { code: "DCA", name: "Ronald Reagan National", city: "Washington DC", country: "US", lat: 38.8512, lon: -77.0402 },
  { code: "BWI", name: "Baltimore/Washington", city: "Baltimore", country: "US", lat: 39.1754, lon: -76.6684 },

  // Germany (comprehensive)
  { code: "FRA", name: "Frankfurt am Main", city: "Frankfurt", country: "DE", lat: 50.0379, lon: 8.5622 },
  { code: "MUC", name: "Franz Josef Strauß", city: "Munich", country: "DE", lat: 48.3538, lon: 11.7861 },
  { code: "BER", name: "Berlin Brandenburg", city: "Berlin", country: "DE", lat: 52.3667, lon: 13.5033 },
  { code: "DUS", name: "Düsseldorf", city: "Düsseldorf", country: "DE", lat: 51.2895, lon: 6.7668 },
  { code: "HAM", name: "Hamburg", city: "Hamburg", country: "DE", lat: 53.6304, lon: 10.0065 },
  { code: "STR", name: "Stuttgart", city: "Stuttgart", country: "DE", lat: 48.6899, lon: 9.2220 },
  { code: "CGN", name: "Cologne Bonn", city: "Cologne", country: "DE", lat: 50.8659, lon: 7.1427 },
  { code: "HAJ", name: "Hannover-Langenhagen", city: "Hannover", country: "DE", lat: 52.4611, lon: 9.6850 },
  { code: "NUE", name: "Albrecht Dürer", city: "Nuremberg", country: "DE", lat: 49.4987, lon: 11.0669 },
  { code: "LEJ", name: "Leipzig/Halle", city: "Leipzig", country: "DE", lat: 51.4324, lon: 12.2416 },
  { code: "DTM", name: "Dortmund", city: "Dortmund", country: "DE", lat: 51.5183, lon: 7.6122 },
  { code: "FMM", name: "Memmingen", city: "Memmingen", country: "DE", lat: 47.9888, lon: 10.2395 },
  { code: "KSF", name: "Kassel-Calden", city: "Kassel", country: "DE", lat: 51.4083, lon: 9.3775 },
  { code: "FDH", name: "Friedrichshafen", city: "Friedrichshafen", country: "DE", lat: 47.6713, lon: 9.5115 },
  { code: "SCN", name: "Saarbrücken", city: "Saarbrücken", country: "DE", lat: 49.2146, lon: 7.1095 },
  { code: "PAD", name: "Paderborn Lippstadt", city: "Paderborn", country: "DE", lat: 51.6141, lon: 8.6163 },
  { code: "BRE", name: "Bremen", city: "Bremen", country: "DE", lat: 53.0475, lon: 8.7867 },
  { code: "DRS", name: "Dresden", city: "Dresden", country: "DE", lat: 51.1328, lon: 13.7672 },

  // UK
  { code: "LHR", name: "Heathrow", city: "London", country: "GB", lat: 51.4700, lon: -0.4543 },
  { code: "LGW", name: "Gatwick", city: "London", country: "GB", lat: 51.1537, lon: -0.1821 },
  { code: "STN", name: "Stansted", city: "London", country: "GB", lat: 51.8850, lon: 0.2350 },
  { code: "LTN", name: "Luton", city: "London", country: "GB", lat: 51.8747, lon: -0.3683 },
  { code: "MAN", name: "Manchester", city: "Manchester", country: "GB", lat: 53.3537, lon: -2.2750 },
  { code: "EDI", name: "Edinburgh", city: "Edinburgh", country: "GB", lat: 55.9508, lon: -3.3615 },
  { code: "BHX", name: "Birmingham", city: "Birmingham", country: "GB", lat: 52.4539, lon: -1.7480 },
  { code: "BRS", name: "Bristol", city: "Bristol", country: "GB", lat: 51.3827, lon: -2.7190 },

  // France
  { code: "CDG", name: "Charles de Gaulle", city: "Paris", country: "FR", lat: 49.0097, lon: 2.5479 },
  { code: "ORY", name: "Orly", city: "Paris", country: "FR", lat: 48.7262, lon: 2.3652 },
  { code: "NCE", name: "Nice Côte d'Azur", city: "Nice", country: "FR", lat: 43.6584, lon: 7.2159 },
  { code: "LYS", name: "Lyon-Saint Exupéry", city: "Lyon", country: "FR", lat: 45.7256, lon: 5.0811 },
  { code: "MRS", name: "Marseille Provence", city: "Marseille", country: "FR", lat: 43.4393, lon: 5.2214 },
  { code: "TLS", name: "Toulouse-Blagnac", city: "Toulouse", country: "FR", lat: 43.6293, lon: 1.3638 },
  { code: "SXB", name: "Strasbourg", city: "Strasbourg", country: "FR", lat: 48.5383, lon: 7.6282 },
  { code: "BSL", name: "EuroAirport Basel-Mulhouse", city: "Basel/Mulhouse", country: "FR", lat: 47.5896, lon: 7.5299 },

  // Switzerland
  { code: "ZRH", name: "Zurich", city: "Zurich", country: "CH", lat: 47.4647, lon: 8.5492 },
  { code: "GVA", name: "Geneva", city: "Geneva", country: "CH", lat: 46.2370, lon: 6.1092 },
  { code: "BRN", name: "Bern", city: "Bern", country: "CH", lat: 46.9141, lon: 7.4971 },

  // Austria
  { code: "VIE", name: "Vienna", city: "Vienna", country: "AT", lat: 48.1103, lon: 16.5697 },
  { code: "SZG", name: "Salzburg", city: "Salzburg", country: "AT", lat: 47.7933, lon: 13.0043 },
  { code: "INN", name: "Innsbruck", city: "Innsbruck", country: "AT", lat: 47.2602, lon: 11.3440 },
  { code: "GRZ", name: "Graz", city: "Graz", country: "AT", lat: 46.9911, lon: 15.4396 },

  // Netherlands / Belgium / Luxembourg
  { code: "AMS", name: "Schiphol", city: "Amsterdam", country: "NL", lat: 52.3105, lon: 4.7683 },
  { code: "EIN", name: "Eindhoven", city: "Eindhoven", country: "NL", lat: 51.4501, lon: 5.3745 },
  { code: "BRU", name: "Brussels", city: "Brussels", country: "BE", lat: 50.9014, lon: 4.4844 },
  { code: "CRL", name: "Brussels South Charleroi", city: "Charleroi", country: "BE", lat: 50.4592, lon: 4.4538 },
  { code: "LUX", name: "Luxembourg-Findel", city: "Luxembourg", country: "LU", lat: 49.6233, lon: 6.2044 },

  // Spain
  { code: "MAD", name: "Barajas", city: "Madrid", country: "ES", lat: 40.4983, lon: -3.5676 },
  { code: "BCN", name: "El Prat", city: "Barcelona", country: "ES", lat: 41.2971, lon: 2.0785 },
  { code: "AGP", name: "Málaga-Costa del Sol", city: "Málaga", country: "ES", lat: 36.6749, lon: -4.4991 },
  { code: "PMI", name: "Palma de Mallorca", city: "Palma", country: "ES", lat: 39.5517, lon: 2.7388 },

  // Italy
  { code: "FCO", name: "Fiumicino", city: "Rome", country: "IT", lat: 41.8003, lon: 12.2389 },
  { code: "MXP", name: "Malpensa", city: "Milan", country: "IT", lat: 45.6306, lon: 8.7281 },
  { code: "BGY", name: "Orio al Serio", city: "Bergamo", country: "IT", lat: 45.6739, lon: 9.7042 },
  { code: "VCE", name: "Marco Polo", city: "Venice", country: "IT", lat: 45.5053, lon: 12.3519 },
  { code: "NAP", name: "Capodichino", city: "Naples", country: "IT", lat: 40.8860, lon: 14.2908 },

  // Scandinavia
  { code: "CPH", name: "Copenhagen", city: "Copenhagen", country: "DK", lat: 55.6180, lon: 12.6508 },
  { code: "OSL", name: "Gardermoen", city: "Oslo", country: "NO", lat: 60.1939, lon: 11.1004 },
  { code: "BGO", name: "Bergen Flesland", city: "Bergen", country: "NO", lat: 60.2934, lon: 5.2181 },
  { code: "ARN", name: "Arlanda", city: "Stockholm", country: "SE", lat: 59.6519, lon: 17.9186 },
  { code: "GOT", name: "Gothenburg Landvetter", city: "Gothenburg", country: "SE", lat: 57.6628, lon: 12.2798 },
  { code: "HEL", name: "Helsinki-Vantaa", city: "Helsinki", country: "FI", lat: 60.3172, lon: 24.9633 },

  // Eastern Europe
  { code: "WAW", name: "Chopin", city: "Warsaw", country: "PL", lat: 52.1657, lon: 20.9671 },
  { code: "KRK", name: "John Paul II", city: "Krakow", country: "PL", lat: 50.0777, lon: 19.7848 },
  { code: "PRG", name: "Václav Havel", city: "Prague", country: "CZ", lat: 50.1008, lon: 14.2600 },
  { code: "BUD", name: "Ferenc Liszt", city: "Budapest", country: "HU", lat: 47.4398, lon: 19.2612 },
  { code: "OTP", name: "Henri Coandă", city: "Bucharest", country: "RO", lat: 44.5711, lon: 26.0850 },

  // Ireland / Portugal / Greece / Turkey
  { code: "DUB", name: "Dublin", city: "Dublin", country: "IE", lat: 53.4264, lon: -6.2499 },
  { code: "LIS", name: "Lisbon Portela", city: "Lisbon", country: "PT", lat: 38.7756, lon: -9.1354 },
  { code: "OPO", name: "Francisco Sá Carneiro", city: "Porto", country: "PT", lat: 41.2481, lon: -8.6814 },
  { code: "ATH", name: "Eleftherios Venizelos", city: "Athens", country: "GR", lat: 37.9364, lon: 23.9445 },
  { code: "IST", name: "Istanbul", city: "Istanbul", country: "TR", lat: 41.2753, lon: 28.7519 },
  { code: "SAW", name: "Sabiha Gökçen", city: "Istanbul", country: "TR", lat: 40.8986, lon: 29.3092 },
  { code: "AYT", name: "Antalya", city: "Antalya", country: "TR", lat: 36.8987, lon: 30.8005 },

  // Middle East
  { code: "DXB", name: "Dubai International", city: "Dubai", country: "AE", lat: 25.2532, lon: 55.3657 },
  { code: "AUH", name: "Abu Dhabi International", city: "Abu Dhabi", country: "AE", lat: 24.4330, lon: 54.6511 },
  { code: "DOH", name: "Hamad International", city: "Doha", country: "QA", lat: 25.2731, lon: 51.6081 },
  { code: "TLV", name: "Ben Gurion", city: "Tel Aviv", country: "IL", lat: 32.0055, lon: 34.8854 },

  // Asia
  { code: "NRT", name: "Narita", city: "Tokyo", country: "JP", lat: 35.7720, lon: 140.3929 },
  { code: "HND", name: "Haneda", city: "Tokyo", country: "JP", lat: 35.5494, lon: 139.7798 },
  { code: "KIX", name: "Kansai", city: "Osaka", country: "JP", lat: 34.4347, lon: 135.2441 },
  { code: "ICN", name: "Incheon", city: "Seoul", country: "KR", lat: 37.4602, lon: 126.4407 },
  { code: "HKG", name: "Hong Kong", city: "Hong Kong", country: "HK", lat: 22.3080, lon: 113.9185 },
  { code: "SIN", name: "Changi", city: "Singapore", country: "SG", lat: 1.3644, lon: 103.9915 },
  { code: "BKK", name: "Suvarnabhumi", city: "Bangkok", country: "TH", lat: 13.6900, lon: 100.7501 },
  { code: "KUL", name: "Kuala Lumpur", city: "Kuala Lumpur", country: "MY", lat: 2.7456, lon: 101.7072 },
  { code: "DEL", name: "Indira Gandhi", city: "New Delhi", country: "IN", lat: 28.5562, lon: 77.1000 },
  { code: "BOM", name: "Chhatrapati Shivaji", city: "Mumbai", country: "IN", lat: 19.0896, lon: 72.8656 },
  { code: "PEK", name: "Beijing Capital", city: "Beijing", country: "CN", lat: 40.0799, lon: 116.6031 },
  { code: "PVG", name: "Pudong", city: "Shanghai", country: "CN", lat: 31.1443, lon: 121.8083 },
  { code: "SHA", name: "Hongqiao", city: "Shanghai", country: "CN", lat: 31.1979, lon: 121.3363 },
  { code: "CAN", name: "Baiyun", city: "Guangzhou", country: "CN", lat: 23.3959, lon: 113.3080 },

  // Australia & Oceania
  { code: "SYD", name: "Sydney Kingsford Smith", city: "Sydney", country: "AU", lat: -33.9399, lon: 151.1753 },
  { code: "MEL", name: "Melbourne Tullamarine", city: "Melbourne", country: "AU", lat: -37.6690, lon: 144.8410 },
  { code: "BNE", name: "Brisbane", city: "Brisbane", country: "AU", lat: -27.3942, lon: 153.1218 },
  { code: "AKL", name: "Auckland", city: "Auckland", country: "NZ", lat: -37.0082, lon: 174.7850 },

  // Canada
  { code: "YYZ", name: "Toronto Pearson", city: "Toronto", country: "CA", lat: 43.6777, lon: -79.6248 },
  { code: "YUL", name: "Montréal-Trudeau", city: "Montreal", country: "CA", lat: 45.4706, lon: -73.7408 },
  { code: "YVR", name: "Vancouver", city: "Vancouver", country: "CA", lat: 49.1967, lon: -123.1815 },
  { code: "YYC", name: "Calgary", city: "Calgary", country: "CA", lat: 51.1215, lon: -114.0076 },

  // South America
  { code: "GRU", name: "São Paulo-Guarulhos", city: "São Paulo", country: "BR", lat: -23.4356, lon: -46.4731 },
  { code: "GIG", name: "Galeão", city: "Rio de Janeiro", country: "BR", lat: -22.8099, lon: -43.2505 },
  { code: "EZE", name: "Ministro Pistarini", city: "Buenos Aires", country: "AR", lat: -34.8222, lon: -58.5358 },
  { code: "SCL", name: "Arturo Merino Benítez", city: "Santiago", country: "CL", lat: -33.3930, lon: -70.7858 },
  { code: "BOG", name: "El Dorado", city: "Bogotá", country: "CO", lat: 4.7016, lon: -74.1469 },
  { code: "LIM", name: "Jorge Chávez", city: "Lima", country: "PE", lat: -12.0219, lon: -77.1143 },
  { code: "MEX", name: "Benito Juárez", city: "Mexico City", country: "MX", lat: 19.4363, lon: -99.0721 },
  { code: "CUN", name: "Cancún", city: "Cancún", country: "MX", lat: 21.0365, lon: -86.8771 },

  // Africa
  { code: "JNB", name: "O.R. Tambo", city: "Johannesburg", country: "ZA", lat: -26.1392, lon: 28.2460 },
  { code: "CPT", name: "Cape Town", city: "Cape Town", country: "ZA", lat: -33.9715, lon: 18.6021 },
  { code: "CAI", name: "Cairo", city: "Cairo", country: "EG", lat: 30.1219, lon: 31.4056 },
  { code: "CMN", name: "Mohammed V", city: "Casablanca", country: "MA", lat: 33.3675, lon: -7.5898 },
  { code: "NBO", name: "Jomo Kenyatta", city: "Nairobi", country: "KE", lat: -1.3192, lon: 36.9278 },
  { code: "ADD", name: "Bole", city: "Addis Ababa", country: "ET", lat: 8.9779, lon: 38.7993 },
];

/**
 * Calculate distance between two points using Haversine formula
 * @returns Distance in kilometers
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Find nearby airports within a given radius from an airport code
 */
export function findNearbyAirports(airportCode: string, radiusKm: number = 150): string[] {
  const airport = AIRPORTS.find(a => a.code.toUpperCase() === airportCode.toUpperCase());
  if (!airport) return [];

  return AIRPORTS
    .filter(a => {
      if (a.code === airport.code) return false;
      return calculateDistance(airport.lat, airport.lon, a.lat, a.lon) <= radiusKm;
    })
    .sort((a, b) =>
      calculateDistance(airport.lat, airport.lon, a.lat, a.lon) -
      calculateDistance(airport.lat, airport.lon, b.lat, b.lon)
    )
    .map(a => a.code);
}

/**
 * Get airport data by IATA code
 */
export function getAirportByCode(code: string): AirportData | undefined {
  return AIRPORTS.find(a => a.code.toUpperCase() === code.toUpperCase());
}

/**
 * Get all airports in a city
 */
export function getAirportsInCity(cityName: string): AirportData[] {
  const normalizedCity = cityName.toLowerCase().trim();
  return AIRPORTS.filter(a => a.city.toLowerCase() === normalizedCity);
}

/**
 * Pre-computed nearby airport mappings for common cities
 */
export const NEARBY_AIRPORT_MAPPINGS: Record<string, string[]> = {
  "JFK": ["LGA", "EWR"], "LGA": ["JFK", "EWR"], "EWR": ["JFK", "LGA"],
  "SFO": ["OAK", "SJC"], "OAK": ["SFO", "SJC"], "SJC": ["SFO", "OAK"],
  "ORD": ["MDW"], "MDW": ["ORD"],
  "MIA": ["FLL"], "FLL": ["MIA"],
  "IAD": ["DCA", "BWI"], "DCA": ["IAD", "BWI"], "BWI": ["IAD", "DCA"],
  "LHR": ["LGW", "STN", "LTN"], "LGW": ["LHR", "STN", "LTN"],
  "STN": ["LHR", "LGW", "LTN"], "LTN": ["LHR", "LGW", "STN"],
  "CDG": ["ORY"], "ORY": ["CDG"],
  "NRT": ["HND"], "HND": ["NRT"],
  "MXP": ["BGY"], "BGY": ["MXP"],
  "PVG": ["SHA"], "SHA": ["PVG"],
  "IST": ["SAW"], "SAW": ["IST"],
};

/**
 * Get nearby airports, using pre-computed mappings first, then distance calculation
 */
export function getNearbyAirports(airportCode: string): string[] {
  const code = airportCode.toUpperCase();
  if (NEARBY_AIRPORT_MAPPINGS[code]) {
    return NEARBY_AIRPORT_MAPPINGS[code];
  }
  return findNearbyAirports(code, 120);
}

/**
 * Find airports within radius from arbitrary coordinates (lat/lon).
 * Includes debug logging for development verification.
 */
export function getAirportsInRadius(lat: number, lon: number, radiusKm: number): AirportData[] {
  const withDist = AIRPORTS.map(a => ({
    airport: a,
    dist: calculateDistance(lat, lon, a.lat, a.lon),
  }));

  withDist.sort((a, b) => a.dist - b.dist);

  // Debug: log top 10 nearest for verification (dev only)
  if (typeof window !== "undefined" && (window as any).__NEARBY_DEBUG__) {
    console.log(
      `[NearbyAirports] lat=${lat.toFixed(4)} lon=${lon.toFixed(4)} radius=${radiusKm}km`,
      "\nTop 10:",
      withDist.slice(0, 10).map(w => `${w.airport.code} (${w.airport.city}) ${Math.round(w.dist)}km`)
    );
  }

  return withDist
    .filter(w => w.dist <= radiusKm)
    .map(w => w.airport);
}
