/**
 * Explore page — Google Flights-style map with price pins
 * Uses Leaflet + OpenStreetMap (no paid token)
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { format, addDays } from "date-fns";
import { MapPin, Loader2, Navigation, Filter, Plane } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import AirportAutocomplete from "@/components/AirportAutocomplete";
import ExploreMap from "@/components/ExploreMap";
import { fetchExplorePrices, type ExploreResult } from "@/lib/exploreApi";
import { detectGeo } from "@/lib/priceApi";
import { useLocale } from "@/hooks/useLocale";
import { AIRPORTS, calculateDistance, type AirportData } from "@/lib/airports";
import { cn } from "@/lib/utils";

interface AirportSelection {
  code: string;
  display: string;
}

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
  return countryAirports[0];
}

const Explore = () => {
  const navigate = useNavigate();
  const { currency, formatPrice } = useLocale();
  const [origin, setOrigin] = useState<AirportSelection | null>(null);
  const [destinations, setDestinations] = useState<ExploreResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [tripLength, setTripLength] = useState<[number, number]>([3, 14]);
  const [dateMode, setDateMode] = useState<"flexible" | "exact">("flexible");
  const [directOnly, setDirectOnly] = useState(false);
  const [hoveredIata, setHoveredIata] = useState<string | null>(null);

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
    fetchExplorePrices({
      origin: origin.code,
      currency,
      direct: directOnly,
      min_trip_duration: tripLength[0],
      max_trip_duration: tripLength[1],
      period: "month",
    })
      .then(res => {
        if (res.ok) setDestinations(res.results);
        else setDestinations([]);
      })
      .finally(() => setIsLoading(false));
  }, [origin?.code, currency, directOnly, tripLength[0], tripLength[1]]);

  const handleUseMyLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nearest = findNearestAirport(pos.coords.latitude, pos.coords.longitude);
        if (nearest) setOrigin({ code: nearest.code, display: `${nearest.city} (${nearest.code})` });
      },
      () => { /* denied */ }
    );
  }, []);

  // Enrich destinations with lat/lon from our airports DB if API didn't provide
  const enrichedDestinations = useMemo(() => {
    return destinations.map(d => {
      if (d.lat && d.lon) return d;
      const airport = AIRPORTS.find(a => a.code === d.destinationIata);
      if (airport) {
        return {
          ...d,
          lat: airport.lat,
          lon: airport.lon,
          destinationName: d.destinationName || airport.city,
          country: d.country || airport.country,
        };
      }
      return d;
    }).filter(d => d.lat && d.lon);
  }, [destinations]);

  const sortedDestinations = useMemo(() =>
    [...enrichedDestinations].sort((a, b) => a.price - b.price).slice(0, 80),
    [enrichedDestinations]
  );

  const handleSelectDestination = useCallback((dest: ExploreResult) => {
    const depart = dest.departDate || format(addDays(new Date(), 30), "yyyy-MM-dd");
    const ret = dest.returnDate || format(addDays(new Date(), 37), "yyyy-MM-dd");
    const params = new URLSearchParams({
      from: origin?.code || "",
      to: dest.destinationIata,
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

  // Find origin airport for map centering
  const originAirport = useMemo(() => 
    origin ? AIRPORTS.find(a => a.code === origin.code) : null, 
    [origin]
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 pt-20 pb-0">
        {/* Controls Panel */}
        <div className="bg-card border-b border-border px-4 py-4">
          <div className="container mx-auto max-w-7xl">
            <div className="flex flex-col lg:flex-row gap-3 items-end">
              <div className="flex-1 min-w-0 max-w-xs">
                <label className="block text-xs font-medium text-muted-foreground mb-1">From</label>
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

              {/* Date mode */}
              <div className="flex gap-2 items-center">
                <button onClick={() => setDateMode("flexible")}
                  className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                    dateMode === "flexible" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
                  )}>
                  Flexible
                </button>
                <button onClick={() => setDateMode("exact")}
                  className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                    dateMode === "exact" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
                  )}>
                  Exact dates
                </button>
              </div>

              {/* Trip length */}
              {dateMode === "flexible" && (
                <div className="flex items-center gap-3 min-w-[180px]">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{tripLength[0]}–{tripLength[1]}d</span>
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

              {/* Direct only */}
              <div className="flex items-center gap-2">
                <Switch checked={directOnly} onCheckedChange={setDirectOnly} />
                <span className="text-xs text-muted-foreground">Direct only</span>
              </div>
            </div>
          </div>
        </div>

        {/* Map + List Layout */}
        <div className="flex flex-col lg:flex-row" style={{ height: "calc(100vh - 180px)" }}>
          {/* Map */}
          <div className="flex-1 min-h-[300px] lg:min-h-0 relative">
            {isLoading && (
              <div className="absolute inset-0 z-[1000] bg-background/60 flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground">Finding destinations...</span>
                </div>
              </div>
            )}
            <ExploreMap
              destinations={sortedDestinations}
              originAirport={originAirport}
              onSelect={handleSelectDestination}
              hoveredIata={hoveredIata}
              onHover={setHoveredIata}
              formatPrice={formatPrice}
            />
          </div>

          {/* Results List */}
          <div className="w-full lg:w-80 xl:w-96 bg-card border-l border-border overflow-y-auto">
            <div className="p-3 border-b border-border">
              <p className="text-xs font-medium text-muted-foreground">
                {sortedDestinations.length} destinations {origin ? `from ${origin.code}` : ""}
              </p>
            </div>

            {sortedDestinations.length === 0 && !isLoading ? (
              <div className="p-6 text-center">
                <Plane className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground mb-1">No destinations found</p>
                <p className="text-xs text-muted-foreground">
                  {origin
                    ? "Try widening the trip window, turning off 'Direct only', or selecting a different origin."
                    : "Select an origin airport to explore."}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {sortedDestinations.map((dest, i) => (
                  <button
                    key={dest.destinationIata}
                    onClick={() => handleSelectDestination(dest)}
                    onMouseEnter={() => setHoveredIata(dest.destinationIata)}
                    onMouseLeave={() => setHoveredIata(null)}
                    className={cn(
                      "w-full p-3 text-left hover:bg-secondary/50 transition-colors",
                      hoveredIata === dest.destinationIata && "bg-secondary/50"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">
                          {dest.destinationName || dest.destinationIata}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {dest.country} · {dest.destinationIata}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-sm text-primary">{formatPrice(dest.price)}</p>
                        {i === 0 && (
                          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[9px] mt-0.5">
                            Cheapest
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Explore;
