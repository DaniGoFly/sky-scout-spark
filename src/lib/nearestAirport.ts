/**
 * Nearest Airport Finder using Haversine formula
 */
import { AIRPORTS, calculateDistance, type AirportData } from "./airports";
import { toast } from "sonner";

export interface NearestAirportResult {
  airport: AirportData;
  distanceKm: number;
}

export function findNearestAirport(lat: number, lon: number): NearestAirportResult | null {
  let nearest: AirportData | null = null;
  let minDist = Infinity;

  for (const a of AIRPORTS) {
    const d = calculateDistance(lat, lon, a.lat, a.lon);
    if (d < minDist) {
      minDist = d;
      nearest = a;
    }
  }

  if (!nearest) return null;
  return { airport: nearest, distanceKm: Math.round(minDist) };
}

/**
 * Request geolocation and return the nearest airport.
 * Shows a toast if permission is denied.
 */
export function requestNearestAirport(): Promise<NearestAirportResult | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser.");
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const result = findNearestAirport(pos.coords.latitude, pos.coords.longitude);
        resolve(result);
      },
      () => {
        toast.error("Location permission denied — please type an airport.");
        resolve(null);
      },
      { enableHighAccuracy: false, timeout: 8000 }
    );
  });
}
