/**
 * Explore page — Google Flights-style: left sidebar with controls + destination cards, right map
 * GoFlyFinder dark + purple theme with premium interactions
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { format, addDays } from "date-fns";
import { Loader2, Navigation, Plane, SlidersHorizontal, MapPin, ArrowRight } from "lucide-react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import AirportAutocomplete from "@/components/AirportAutocomplete";
import ExploreMap from "@/components/explore/ExploreMap";
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

function formatDateRange(depart?: string, ret?: string): string {
  if (!depart) return "";
  try {
    const d = format(new Date(depart + "T00:00:00"), "d MMM");
    if (!ret) return d;
    const r = format(new Date(ret + "T00:00:00"), "d MMM");
    return `${d} – ${r}`;
  } catch {
    return depart;
  }
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
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDest, setSelectedDest] = useState<ExploreResult | null>(null);
  const [maxPrice, setMaxPrice] = useState<number>(2000);

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

  // Enrich destinations with lat/lon from airports DB
  const enrichedDestinations = useMemo(() => {
    return destinations.map(d => {
      if (d.lat && d.lon && d.destinationName) return d;
      const airport = AIRPORTS.find(a => a.code === d.destinationIata);
      if (airport) {
        return {
          ...d,
          lat: d.lat || airport.lat,
          lon: d.lon || airport.lon,
          destinationName: d.destinationName || airport.city,
          country: d.country || airport.country,
        };
      }
      return d;
    }).filter(d => d.lat && d.lon);
  }, [destinations]);

  const sortedDestinations = useMemo(() =>
    [...enrichedDestinations]
      .filter(d => d.price <= maxPrice)
      .sort((a, b) => a.price - b.price)
      .slice(0, 80),
    [enrichedDestinations, maxPrice]
  );

  const priceMax = useMemo(() => {
    if (!enrichedDestinations.length) return 2000;
    return Math.ceil(Math.max(...enrichedDestinations.map(d => d.price)) / 100) * 100;
  }, [enrichedDestinations]);

  const handleSelectDestination = useCallback((dest: ExploreResult) => {
    setSelectedDest(dest);
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

  const originAirport = useMemo(() =>
    origin ? AIRPORTS.find(a => a.code === origin.code) : null,
    [origin]
  );

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      <Header />
      <main className="flex-1 pt-16 overflow-hidden">
        <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)] overflow-hidden">
          {/* ── Left Sidebar ── */}
          <div className="w-full lg:w-[380px] xl:w-[420px] flex flex-col bg-card border-r border-border shrink-0 overflow-hidden relative z-10">
            {/* Search Controls */}
            <div className="p-4 space-y-3 border-b border-border">
              {/* Origin */}
              <div className="flex gap-2 items-end">
                <div className="flex-1 min-w-0">
                  <label className="block text-[11px] font-medium text-muted-foreground mb-1 uppercase tracking-wider">From</label>
                  <AirportAutocomplete
                    value={origin}
                    onChange={setOrigin}
                    placeholder="Select origin"
                    icon="from"
                  />
                </div>
                <Button variant="ghost" size="icon" onClick={handleUseMyLocation} className="h-10 w-10 shrink-0" title="Use my location">
                  <Navigation className="w-4 h-4" />
                </Button>
              </div>

              {/* Filter chips row */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setDateMode("flexible")}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                    dateMode === "flexible"
                      ? "bg-primary/10 text-primary border-primary/30"
                      : "border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground"
                  )}
                >
                  Flexible dates
                </button>
                <button
                  onClick={() => setDateMode("exact")}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                    dateMode === "exact"
                      ? "bg-primary/10 text-primary border-primary/30"
                      : "border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground"
                  )}
                >
                  Exact dates
                </button>
                <button
                  onClick={() => setDirectOnly(!directOnly)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                    directOnly
                      ? "bg-primary/10 text-primary border-primary/30"
                      : "border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground"
                  )}
                >
                  Direct only
                </button>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1",
                    showFilters
                      ? "bg-primary/10 text-primary border-primary/30"
                      : "border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground"
                  )}
                >
                  <SlidersHorizontal className="w-3 h-3" />
                  Filters
                </button>
              </div>

              {/* Expandable filters */}
              {(showFilters || dateMode === "flexible") && (
                <div className="space-y-3 pt-1">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px] text-muted-foreground">
                      <span>Trip length</span>
                      <span className="font-medium text-foreground">{tripLength[0]}–{tripLength[1]} days</span>
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
                  {showFilters && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[11px] text-muted-foreground">
                        <span>Max price</span>
                        <span className="font-medium text-foreground">{formatPrice(maxPrice)}</span>
                      </div>
                      <Slider
                        value={[maxPrice]}
                        onValueChange={(v) => setMaxPrice(v[0])}
                        min={50}
                        max={priceMax}
                        step={25}
                        className="w-full"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Results header */}
            <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {isLoading ? "Searching..." : `${sortedDestinations.length} destinations${origin ? ` from ${origin.display.split("(")[0].trim()}` : ""}`}
              </p>
              {!isLoading && sortedDestinations.length > 0 && (
                <p className="text-[10px] text-muted-foreground">Sorted by price</p>
              )}
            </div>

            {/* ── Destination Cards ── */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="p-3 space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="rounded-xl border border-border p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-28" />
                          <Skeleton className="h-3 w-20" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                        <Skeleton className="h-5 w-14" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : sortedDestinations.length === 0 ? (
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
                <div className="p-3 space-y-1.5">
                  {sortedDestinations.map((dest, i) => (
                    <button
                      key={dest.destinationIata}
                      onClick={() => handleSelectDestination(dest)}
                      onMouseEnter={() => setHoveredIata(dest.destinationIata)}
                      onMouseLeave={() => setHoveredIata(null)}
                      className={cn(
                        "w-full rounded-xl border transition-all text-left group",
                        hoveredIata === dest.destinationIata
                          ? "border-primary/50 bg-primary/5 shadow-md"
                          : "border-border bg-card hover:border-muted-foreground/30 hover:bg-secondary/30"
                      )}
                    >
                      <div className="p-3 flex items-center gap-3">
                        {/* Icon */}
                        <div className={cn(
                          "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                          hoveredIata === dest.destinationIata ? "bg-primary/10" : "bg-secondary"
                        )}>
                          <MapPin className={cn("w-4 h-4", hoveredIata === dest.destinationIata ? "text-primary" : "text-muted-foreground")} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-sm text-foreground truncate">
                              {dest.destinationName || dest.destinationIata}
                            </h3>
                            {i === 0 && (
                              <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-emerald-500/40 text-emerald-400 shrink-0">
                                Cheapest
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {dest.departDate && (
                              <p className="text-[11px] text-muted-foreground">
                                {formatDateRange(dest.departDate, dest.returnDate)}
                              </p>
                            )}
                            {(dest as any).transfers === 0 ? (
                              <span className="text-[10px] text-emerald-400">Direct</span>
                            ) : (dest as any).transfers !== undefined ? (
                              <span className="text-[10px] text-muted-foreground">{(dest as any).transfers} stop{(dest as any).transfers > 1 ? "s" : ""}</span>
                            ) : null}
                          </div>
                        </div>
                        <div className="text-right shrink-0 flex items-center gap-2">
                          <p className="text-base font-bold text-foreground">{formatPrice(dest.price)}</p>
                          <ArrowRight className={cn("w-4 h-4 transition-all", hoveredIata === dest.destinationIata ? "text-primary translate-x-0.5" : "text-muted-foreground/30")} />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Map ── */}
          <div className="flex-1 min-h-[420px] lg:min-h-[520px] relative overflow-hidden isolate">
            {isLoading && (
              <div className="absolute inset-0 z-[1000] bg-background/40 backdrop-blur-sm flex items-center justify-center">
                <div className="flex flex-col items-center gap-2 bg-card/90 rounded-xl px-6 py-4 border border-border">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
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
        </div>
      </main>
    </div>
  );
};

export default Explore;
