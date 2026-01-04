export interface Flight {
  id: number;
  airline: string;
  airlineLogo: string;
  departureTime: string;
  arrivalTime: string;
  departureCode: string;
  arrivalCode: string;
  duration: string;
  stops: string;
  stopsCount: number;
  price: number;
  deepLink: string;
  featured: boolean;
}

const AIRLINES = [
  { name: "British Airways", logo: "https://logo.clearbit.com/britishairways.com", basePrice: 450 },
  { name: "Delta Airlines", logo: "https://logo.clearbit.com/delta.com", basePrice: 380 },
  { name: "Virgin Atlantic", logo: "https://logo.clearbit.com/virginatlantic.com", basePrice: 520 },
  { name: "American Airlines", logo: "https://logo.clearbit.com/aa.com", basePrice: 420 },
  { name: "United Airlines", logo: "https://logo.clearbit.com/united.com", basePrice: 400 },
  { name: "Lufthansa", logo: "https://logo.clearbit.com/lufthansa.com", basePrice: 480 },
];

const DEPARTURE_TIMES = ["06:30", "08:15", "10:45", "12:30", "14:20", "16:00", "18:45", "20:30", "22:15"];

const DURATIONS = [
  { duration: "7h 15m", minutes: 435 },
  { duration: "7h 45m", minutes: 465 },
  { duration: "8h 10m", minutes: 490 },
  { duration: "8h 30m", minutes: 510 },
  { duration: "9h 15m", minutes: 555 },
  { duration: "10h 30m", minutes: 630 },
  { duration: "12h 45m", minutes: 765 },
];

const STOPS = [
  { label: "Direct", count: 0 },
  { label: "1 stop", count: 1 },
  { label: "2 stops", count: 2 },
];

function seededRandom(seed: number): () => number {
  return function() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

function addMinutes(time: string, minutes: number): string {
  const [hours, mins] = time.split(":").map(Number);
  const totalMins = hours * 60 + mins + minutes;
  const newHours = Math.floor(totalMins / 60) % 24;
  const newMins = totalMins % 60;
  return `${String(newHours).padStart(2, "0")}:${String(newMins).padStart(2, "0")}`;
}

function getNextDay(arrivalTime: string, departureTime: string): string {
  const [arrHours] = arrivalTime.split(":").map(Number);
  const [depHours] = departureTime.split(":").map(Number);
  if (arrHours < depHours) {
    return "+1";
  }
  return "";
}

export function generateMockFlights(params: {
  from: string;
  to: string;
  depart: string;
  adults: number;
}): Flight[] {
  const seed = params.from.charCodeAt(0) + params.to.charCodeAt(0) + 
               new Date(params.depart).getTime() % 10000;
  const random = seededRandom(seed);
  
  const numFlights = 8 + Math.floor(random() * 5);
  const flights: Flight[] = [];

  for (let i = 0; i < numFlights; i++) {
    const airline = AIRLINES[Math.floor(random() * AIRLINES.length)];
    const departureTime = DEPARTURE_TIMES[Math.floor(random() * DEPARTURE_TIMES.length)];
    const durationInfo = DURATIONS[Math.floor(random() * DURATIONS.length)];
    const stopsInfo = STOPS[Math.floor(random() * STOPS.length)];
    
    // Add time for stops
    const totalMinutes = durationInfo.minutes + (stopsInfo.count * 90);
    const arrivalTime = addMinutes(departureTime, totalMinutes);
    
    // Price variation based on time, stops, and passengers
    const priceVariation = Math.floor(random() * 200) - 100;
    const stopsDiscount = stopsInfo.count * 50;
    const basePrice = airline.basePrice + priceVariation - stopsDiscount;
    const totalPrice = Math.max(200, basePrice) * params.adults;

    const flight: Flight = {
      id: i + 1,
      airline: airline.name,
      airlineLogo: airline.logo,
      departureTime,
      arrivalTime: arrivalTime + getNextDay(arrivalTime, departureTime),
      departureCode: params.from.toUpperCase().substring(0, 3),
      arrivalCode: params.to.toUpperCase().substring(0, 3),
      duration: stopsInfo.count > 0 
        ? `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`
        : durationInfo.duration,
      stops: stopsInfo.label,
      stopsCount: stopsInfo.count,
      price: totalPrice,
      deepLink: `https://tpo.lv/flight/${params.from}-${params.to}/${params.depart}/${i + 1}`,
      featured: i === 0 || (i === 2 && random() > 0.5),
    };

    flights.push(flight);
  }

  // Sort by price initially
  return flights.sort((a, b) => a.price - b.price);
}

export function sortFlights(flights: Flight[], sortBy: "best" | "cheapest" | "fastest"): Flight[] {
  const sorted = [...flights];
  
  switch (sortBy) {
    case "cheapest":
      return sorted.sort((a, b) => a.price - b.price);
    case "fastest":
      return sorted.sort((a, b) => {
        const aDuration = parseInt(a.duration.split("h")[0]) * 60 + parseInt(a.duration.split("h")[1]);
        const bDuration = parseInt(b.duration.split("h")[0]) * 60 + parseInt(b.duration.split("h")[1]);
        return aDuration - bDuration;
      });
    case "best":
    default:
      // Best = combination of price and convenience
      return sorted.sort((a, b) => {
        const aScore = a.price + (a.stopsCount * 100);
        const bScore = b.price + (b.stopsCount * 100);
        return aScore - bScore;
      });
  }
}

export function filterFlights(
  flights: Flight[],
  filters: {
    stops: string[];
    airlines: string[];
    priceRange: [number, number];
    departureTime: string[];
  }
): Flight[] {
  return flights.filter((flight) => {
    // Filter by stops
    if (filters.stops.length > 0) {
      const matchesStops = filters.stops.some((stop) => {
        if (stop === "direct") return flight.stopsCount === 0;
        if (stop === "1stop") return flight.stopsCount === 1;
        if (stop === "2stops") return flight.stopsCount >= 2;
        return true;
      });
      if (!matchesStops) return false;
    }

    // Filter by airlines
    if (filters.airlines.length > 0 && !filters.airlines.includes(flight.airline)) {
      return false;
    }

    // Filter by price range
    if (flight.price < filters.priceRange[0] || flight.price > filters.priceRange[1]) {
      return false;
    }

    // Filter by departure time
    if (filters.departureTime.length > 0) {
      const hour = parseInt(flight.departureTime.split(":")[0]);
      const matchesTime = filters.departureTime.some((time) => {
        if (time === "morning") return hour >= 6 && hour < 12;
        if (time === "afternoon") return hour >= 12 && hour < 18;
        if (time === "evening") return hour >= 18 && hour < 24;
        if (time === "night") return hour >= 0 && hour < 6;
        return true;
      });
      if (!matchesTime) return false;
    }

    return true;
  });
}
