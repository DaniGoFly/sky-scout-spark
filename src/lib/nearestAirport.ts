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
 * Handle geolocation error with specific messages per error code.
 */
function handleGeoError(err: GeolocationPositionError): void {
  console.warn("[GoFlyFinder] Geolocation error:", err.code, err.message);
  switch (err.code) {
    case err.PERMISSION_DENIED:
      toast.error("Location permission denied — please type an airport.");
      break;
    case err.POSITION_UNAVAILABLE:
      toast.error("Location unavailable — please type an airport.");
      break;
    case err.TIMEOUT:
      toast.error("Location request timed out — please try again or type an airport.");
      break;
    default:
      toast.error("Could not get your location — please type an airport.");
  }
}

/**
 * Request geolocation and return the nearest airport.
 * Uses getCurrentPosition directly (no navigator.permissions check)
 * for maximum mobile Safari compatibility.
 */
export function requestNearestAirport(): Promise<NearestAirportResult | null> {
  return new Promise((resolve) => {
    console.log("[GoFlyFinder] Use my location tapped");

    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser.");
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        console.log("[GoFlyFinder] Coordinates received:", pos.coords.latitude, pos.coords.longitude);
        const result = findNearestAirport(pos.coords.latitude, pos.coords.longitude);
        if (result) {
          console.log("[GoFlyFinder] Nearest airport found:", result.airport.code, result.distanceKm, "km");
        } else {
          console.warn("[GoFlyFinder] No nearby airport found for coordinates");
          toast.error("We got your location, but couldn't find a nearby airport.");
        }
        resolve(result);
      },
      (err) => {
        handleGeoError(err);
        resolve(null);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 300000 }
    );
  });
}
