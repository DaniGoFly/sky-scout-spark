/**
 * Explore page — Google Flights-style: left sidebar with controls + destination cards, right map
 * GoFlyFinder dark + purple theme with premium interactions
 */

import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { format, addDays } from "date-fns";
import { Loader2, Navigation, Plane, MapPin, ArrowRight, ChevronDown, ChevronUp, SlidersHorizontal, List } from "lucide-react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import AirportAutocomplete, { type QuickPickAirport } from "@/components/AirportAutocomplete";
const ExploreMap = lazy(() => import("@/components/explore/ExploreMap"));
import { fetchExplorePrices, type ExploreResult } from "@/lib/exploreApi";
// detectGeo removed — no auto-origin detection
import { useLocale } from "@/hooks/useLocale";
import { AIRPORTS, type AirportData } from "@/lib/airports";
import { findBestAirport, type LocationSource, type RankedAirport } from "@/lib/nearestAirport";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface AirportSelection {
  code: string;
  display: string;
}

type LocationConfidence = "gps" | "network" | null;

interface ExploreGeoDebug {
  source: LocationSource;
  selectedAirportCode: string | null;
  selectedAirportDistanceKm: number | null;
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
  const [geoInitDone, setGeoInitDone] = useState(false);
  const [destinations, setDestinations] = useState<ExploreResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [tripLength, setTripLength] = useState<[number, number]>([3, 14]);
  const directOnly = false;
  const [hoveredIata, setHoveredIata] = useState<string | null>(null);

  const [selectedDest, setSelectedDest] = useState<ExploreResult | null>(null);
  const [maxPrice, setMaxPrice] = useState<number>(2000);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [mobileResultsOpen, setMobileResultsOpen] = useState(false);
  const [rawUserCoords, setRawUserCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [mapUserCoords, setMapUserCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [geoDebug, setGeoDebug] = useState<ExploreGeoDebug | null>(null);
  const [geoStepMessages, setGeoStepMessages] = useState<string[]>([]);
  const [isLocating, setIsLocating] = useState(false);
  const [locationConfidence, setLocationConfidence] = useState<LocationConfidence>(null);
  const [nearbyQuickPicks, setNearbyQuickPicks] = useState<QuickPickAirport[]>([]);
  const isMobile = useIsMobile();

  const showGeoDebug = useMemo(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).has("geoDebug");
  }, []);

  const appendGeoStep = useCallback((message: string) => {
    console.log(`[GoFlyFinder][Explore] ${message}`);
    setGeoStepMessages((prev) => [...prev.slice(-9), message]);
  }, []);

  // Parse origin from URL params only (e.g. Anywhere mode from SearchForm)
  useEffect(() => {
    if (geoInitDone) return;
    setGeoInitDone(true);

    const params = new URLSearchParams(window.location.search);
    const fromCode = params.get("from");
    if (fromCode) {
      const code = fromCode.split(",")[0].toUpperCase();
      const airport = AIRPORTS.find((a) => a.code === code);
      if (airport) {
        setOrigin({ code: airport.code, display: `${airport.city} (${airport.code})` });
      }
    }
    // No auto-detection — page stays blank until user picks an origin
  }, [geoInitDone]);

  // Fetch explore data
  // Fetch explore data — only refetch when origin or currency changes
  // Trip length filtering is done client-side since the API doesn't support it
  useEffect(() => {
    if (!origin?.code) return;
    setIsLoading(true);
    fetchExplorePrices({
      origin: origin.code,
      currency,
      direct: directOnly,
      period: "month",
    })
      .then((res) => {
        if (res.ok) setDestinations(res.results);
        else setDestinations([]);
      })
      .finally(() => setIsLoading(false));
  }, [origin?.code, currency, directOnly]);

  const handleUseMyLocation = useCallback(async () => {
    if (isLocating) return;

    setIsLocating(true);
    setGeoStepMessages(["Step 1: location button clicked (unified pipeline)"]);
    setGeoStepMessages(["Step 1: location button clicked"]);
    setOrigin(null);
    setRawUserCoords(null);
    setMapUserCoords(null);
    setGeoDebug(null);
    setLocationConfidence(null);

    try {
      // Check permission state (informational only — never block flow)
      try {
        const perm = await navigator.permissions?.query({ name: "geolocation" as PermissionName });
        appendGeoStep(`Step 1b: permission state = ${perm?.state ?? "unknown"}`);
      } catch {
        appendGeoStep("Step 1b: Permissions API not supported, proceeding");
      }

      appendGeoStep("Step 2: geolocation request started");

      if (!navigator.geolocation) {
        throw new Error("Geolocation API unavailable");
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (geoPosition) => resolve(geoPosition),
          (geoError) => {
            if (geoError.code === 1) {
              reject(new Error("PERMISSION_DENIED"));
            } else if (geoError.code === 2) {
              reject(new Error("Geolocation position unavailable"));
            } else if (geoError.code === 3) {
              reject(new Error("Geolocation timeout"));
            } else {
              reject(new Error("Geolocation request failed"));
            }
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          },
        );
      });

      const coords = { lat: position.coords.latitude, lon: position.coords.longitude };
      appendGeoStep(`Step 3: geolocation success: ${coords.lat.toFixed(5)}, ${coords.lon.toFixed(5)}`);

      setRawUserCoords(coords);
      setMapUserCoords(coords);

      appendGeoStep("Step 4: airport lookup started (scored ranking)");
      const result = findBestAirport(coords.lat, coords.lon);
      if (!result) {
        throw new Error("Coordinates received but no airport found");
      }
      const { best, candidates } = result;
      appendGeoStep(
        `Step 5: best=${best.airport.code}(score=${best.score},${best.distanceKm}km) | ` +
        candidates.map(c => `${c.airport.code}:${c.score}`).join(", ")
      );

      const airportDisplay = `${best.airport.city} (${best.airport.code})`;
      setOrigin({ code: best.airport.code, display: airportDisplay });
      setLocationConfidence("gps");
      setNearbyQuickPicks(candidates.slice(0, 5).map(c => ({ code: c.airport.code, city: c.airport.city })));
      setGeoDebug({
        source: "gps",
        selectedAirportCode: best.airport.code,
        selectedAirportDistanceKm: best.distanceKm,
      });

      appendGeoStep(`Step 6: input updated: ${airportDisplay}`);
      appendGeoStep(`Step 7: map updated: ${coords.lat.toFixed(5)}, ${coords.lon.toFixed(5)}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      appendGeoStep(`Step X: GPS failed: ${message}`);

      // IP-based fallback via backend proxy (Safari-safe)
      appendGeoStep("Step 2b: trying IP fallback via backend...");
      let ipCoords: { lat: number; lon: number } | null = null;
      let ipSource = "";
      let ipCity = "";

      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || "kvhykvuvsbmcselojbcn";
        const res = await fetch(
          `https://${projectId}.supabase.co/functions/v1/ip-location`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
          }
        );
        clearTimeout(timer);

        if (res.ok) {
          const data = await res.json();
          if (typeof data.latitude === "number" && typeof data.longitude === "number") {
            ipCoords = { lat: data.latitude, lon: data.longitude };
            ipSource = data.source ?? "IP_BACKEND";
            ipCity = data.city ?? "";
            appendGeoStep(`Step 3b: backend IP success (${ipSource}): ${ipCoords.lat.toFixed(3)}, ${ipCoords.lon.toFixed(3)} (${ipCity || "?"})`);
          } else {
            appendGeoStep("Step 3b: backend returned no coordinates");
          }
        } else {
          appendGeoStep(`Step 3b: backend IP failed: HTTP ${res.status}`);
        }
      } catch (e) {
        appendGeoStep(`Step 3b: backend IP failed: ${e instanceof Error ? e.message : "timeout"}`);
      }

      if (ipCoords) {
        setRawUserCoords(ipCoords);
        setMapUserCoords(ipCoords); // Show approximate area on map
        appendGeoStep(`Step 4b: airport lookup from ${ipSource} coords (scored)`);
        const ipResult = findBestAirport(ipCoords.lat, ipCoords.lon);
        if (ipResult) {
          const { best, candidates } = ipResult;
          const airportDisplay = `${best.airport.city} (${best.airport.code})`;
          setOrigin({ code: best.airport.code, display: airportDisplay });
          setLocationConfidence("network");
          setNearbyQuickPicks(candidates.slice(0, 5).map(c => ({ code: c.airport.code, city: c.airport.city })));
          setGeoDebug({
            source: "ip-fallback",
            selectedAirportCode: best.airport.code,
            selectedAirportDistanceKm: best.distanceKm,
          });
          appendGeoStep(
            `Step 5b: auto-selected ${best.airport.code}(score=${best.score},${best.distanceKm}km) | ` +
            candidates.map(c => `${c.airport.code}:${c.score}`).join(", ")
          );
          appendGeoStep("Step 6b: input updated via IP fallback");
        } else {
          appendGeoStep("Step 5b: no airport found from IP coords");
          setGeoDebug({ source: "ip-fallback", selectedAirportCode: null, selectedAirportDistanceKm: null });
        }
      } else {
        // Both GPS and backend IP failed — silent, no error banners
        appendGeoStep("Step X: all location methods failed — user can type manually");
        setGeoDebug({ source: "gps", selectedAirportCode: null, selectedAirportDistanceKm: null });
      }
    } finally {
      setIsLocating(false);
      appendGeoStep("Step 8: loading state ended");
    }
  }, [appendGeoStep, isLocating]);

  // Enrich destinations with lat/lon from airports DB — only keep results with real price data
  const enrichedDestinations = useMemo(() => {
    return destinations
      .filter(d => d.price > 0 && d.departDate && d.returnDate)
      .map(d => {
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

  // Client-side filtering: trip length (calendar days) + max price
  const sortedDestinations = useMemo(() => {
    return [...enrichedDestinations]
      .filter(d => {
        // Price filter
        if (d.price > maxPrice) return false;
        // Trip length filter — compute calendar days between depart and return
        if (d.departDate && d.returnDate) {
          const depart = new Date(d.departDate + "T00:00:00");
          const ret = new Date(d.returnDate + "T00:00:00");
          const days = Math.round((ret.getTime() - depart.getTime()) / (1000 * 60 * 60 * 24));
          if (days < tripLength[0] || days > tripLength[1]) return false;
        }
        return true;
      })
      .sort((a, b) => a.price - b.price)
      .slice(0, 80);
  }, [enrichedDestinations, maxPrice, tripLength]);

  const priceMax = useMemo(() => {
    if (!enrichedDestinations.length) return 2000;
    return Math.ceil(Math.max(...enrichedDestinations.map(d => d.price)) / 100) * 100;
  }, [enrichedDestinations]);

  const handleSelectDestination = useCallback((dest: ExploreResult) => {
    setSelectedDest(dest);
    const hasDates = !!(dest.departDate && dest.returnDate);
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
      currency: currency.toLowerCase(),
    });
    // Mark as explore estimate so results page can show info banner
    if (!hasDates) {
      params.set("explore_from_price", String(Math.round(dest.price)));
    }
    navigate(`/flights/results?${params.toString()}`);
  }, [origin, navigate, currency]);

  const handleOriginChange = useCallback((val: AirportSelection | null) => {
    setOrigin(val);
    if (!val) setLocationConfidence(null);
  }, []);

  const originAirport = useMemo(() =>
    origin ? AIRPORTS.find(a => a.code === origin.code) : null,
    [origin]
  );

  /* ── Mobile layout ── */
  if (isMobile) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 pt-16 pb-[calc(3.5rem+env(safe-area-inset-bottom))] flex flex-col overflow-hidden min-h-0">
          {/* ── Compact top controls ── */}
          <div className="shrink-0 bg-background z-10">
            {/* Origin field */}
            <div className="px-4 pt-3 pb-2">
              <div className="flex gap-2 items-center">
                <div className="flex-1 min-w-0 relative">
                  <AirportAutocomplete
                    value={origin}
                    onChange={handleOriginChange}
                    placeholder="Where from?"
                    icon="from"
                    quickPicks={nearbyQuickPicks}
                    hint={locationConfidence === "network" && origin ? "Tap to change departure airport" : undefined}
                  />
                  {origin && (
                    <button
                      onClick={() => { setOrigin(null); setLocationConfidence(null); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-muted hover:bg-muted-foreground/20 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors text-xs"
                      aria-label="Clear origin"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <Button variant="ghost" size="icon" onClick={handleUseMyLocation} disabled={isLocating} className="h-10 w-10 shrink-0 text-muted-foreground hover:text-primary" title="Use my location">
                  {isLocating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {showGeoDebug && (
              <div className="px-4 pb-2">
                <div className="rounded-md border border-border/40 bg-muted/40 px-2 py-1.5 text-[10px] text-muted-foreground tabular-nums space-y-1">
                  <div>
                    GPS: {rawUserCoords ? `${rawUserCoords.lat.toFixed(5)}, ${rawUserCoords.lon.toFixed(5)}` : "—"}
                    {" "}| source: {geoDebug?.source?.toUpperCase() ?? "—"}
                    {" "}| airport: {geoDebug?.selectedAirportCode ?? "—"}
                  </div>
                </div>
              </div>
            )}

            {/* Filter summary + results count row */}
            <div className="px-4 pb-2 flex items-center gap-2">
              <button
                onClick={() => setMobileFiltersOpen((v) => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/40 border border-border/20 text-[11px] text-muted-foreground hover:bg-secondary/60 transition-colors"
              >
                <SlidersHorizontal className="w-3 h-3" />
                <span className="font-medium text-foreground">{tripLength[0]}–{tripLength[1]}d</span>
                <span className="text-muted-foreground/40">·</span>
                <span className="font-medium text-foreground">≤{formatPrice(maxPrice)}</span>
                <ChevronDown className={cn("w-3 h-3 transition-transform ml-0.5", mobileFiltersOpen && "rotate-180")} />
              </button>
              <div className="flex-1" />
              {!isLoading && sortedDestinations.length > 0 && (
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  <span className="text-foreground font-semibold">{sortedDestinations.length}</span> found
                </span>
              )}
            </div>

            {/* Expandable filters */}
            {mobileFiltersOpen && (
              <div className="px-4 pb-3 space-y-4 border-t border-border/10 pt-3">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>Trip length</span>
                    <span className="font-semibold text-foreground tabular-nums">{tripLength[0]}–{tripLength[1]} days</span>
                  </div>
                  <Slider value={tripLength} onValueChange={(v) => setTripLength([v[0], v[1]])} min={1} max={21} step={1} minStepsBetweenThumbs={1} className="w-full" />
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>Max price</span>
                    <span className="font-semibold text-foreground tabular-nums">{formatPrice(maxPrice)}</span>
                  </div>
                  <Slider value={[maxPrice]} onValueChange={(v) => setMaxPrice(v[0])} min={50} max={priceMax} step={25} className="w-full" />
                </div>
              </div>
            )}
          </div>

          {/* ── Map area (fills remaining space) ── */}
          <div className="flex-1 relative z-0 overflow-hidden min-h-0 explore-mobile-map-wrap">
            {isLoading && (
              <div className="absolute inset-0 z-20 bg-background/40 backdrop-blur-sm flex items-center justify-center">
                <div className="flex flex-col items-center gap-2 bg-card/90 rounded-xl px-6 py-4 border border-border">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground">Finding destinations…</span>
                </div>
              </div>
            )}
            <Suspense fallback={<div className="flex-1 bg-background/50 animate-pulse rounded-xl" />}>
              <ExploreMap
                destinations={sortedDestinations}
                originAirport={originAirport}
                userPosition={mapUserCoords}
                locationConfidence={locationConfidence}
                onSelect={handleSelectDestination}
                hoveredIata={hoveredIata}
                onHover={setHoveredIata}
                formatPrice={formatPrice}
              />
            </Suspense>

            {/* ── Floating results button ── */}
            {!isLoading && sortedDestinations.length > 0 && !mobileResultsOpen && (
              <button
                onClick={() => setMobileResultsOpen(true)}
                className="absolute bottom-[5.5rem] left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground font-semibold text-sm shadow-lg shadow-primary/30 hover:bg-primary/90 transition-colors"
              >
                <List className="w-4 h-4" />
                {sortedDestinations.length} Destinations
              </button>
            )}

            {/* ── Bottom sheet results panel ── */}
            {mobileResultsOpen && (
              <div
                className="absolute inset-0 z-30 flex flex-col"
                style={{ paddingBottom: "calc(3.5rem + env(safe-area-inset-bottom) + 0.5rem)" }}
              >
                {/* Backdrop */}
                <div className="flex-1 min-h-[60px]" onClick={() => setMobileResultsOpen(false)} />
                {/* Sheet */}
                <div className="bg-background rounded-t-2xl border-t border-border/30 max-h-[70vh] flex flex-col shadow-2xl overflow-hidden">
                  {/* Handle + header */}
                  <div className="shrink-0 pt-2 pb-3 px-4">
                    <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mx-auto mb-3" />
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-semibold text-foreground">
                        {sortedDestinations.length} destinations
                        {origin ? <span className="text-muted-foreground font-normal"> from {origin.display.split("(")[0].trim()}</span> : null}
                      </h2>
                      <button onClick={() => setMobileResultsOpen(false)} className="text-muted-foreground hover:text-foreground text-xs px-2 py-1 rounded-md hover:bg-secondary/40 transition-colors">
                        Close
                      </button>
                    </div>
                  </div>
                  {/* Scrollable list */}
                  <div
                    className="flex-1 overflow-y-auto overscroll-contain px-4 pb-6 space-y-2"
                    style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
                  >
                    {sortedDestinations.map((dest, i) => (
                      <button
                        key={dest.destinationIata}
                        onClick={() => handleSelectDestination(dest)}
                        className="w-full rounded-xl border border-border/20 bg-secondary/20 hover:border-primary/30 hover:bg-secondary/40 transition-all text-left"
                      >
                        <div className="px-4 py-3 flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <MapPin className="w-4 h-4 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-[14px] text-foreground leading-tight">
                                {dest.destinationName || dest.destinationIata}
                              </h3>
                              {i === 0 && (
                                <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-emerald-500/40 text-emerald-400 shrink-0 font-semibold">
                                  Cheapest
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              {dest.country && <span className="text-[12px] text-muted-foreground/70">{dest.country}</span>}
                              {dest.departDate && (
                                <span className="text-[11px] text-muted-foreground/50">{formatDateRange(dest.departDate, dest.returnDate)}</span>
                              )}
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-[15px] font-bold text-foreground tabular-nums">{formatPrice(dest.price)}</p>
                            <p className="text-[10px] text-muted-foreground/60">round trip</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Empty state overlay */}
            {!isLoading && sortedDestinations.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                <div className="bg-card/90 backdrop-blur rounded-2xl px-8 py-6 text-center border border-border/30 max-w-[260px]">
                  <div className="w-12 h-12 rounded-2xl bg-secondary/50 flex items-center justify-center mx-auto mb-3">
                    {!origin ? <MapPin className="w-5 h-5 text-muted-foreground" /> : <Plane className="w-5 h-5 text-muted-foreground" />}
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">
                    {!origin ? "Explore destinations" : "No destinations found"}
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {!origin ? "Choose a departure airport to explore." : "Try widening the trip length or increasing the price limit."}
                  </p>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  /* ── Desktop layout (unchanged) ── */
  return (
    <div className="min-h-screen bg-background flex flex-col overflow-hidden">
      <Header />
      <main className="flex-1 pt-16 overflow-hidden">
        <div className="lg:grid lg:grid-cols-[360px_1fr] h-[calc(100vh-64px)] overflow-hidden">
          {/* ── Left Sidebar ── */}
          <div className="explore-sidebar-panel flex flex-col relative z-10 overflow-hidden bg-background">
            {/* ── Sticky Controls ── */}
            <div className="shrink-0 explore-sidebar-controls">
              {/* FROM section */}
              <div className="px-4 pt-4 pb-3">
                <label className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground mb-2 uppercase tracking-[0.08em]">
                  <Plane className="w-3 h-3" />
                  From
                </label>
                <div className="flex gap-2 items-end">
                  <div className="flex-1 min-w-0 relative">
                    <AirportAutocomplete
                      value={origin}
                      onChange={handleOriginChange}
                      placeholder="Select origin"
                      icon="from"
                      quickPicks={nearbyQuickPicks}
                      hint={locationConfidence === "network" && origin ? "Tap to change departure airport" : undefined}
                    />
                    {origin && (
                      <button
                        onClick={() => { setOrigin(null); setLocationConfidence(null); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-muted hover:bg-muted-foreground/20 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors text-xs"
                        aria-label="Clear origin"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" onClick={handleUseMyLocation} disabled={isLocating} className="h-10 w-10 shrink-0 text-muted-foreground hover:text-primary" title="Use my location">
                    {isLocating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {showGeoDebug && (
                <div className="px-4 pb-2">
                  <div className="rounded-md border border-border/40 bg-muted/40 px-2 py-1.5 text-[10px] text-muted-foreground tabular-nums">
                    source: {geoDebug?.source?.toUpperCase() ?? "—"} | airport: {geoDebug?.selectedAirportCode ?? "—"}
                  </div>
                </div>
              )}

              <div className="h-px bg-[rgba(255,255,255,0.06)] mx-4" />

              {/* Filters */}
              <div className="px-4 py-3 space-y-4">
                <div className="space-y-1.5 w-full">
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>Trip length</span>
                    <span className="font-semibold text-foreground tabular-nums">{tripLength[0]}–{tripLength[1]} days</span>
                  </div>
                  <Slider
                    value={tripLength}
                    onValueChange={(v) => setTripLength([v[0], v[1]])}
                    min={1} max={21} step={1} minStepsBetweenThumbs={1}
                    className="w-full"
                  />
                </div>
                <div className="space-y-1.5 w-full">
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>Max price</span>
                    <span className="font-semibold text-foreground tabular-nums">{formatPrice(maxPrice)}</span>
                  </div>
                  <Slider
                    value={[maxPrice]}
                    onValueChange={(v) => setMaxPrice(v[0])}
                    min={50} max={priceMax} step={25}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="h-px bg-[rgba(255,255,255,0.06)] mx-4" />

              {/* Results header */}
              <div className="px-4 py-2.5 flex items-center justify-between">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  {isLoading ? "Searching…" : (
                    <>
                      <span className="text-foreground font-semibold">{sortedDestinations.length}</span>
                      {" "}destinations{origin ? ` from ${origin.display.split("(")[0].trim()}` : ""}
                    </>
                  )}
                </p>
                {!isLoading && sortedDestinations.length > 0 && (
                  <span className="text-[10px] text-muted-foreground/60">by price</span>
                )}
              </div>

              <div className="h-px bg-[rgba(255,255,255,0.06)]" />
            </div>

            {/* ── Scrollable Results ── */}
            <div className="flex-1 overflow-y-auto explore-sidebar-scroll">
              {isLoading ? (
                <div className="p-3 space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="rounded-xl border border-border/50 p-3 bg-secondary/20">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-28" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                        <Skeleton className="h-5 w-14" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : sortedDestinations.length === 0 && !origin ? (
                <div className="p-8 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-secondary/50 flex items-center justify-center mx-auto mb-3">
                    <MapPin className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">Explore destinations</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Choose a departure airport or use your location to explore destinations.
                  </p>
                </div>
              ) : sortedDestinations.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-secondary/50 flex items-center justify-center mx-auto mb-3">
                    <Plane className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">No destinations found</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Try widening the trip window, turning off 'Direct only', or selecting a different origin.
                  </p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {sortedDestinations.map((dest, i) => (
                    <button
                      key={dest.destinationIata}
                      onClick={() => handleSelectDestination(dest)}
                      onMouseEnter={() => setHoveredIata(dest.destinationIata)}
                      onMouseLeave={() => setHoveredIata(null)}
                      className={cn(
                        "w-full rounded-xl border transition-all duration-150 text-left explore-dest-card",
                        hoveredIata === dest.destinationIata
                          ? "border-primary/50 bg-primary/[0.07] shadow-[0_2px_12px_rgba(47,122,248,0.12)] -translate-y-px"
                          : "border-[rgba(255,255,255,0.06)] bg-transparent hover:border-[rgba(255,255,255,0.12)] hover:bg-[rgba(255,255,255,0.02)]"
                      )}
                    >
                      <div className="px-3 py-2.5 flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                          hoveredIata === dest.destinationIata ? "bg-primary/15" : "bg-[rgba(255,255,255,0.04)]"
                        )}>
                          <MapPin className={cn("w-3.5 h-3.5", hoveredIata === dest.destinationIata ? "text-primary" : "text-muted-foreground/60")} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-semibold text-[13px] text-foreground truncate leading-tight">
                              {dest.destinationName || dest.destinationIata}
                            </h3>
                            {i === 0 && (
                              <Badge variant="outline" className="text-[8px] px-1.5 py-0 h-4 border-emerald-500/40 text-emerald-400 shrink-0 font-semibold">
                                Cheapest
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {dest.departDate && (
                              <p className="text-[11px] text-muted-foreground/70">
                                {formatDateRange(dest.departDate, dest.returnDate)}
                              </p>
                            )}
                            {(dest as any).transfers === 0 ? (
                              <span className="text-[10px] text-emerald-400/80 font-medium">Direct</span>
                            ) : (dest as any).transfers !== undefined ? (
                              <span className="text-[10px] text-muted-foreground/50">{(dest as any).transfers} stop{(dest as any).transfers > 1 ? "s" : ""}</span>
                            ) : null}
                          </div>
                        </div>
                        <div className="text-right shrink-0 flex items-center gap-1.5">
                          <p className="text-sm font-bold text-foreground tabular-nums">From {formatPrice(dest.price)}</p>
                          <ArrowRight className={cn("w-3.5 h-3.5 transition-all duration-150", hoveredIata === dest.destinationIata ? "text-primary translate-x-0.5" : "text-muted-foreground/20")} />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Map ── */}
          <div className="relative z-0 overflow-hidden">
            {isLoading && (
              <div className="absolute inset-0 z-[1000] bg-background/40 backdrop-blur-sm flex items-center justify-center">
                <div className="flex flex-col items-center gap-2 bg-card/90 rounded-xl px-6 py-4 border border-border">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground">Finding destinations…</span>
                </div>
              </div>
            )}
            <Suspense fallback={<div className="flex-1 bg-background/50 animate-pulse rounded-xl" />}>
              <ExploreMap
                destinations={sortedDestinations}
                originAirport={originAirport}
                userPosition={mapUserCoords}
                locationConfidence={locationConfidence}
                onSelect={handleSelectDestination}
                hoveredIata={hoveredIata}
                onHover={setHoveredIata}
                formatPrice={formatPrice}
              />
            </Suspense>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Explore;
