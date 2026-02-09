import { useState, useEffect, useMemo, useCallback, useRef, memo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, AlertCircle, Plane, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import FlightFilters, { FilterState } from "./FlightFilters";
import FlightSortTabs from "./FlightSortTabs";
import CompactSearchBar from "./CompactSearchBar";
import FlightCard from "./SkyscannerFlightCard";
import FlightResultsErrorBoundary from "./FlightResultsErrorBoundary";
import FlightResultsSkeleton from "./FlightResultsSkeleton";
import ActiveFilterChips from "./ActiveFilterChips";
import MobileFiltersDrawer from "./MobileFiltersDrawer";
import { useLiveFlightSearch } from "@/hooks/useLiveFlightSearch";
import { getAirlineName } from "@/lib/flightNormalizer";
import { enrichFlights, type EnrichedFlight } from "@/lib/flightEnrichment";
import { useLocale } from "@/hooks/useLocale";
import { useIsMobile } from "@/hooks/use-mobile";

const DEFAULT_FILTERS: FilterState = {
  stops: [],
  airlines: [],
  priceRange: [0, 10000],
  departureTime: [],
  directOnly: false,
};

const MAX_DISPLAY = 25;

const MemoizedSortTabs = memo(FlightSortTabs);
const MemoizedActiveChips = memo(ActiveFilterChips);
const MemoizedMobileDrawer = memo(MobileFiltersDrawer);

function parseDepartureHour(timeStr: string): number | null {
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
  if (!match) return null;
  let hour = parseInt(match[1], 10);
  const ampm = match[3]?.toUpperCase();
  if (ampm === "PM" && hour !== 12) hour += 12;
  if (ampm === "AM" && hour === 12) hour = 0;
  return hour;
}

const LiveFlightResults = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { formatDate, currency } = useLocale();
  const isMobile = useIsMobile();
  const {
    flights: rawFlights, status, error, isSearching, searchFlights, cancelSearch,
  } = useLiveFlightSearch();

  const [sortBy, setSortBy] = useState<"best" | "cheapest" | "fastest">("best");
  const [filters, setFilters] = useState<FilterState>({ ...DEFAULT_FILTERS });
  const prevSearchKeyRef = useRef<string>("");

  const from = searchParams.get("from") || searchParams.get("origin") || "";
  const to = searchParams.get("to") || searchParams.get("destination") || "";
  const depart = searchParams.get("depart") || "";
  const returnDate = searchParams.get("return") || "";
  const adults = Number(searchParams.get("adults")) || 1;
  const children = Number(searchParams.get("children")) || 0;
  const infants = Number(searchParams.get("infants")) || 0;
  const tripType = searchParams.get("trip") || "roundtrip";
  const tripClass = searchParams.get("class") || "economy";
  const isRoundtrip = tripType === "roundtrip";

  const searchKey = useMemo(
    () => [from, to, depart, returnDate, adults, children, infants, tripType, tripClass, currency].join("|"),
    [from, to, depart, returnDate, adults, children, infants, tripType, tripClass, currency]
  );

  useEffect(() => {
    if (!from || !to || !depart) return;
    if (searchKey === prevSearchKeyRef.current) return;
    prevSearchKeyRef.current = searchKey;
    cancelSearch();
    setFilters({ ...DEFAULT_FILTERS });
    setSortBy("best");
    searchFlights({
      origin: from.toUpperCase(),
      destination: to.toUpperCase(),
      departDate: depart,
      returnDate: isRoundtrip ? returnDate : undefined,
      adults: adults + children + infants,
      currency: currency,
      sort: "best",
      limit: 50,
    });
  }, [searchKey, from, to, depart, returnDate, adults, children, infants, tripType, currency, isRoundtrip, searchFlights, cancelSearch]);

  // ── Step 1: Enrich raw flights with canonical per-direction stop data ──
  const enrichedFlights = useMemo<EnrichedFlight[]>(() => {
    if (!rawFlights.length) return [];
    return enrichFlights(rawFlights, from, to, isRoundtrip);
  }, [rawFlights, from, to, isRoundtrip]);

  const actualPriceRange = useMemo((): [number, number] => {
    if (!enrichedFlights.length) return [0, 10000];
    const prices = enrichedFlights.map((f) => f.price?.amount).filter((p) => p > 0 && Number.isFinite(p));
    if (!prices.length) return [0, 10000];
    const min = Math.floor(Math.min(...prices) / 25) * 25;
    const max = Math.ceil(Math.max(...prices) / 25) * 25;
    return [min, Math.max(max, min + 100)];
  }, [enrichedFlights]);

  /** Dominant currency from the API results */
  const flightsCurrency = useMemo(() => {
    if (!enrichedFlights.length) return undefined;
    return enrichedFlights[0]?.price?.currency || undefined;
  }, [enrichedFlights]);

  // ── Step 2: Filter using enriched canonical fields ──
  const filteredFlights = useMemo(() => {
    let result = enrichedFlights;

    // Direct-only: uses the canonical isDirectItinerary computed from segments
    if (filters.directOnly) {
      result = result.filter((f) => f.isDirectItinerary);
    } else if (filters.stops.length > 0) {
      result = result.filter((flight) => {
        // Use the maximum of outbound/return stops for category matching
        const maxStops = Math.max(flight.outboundStopsTotal, flight.returnStopsTotal);
        return filters.stops.some((stop) => {
          if (stop === "direct") return flight.isDirectItinerary;
          if (stop === "1stop") return maxStops === 1;
          if (stop === "2stops") return maxStops >= 2;
          return true;
        });
      });
    }

    if (filters.airlines.length > 0) {
      result = result.filter((flight) => {
        const flightAirline = getAirlineName(flight.airlines?.[0] || "");
        return filters.airlines.includes(flightAirline);
      });
    }

    if (filters.priceRange[0] > 0 || filters.priceRange[1] < 10000) {
      result = result.filter((flight) => flight.price.amount >= filters.priceRange[0] && flight.price.amount <= filters.priceRange[1]);
    }

    if (filters.departureTime.length > 0) {
      result = result.filter((flight) => {
        if (!flight.departureTime) return true;
        const hour = parseDepartureHour(flight.departureTime);
        if (hour === null) return true;
        return filters.departureTime.some((time) => {
          if (time === "morning") return hour >= 6 && hour < 12;
          if (time === "afternoon") return hour >= 12 && hour < 18;
          if (time === "evening") return hour >= 18 && hour < 24;
          if (time === "night") return hour >= 0 && hour < 6;
          return true;
        });
      });
    }

    return result;
  }, [enrichedFlights, filters]);

  // ── Step 3: Sort ──
  const sortedFlights = useMemo(() => {
    const sorted = [...filteredFlights];
    switch (sortBy) {
      case "cheapest": sorted.sort((a, b) => a.price.amount - b.price.amount); break;
      case "fastest": sorted.sort((a, b) => a.durationMinutes - b.durationMinutes); break;
      case "best": default:
        sorted.sort((a, b) => {
          const scoreA = a.price.amount * 0.6 + a.durationMinutes * 0.3 + a.outboundStopsTotal * 100;
          const scoreB = b.price.amount * 0.6 + b.durationMinutes * 0.3 + b.outboundStopsTotal * 100;
          return scoreA - scoreB;
        }); break;
    }
    return sorted.slice(0, MAX_DISPLAY);
  }, [filteredFlights, sortBy]);

  const handleSortChange = useCallback((s: "best" | "cheapest" | "fastest") => { setSortBy(s); }, []);
  const handleFiltersChange = useCallback((f: FilterState) => { setFilters(f); }, []);
  const handleRemoveFilter = useCallback((key: keyof FilterState, value?: string) => {
    setFilters((prev) => {
      const next = { ...prev };
      if (key === "directOnly") next.directOnly = false;
      else if (key === "priceRange") next.priceRange = actualPriceRange;
      else if (key === "stops" && value) next.stops = prev.stops.filter((s) => s !== value);
      else if (key === "airlines" && value) next.airlines = prev.airlines.filter((a) => a !== value);
      else if (key === "departureTime" && value) next.departureTime = prev.departureTime.filter((dt) => dt !== value);
      return next;
    });
  }, [actualPriceRange]);
  const handleClearAllFilters = useCallback(() => { setFilters({ ...DEFAULT_FILTERS, priceRange: actualPriceRange }); }, [actualPriceRange]);
  const handleDirectOnlyChange = useCallback((checked: boolean) => { setFilters((prev) => ({ ...prev, directOnly: checked })); }, []);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.directOnly) count++;
    count += filters.stops.length + filters.airlines.length + filters.departureTime.length;
    if (filters.priceRange[0] !== actualPriceRange[0] || filters.priceRange[1] !== actualPriceRange[1]) count++;
    return count;
  }, [filters, actualPriceRange]);

  const handleRetry = useCallback(() => {
    prevSearchKeyRef.current = "";
    setFilters({ ...DEFAULT_FILTERS });
    setSortBy("best");
    if (from && to && depart) {
      searchFlights({ origin: from.toUpperCase(), destination: to.toUpperCase(), departDate: depart, returnDate: isRoundtrip ? returnDate : undefined, adults: adults + children + infants, currency, sort: "best", limit: 50 });
    }
  }, [from, to, depart, returnDate, adults, children, infants, isRoundtrip, currency, searchFlights]);

  const totalPassengers = adults + children + infants;

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-40 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-3 mb-2">
            <Button variant="ghost" size="icon" onClick={() => navigate("/flights")} className="h-9 w-9 shrink-0" aria-label={t("results.back_to_search")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-base md:text-lg font-semibold text-foreground truncate">{from} → {to}</h1>
              <p className="text-xs md:text-sm text-muted-foreground truncate">
                {formatDate(depart)}
                {returnDate && ` – ${formatDate(returnDate)}`} · {totalPassengers} {totalPassengers > 1 ? t("results.travelers") : t("results.traveler")}
              </p>
            </div>
            <div className="lg:hidden">
              <MemoizedMobileDrawer onFiltersChange={handleFiltersChange} activeFiltersCount={activeFiltersCount} flightCount={filteredFlights.length} flights={enrichedFlights} />
            </div>
          </div>
          <div className="hidden sm:block"><CompactSearchBar /></div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4 md:py-6">
        {isSearching && (
          <div className="space-y-6">
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Loader2 className="w-10 h-10 text-primary animate-spin mb-3" />
              <p className="text-base font-semibold text-foreground">{t("results.searching")}</p>
              <p className="text-sm text-muted-foreground">{t("results.searching_sub")}</p>
            </div>
            <FlightResultsSkeleton />
          </div>
        )}

        {status === "error" && !isSearching && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-5">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <p className="text-lg font-semibold text-foreground mb-2">{t("results.error_title")}</p>
            <p className="text-sm text-muted-foreground mb-6 max-w-md">{error || t("results.error_default")}</p>
            <div className="flex gap-3">
              <Button onClick={handleRetry}>{t("results.try_again")}</Button>
              <Button variant="outline" onClick={() => navigate("/flights")}>{t("results.new_search")}</Button>
            </div>
          </div>
        )}

        {status === "no_results" && !isSearching && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-5">
              <Plane className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-lg font-semibold text-foreground mb-2">{t("results.no_flights")}</p>
            <p className="text-sm text-muted-foreground mb-6">{t("results.no_flights_sub")}</p>
            <Button onClick={() => navigate("/flights")}>{t("results.new_search")}</Button>
          </div>
        )}

        {status === "complete" && !isSearching && enrichedFlights.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 items-start">
            <aside className="hidden lg:block sticky top-[140px] h-fit max-h-[calc(100vh-160px)] overflow-y-auto scrollbar-thin">
              <FlightFilters onFiltersChange={handleFiltersChange} flights={enrichedFlights} showDirectOnly onDirectOnlyChange={handleDirectOnlyChange} flightsCurrency={flightsCurrency} />
            </aside>
            <div className="min-w-0 space-y-3">
              <MemoizedSortTabs flights={filteredFlights} sortBy={sortBy} onSortChange={handleSortChange} />
              <MemoizedActiveChips filters={filters} actualPriceRange={actualPriceRange} onRemoveFilter={handleRemoveFilter} onClearAll={handleClearAllFilters} />
              <div className="text-xs md:text-sm text-muted-foreground px-1">
                <span className="font-semibold text-foreground">{filteredFlights.length}</span>{" "}
                {filteredFlights.length !== 1 ? t("results.results_found_plural", { count: filteredFlights.length }).replace(`${filteredFlights.length} `, "") : t("results.results_found", { count: 1 }).replace("1 ", "")}
                {filteredFlights.length !== enrichedFlights.length && (
                  <span className="ms-1 opacity-70">({t("results.from_total", { total: enrichedFlights.length })})</span>
                )}
                {sortedFlights.length < filteredFlights.length && (
                  <span className="ms-1 opacity-70">· {t("results.showing_top", { count: sortedFlights.length })}</span>
                )}
              </div>
              <FlightResultsErrorBoundary>
                <div className="space-y-3">
                  {sortedFlights.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Plane className="w-10 h-10 mx-auto mb-3 opacity-50" />
                      <p className="mb-3 text-sm">
                        {filters.directOnly
                          ? t("results.no_direct_flights", "No direct flights found. Try allowing 1 stop.")
                          : t("results.no_match")}
                      </p>
                      <Button variant="outline" size="sm" onClick={handleClearAllFilters}>{t("results.clear_filters")}</Button>
                    </div>
                  ) : (
                    sortedFlights.map((flight, index) => (
                      <FlightCard key={flight.id} flight={flight} isBestValue={index === 0 && sortBy === "best"} />
                    ))
                  )}
                </div>
              </FlightResultsErrorBoundary>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveFlightResults;
