/**
 * Explore page — discover cheapest destinations from origin
 * Google Flights Explore-style list view
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { format, addDays } from "date-fns";
import { Plane, MapPin, Search, Loader2, ArrowRight, Navigation } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import AirportAutocomplete from "@/components/AirportAutocomplete";
import { fetchExploreDestinations, type ExploreDestination, detectGeo } from "@/lib/priceApi";
import { useLocale } from "@/hooks/useLocale";
import { AIRPORTS, calculateDistance, type AirportData } from "@/lib/airports";
import { cn } from "@/lib/utils";

interface AirportSelection {
  code: string;
  display: string;
}

const TRIP_LENGTH_MARKS = [1, 3, 5, 7, 10, 14, 21];

function findNearestAirport(lat: number, lon: number): AirportData | null {
  let nearest: AirportData | null = null;
  let minDist = Infinity;
  for (const a of AIRPORTS) {
    const d = calculateDistance(lat, lon, a.lat, a.lon);
    if (d < minDist) { minDist = d; nearest = a; }
  }
  return nearest;
}

function getDefaultAirportByCountry(countryCode: string): AirportData | null {
  const countryAirports = AIRPORTS.filter(a => a.country === countryCode);
  if (countryAirports.length === 0) return AIRPORTS.find(a => a.code === "JFK") || null;
  // Return the first (most major) airport for the country
  return countryAirports[0];
}

const Explore = () => {
  const navigate = useNavigate();
  const { currency, formatPrice } = useLocale();
  const [origin, setOrigin] = useState<AirportSelection | null>(null);
  const [destinations, setDestinations] = useState<ExploreDestination[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [tripLength, setTripLength] = useState<[number, number]>([3, 14]);
  const [dateMode, setDateMode] = useState<"flexible" | "exact">("flexible");

  // Auto-detect origin from geo
  useEffect(() => {
    if (origin) return;
    detectGeo().then(geo => {
      if (!geo) return;
      const airport = getDefaultAirportByCountry(geo.country);
      if (airport) setOrigin({ code: airport.code, display: `${airport.city} (${airport.code})` });
    });
  }, [origin]);

  // Fetch explore data
  useEffect(() => {
    if (!origin?.code) return;
    setIsLoading(true);
    fetchExploreDestinations({ origin: origin.code, currency })
      .then(res => {
        if (res.ok) setDestinations(res.results);
        else setDestinations([]);
      })
      .finally(() => setIsLoading(false));
  }, [origin?.code, currency]);

  const handleUseMyLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nearest = findNearestAirport(pos.coords.latitude, pos.coords.longitude);
        if (nearest) setOrigin({ code: nearest.code, display: `${nearest.city} (${nearest.code})` });
      },
      () => { /* denied — no error shown */ }
    );
  }, []);

  const sortedDestinations = useMemo(() =>
    [...destinations].sort((a, b) => a.price - b.price).slice(0, 50),
    [destinations]
  );

  const handleSelectDestination = useCallback((dest: ExploreDestination) => {
    const depart = dest.depart_date || format(addDays(new Date(), 30), "yyyy-MM-dd");
    const ret = dest.return_date || format(addDays(new Date(), 37), "yyyy-MM-dd");
    const params = new URLSearchParams({
      from: origin?.code || "",
      to: dest.destination,
      depart,
      return: ret,
      adults: "1",
      children: "0",
      infants: "0",
      class: "economy",
      trip: "roundtrip",
    });
    navigate(`/flights/results?${params.toString()}`);
  }, [origin, navigate]);

  const getAirportInfo = useCallback((code: string) => AIRPORTS.find(a => a.code === code), []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 pt-20 pb-8">
        <div className="container mx-auto max-w-5xl px-4">
          {/* Hero */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              Explore Destinations
            </h1>
            <p className="text-muted-foreground">Find the cheapest flights from your city</p>
          </div>

          {/* Controls */}
          <div className="bg-card rounded-2xl border border-border p-4 md:p-6 mb-6 space-y-4">
            <div className="flex flex-col md:flex-row gap-3 items-end">
              <div className="flex-1 min-w-0">
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">From</label>
                <AirportAutocomplete
                  value={origin}
                  onChange={setOrigin}
                  placeholder="Select origin"
                  icon="from"
                />
              </div>
              <Button variant="outline" size="sm" onClick={handleUseMyLocation} className="gap-1.5 shrink-0 h-10">
                <Navigation className="w-3.5 h-3.5" />
                Use my location
              </Button>
            </div>

            {/* Date mode tabs */}
            <div className="flex gap-2">
              <button onClick={() => setDateMode("flexible")}
                className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  dateMode === "flexible" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
                )}>
                Flexible dates
              </button>
              <button onClick={() => setDateMode("exact")}
                className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  dateMode === "exact" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
                )}>
                Exact dates
              </button>
            </div>

            {/* Trip length slider (flexible mode) */}
            {dateMode === "flexible" && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Trip length: {tripLength[0]}–{tripLength[1]} days</span>
                </div>
                <Slider
                  value={tripLength}
                  onValueChange={(v) => setTripLength([v[0], v[1]])}
                  min={1}
                  max={21}
                  step={1}
                  className="w-full"
                />
              </div>
            )}
          </div>

          {/* Results */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
              <p className="text-sm text-muted-foreground">Finding cheapest destinations...</p>
            </div>
          ) : sortedDestinations.length === 0 ? (
            <div className="text-center py-16">
              <MapPin className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                {origin ? "No destinations found. Try a different origin." : "Select an origin airport to explore."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {sortedDestinations.map((dest, i) => {
                const info = getAirportInfo(dest.destination);
                return (
                  <button
                    key={dest.destination}
                    onClick={() => handleSelectDestination(dest)}
                    className="bg-card border border-border rounded-xl p-4 text-left hover:border-primary/50 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground truncate">
                          {info?.city || dest.destination}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {info?.country || ""} · {dest.destination}
                        </p>
                      </div>
                      {i === 0 && (
                        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px] shrink-0">
                          Cheapest
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-lg font-bold text-primary">{formatPrice(dest.price)}</p>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    {dest.depart_date && (
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {dest.depart_date}{dest.return_date ? ` – ${dest.return_date}` : ""}
                      </p>
                    )}
                    {dest.stops !== undefined && (
                      <p className="text-[10px] text-muted-foreground">
                        {dest.stops === 0 ? "Direct" : `${dest.stops} stop${dest.stops > 1 ? "s" : ""}`}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Explore;
