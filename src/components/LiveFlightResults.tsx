import { useState, useEffect, useMemo, useCallback, useRef, memo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, AlertCircle, Plane, Loader2, RefreshCw, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import FlightFilters, { FilterState } from "./FlightFilters";
import FlightSortTabs from "./FlightSortTabs";
import CompactSearchBar from "./CompactSearchBar";
import FlightCard from "./SkyscannerFlightCard";
import FlightResultsErrorBoundary from "./FlightResultsErrorBoundary";
import FlightResultsSkeleton from "./FlightResultsSkeleton";
import ActiveFilterChips from "./ActiveFilterChips";
import MobileFiltersDrawer from "./MobileFiltersDrawer";
import PriceInsight from "./PriceInsight";
import PriceGraph from "./PriceGraph";
import TrustSignals from "./TrustSignals";

import OriginComparePanel, { type OriginViewMode } from "./OriginComparePanel";
import { useLiveFlightSearch } from "@/hooks/useLiveFlightSearch";
import { useMultiOriginSearch, type MultiOriginFlight } from "@/hooks/useMultiOriginSearch";
import { getAirlineName } from "@/lib/flightNormalizer";
import { enrichFlights, type EnrichedFlight } from "@/lib/flightEnrichment";
import { getPriceIntelligence } from "@/lib/priceIntelligence";
import { resolveDeal } from "@/lib/flightSearchApi";
import { trackFlightClick } from "@/lib/clickTracking";
import { useLocale } from "@/hooks/useLocale";
import { useIsMobile } from "@/hooks/use-mobile";

const DEFAULT_FILTERS: FilterState = {
  stopsMode: "any",
  airlines: [],
  priceRange: [0, 10000],
  departureTime: [],
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
  const { formatDate, currency, formatPrice } = useLocale();
  const isMobile = useIsMobile();

  // Single-origin search hook
  const {
    flights: singleRawFlights, status: singleStatus, error: singleError,
    isSearching: singleIsSearching, searchFlights, forceSearchFlights,
    cancelSearch: singleCancelSearch, cachedAt,
  } = useLiveFlightSearch();

  // Multi-origin search hook
  const {
    flights: multiRawFlights, status: multiStatus, error: multiError,
    isSearching: multiIsSearching, failedOrigins, progress, searchMultiOrigin,
    retryFailedOrigins, cancelSearch: multiCancelSearch,
  } = useMultiOriginSearch();

  const [sortBy, setSortBy] = useState<"best" | "cheapest" | "fastest">("best");
  const [filters, setFilters] = useState<FilterState>({ ...DEFAULT_FILTERS });
  const [selectedOrigin, setSelectedOrigin] = useState<string | null>(null);
  const [originViewMode, setOriginViewMode] = useState<OriginViewMode>("all");
  const prevSearchKeyRef = useRef<string>("");
  const prevSortRef = useRef<string>("best");
  const prevResultsRef = useRef<EnrichedFlight[]>([]);

  // Parse multi-origin from URL
  const fromParam = searchParams.get("from") || searchParams.get("origin") || "";
  const origins = useMemo(() => fromParam.split(",").map(s => s.trim().toUpperCase()).filter(Boolean), [fromParam]);
  const isMultiOrigin = origins.length > 1;
  const from = origins[0] || "";

  const to = searchParams.get("to") || searchParams.get("destination") || "";
  const depart = searchParams.get("depart") || "";
  const returnDate = searchParams.get("return") || "";
  const adults = Number(searchParams.get("adults")) || 1;
  const children = Number(searchParams.get("children")) || 0;
  const infants = Number(searchParams.get("infants")) || 0;
  const tripType = searchParams.get("trip") || "roundtrip";
  const tripClass = searchParams.get("class") || "economy";
  const exploreFromPrice = searchParams.get("explore_from_price");
  const isRoundtrip = tripType === "roundtrip";

  // Choose the right status/error based on mode
  const status = isMultiOrigin ? multiStatus : singleStatus;
  const error = isMultiOrigin ? multiError : singleError;
  const isSearching = isMultiOrigin ? multiIsSearching : singleIsSearching;
  const rawFlights = isMultiOrigin ? multiRawFlights : singleRawFlights;

  const cancelSearch = useCallback(() => {
    singleCancelSearch();
    multiCancelSearch();
  }, [singleCancelSearch, multiCancelSearch]);

  const searchKey = useMemo(
    () => [origins.join(","), to, depart, returnDate, adults, children, infants, tripType, tripClass, currency].join("|"),
    [origins, to, depart, returnDate, adults, children, infants, tripType, tripClass, currency]
  );

  useEffect(() => {
    if (!from || !to || !depart) return;
    if (searchKey === prevSearchKeyRef.current) return;
    prevSearchKeyRef.current = searchKey;
    prevSortRef.current = "best";
    cancelSearch();
    setFilters({ ...DEFAULT_FILTERS });
    setSortBy("best");
    setSelectedOrigin(null);
    setOriginViewMode("all");

    if (isMultiOrigin) {
      searchMultiOrigin({
        origins,
        destination: to,
        departDate: depart,
        returnDate: isRoundtrip ? returnDate : undefined,
        isRoundtrip,
        adults, children, infants, currency,
        sort: "best", limit: 100, tripClass,
      });
    } else {
      const directions: { origin: string; destination: string; date: string }[] = [];
      if (isRoundtrip && returnDate) {
        directions.push(
          { origin: from.toUpperCase(), destination: to.toUpperCase(), date: depart },
          { origin: to.toUpperCase(), destination: from.toUpperCase(), date: returnDate }
        );
      } else {
        directions.push({ origin: from.toUpperCase(), destination: to.toUpperCase(), date: depart });
      }
      searchFlights({
        directions, adults, children, infants, currency,
        sort: "best" as const, limit: 100, tripClass,
      });
    }
  }, [searchKey, from, to, depart, returnDate, adults, children, infants, tripType, currency, isRoundtrip, tripClass, searchFlights, cancelSearch, isMultiOrigin, origins, searchMultiOrigin]);

  // ── Step 1: Enrich raw flights ──
  const enrichedFlights = useMemo<EnrichedFlight[]>(() => {
    if (!rawFlights.length) return [];
    return rawFlights.map(f => {
      const flightOrigin = (f as any).origin_source || f.origin || from;
      const enriched = enrichFlights([f], flightOrigin, to, isRoundtrip)[0];
      if ((f as any).origin_source) {
        (enriched as any).origin_source = (f as any).origin_source;
      }
      return enriched;
    });
  }, [rawFlights, from, to, isRoundtrip]);

  useEffect(() => {
    if (enrichedFlights.length > 0) {
      prevResultsRef.current = enrichedFlights;
    }
  }, [enrichedFlights]);

  const displayFlights = enrichedFlights.length > 0 ? enrichedFlights : prevResultsRef.current;

  const actualPriceRange = useMemo((): [number, number] => {
    if (!displayFlights.length) return [0, 10000];
    const prices = displayFlights.map((f) => f.price?.amount).filter((p) => p > 0 && Number.isFinite(p));
    if (!prices.length) return [0, 10000];
    const min = Math.floor(Math.min(...prices) / 25) * 25;
    const max = Math.ceil(Math.max(...prices) / 25) * 25;
    return [min, Math.max(max, min + 100)];
  }, [displayFlights]);

  const flightsCurrency = useMemo(() => {
    if (!displayFlights.length) return undefined;
    return displayFlights[0]?.price?.currency || undefined;
  }, [displayFlights]);

  // ── Step 2: Filter (including origin filter) ──
  const filteredFlights = useMemo(() => {
    let result = displayFlights;

    if (selectedOrigin) {
      result = result.filter((f) => {
        const src = ((f as any).origin_source || f.origin || "").toUpperCase();
        return src === selectedOrigin.toUpperCase();
      });
    }

    if (filters.stopsMode === "direct") {
      result = result.filter((f) => f.isDirectItinerary);
    } else if (filters.stopsMode === "1") {
      result = result.filter((f) => f.stopsTotal === 1);
    } else if (filters.stopsMode === "2plus") {
      result = result.filter((f) => f.stopsTotal >= 2);
    }

    if (filters.airlines.length > 0) {
      result = result.filter((flight) => {
        const raw = flight.airlines?.[0] || "";
        const display = raw.length <= 3 ? getAirlineName(raw) : raw;
        return filters.airlines.includes(display);
      });
    }

    if (filters.priceRange[0] > actualPriceRange[0] || filters.priceRange[1] < actualPriceRange[1]) {
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
  }, [displayFlights, filters, actualPriceRange, selectedOrigin]);

  // ── Dedup ──
  const dedupedFlights = useMemo(() => {
    const seen = new Set<string>();
    return filteredFlights.filter((f) => {
      const contentKey = [
        (f as any).origin_source || "",
        f.airlines?.[0] || "",
        f.departureTime || "",
        f.arrivalTime || "",
        f.origin || "",
        f.destination || "",
        Math.round(f.price?.amount || 0),
        f.durationMinutes || 0,
      ].join("|");
      if (seen.has(contentKey)) return false;
      seen.add(contentKey);
      return true;
    });
  }, [filteredFlights]);

  // ── Step 3: Sort with color-coded pinned labels ──
  const { sortedFlights, pinnedLabels } = useMemo(() => {
    const sorted = [...dedupedFlights];
    const labels = new Map<string, string>();

    const bestSort = (a: EnrichedFlight, b: EnrichedFlight) => {
      const sa = a.price.amount * 0.6 + a.durationMinutes * 0.3 + a.outboundStopsTotal * 100;
      const sb = b.price.amount * 0.6 + b.durationMinutes * 0.3 + b.outboundStopsTotal * 100;
      if (sa !== sb) return sa - sb;
      if (a.price.amount !== b.price.amount) return a.price.amount - b.price.amount;
      if (a.durationMinutes !== b.durationMinutes) return a.durationMinutes - b.durationMinutes;
      return (a.departureTime || "").localeCompare(b.departureTime || "");
    };

    const byPrice = [...sorted].sort((a, b) => a.price.amount - b.price.amount);
    const byDuration = [...sorted].sort((a, b) => a.durationMinutes - b.durationMinutes);
    const byBest = [...sorted].sort(bestSort);

    if (byPrice[0]) labels.set(byPrice[0].id, "Cheapest");
    if (byBest[0] && byBest[0].id !== byPrice[0]?.id) labels.set(byBest[0].id, "Best");
    if (byDuration[0] && !labels.has(byDuration[0].id)) labels.set(byDuration[0].id, "Fastest");

    switch (sortBy) {
      case "cheapest":
        sorted.sort((a, b) => {
          if (a.price.amount !== b.price.amount) return a.price.amount - b.price.amount;
          if (a.durationMinutes !== b.durationMinutes) return a.durationMinutes - b.durationMinutes;
          return (a.departureTime || "").localeCompare(b.departureTime || "");
        });
        break;
      case "fastest":
        sorted.sort((a, b) => {
          if (a.durationMinutes !== b.durationMinutes) return a.durationMinutes - b.durationMinutes;
          if (a.price.amount !== b.price.amount) return a.price.amount - b.price.amount;
          return (a.departureTime || "").localeCompare(b.departureTime || "");
        });
        break;
      case "best": default: {
        const pinnedIds = new Set<string>();
        const pinned: EnrichedFlight[] = [];
        if (byPrice[0]) { pinnedIds.add(byPrice[0].id); pinned.push(byPrice[0]); }
        if (byBest[0] && !pinnedIds.has(byBest[0].id)) { pinnedIds.add(byBest[0].id); pinned.push(byBest[0]); }
        if (byDuration[0] && !pinnedIds.has(byDuration[0].id)) { pinnedIds.add(byDuration[0].id); pinned.push(byDuration[0]); }
        const rest = sorted.filter(f => !pinnedIds.has(f.id));
        rest.sort(bestSort);
        return { sortedFlights: [...pinned, ...rest].slice(0, MAX_DISPLAY), pinnedLabels: labels };
      }
    }
    return { sortedFlights: sorted.slice(0, MAX_DISPLAY), pinnedLabels: labels };
  }, [dedupedFlights, sortBy]);

  // ── Grouped by origin (for "by-origin" view) ──
  const groupedByOrigin = useMemo(() => {
    if (!isMultiOrigin || originViewMode !== "by-origin") return null;
    const groups = new Map<string, EnrichedFlight[]>();
    for (const o of origins) groups.set(o, []);
    for (const f of sortedFlights) {
      const src = ((f as any).origin_source || f.origin || "").toUpperCase();
      if (groups.has(src)) groups.get(src)!.push(f);
      else {
        if (!groups.has(src)) groups.set(src, []);
        groups.get(src)!.push(f);
      }
    }
    // Sort groups by cheapest price
    const entries = Array.from(groups.entries()).map(([origin, flights]) => {
      const cheapest = flights.length > 0 ? Math.min(...flights.map(f => f.price.amount)) : Infinity;
      return { origin, flights: flights.slice(0, 10), cheapest };
    });
    entries.sort((a, b) => a.cheapest - b.cheapest);
    return entries;
  }, [isMultiOrigin, originViewMode, sortedFlights, origins]);

  const buildDirections = useCallback(() => {
    const directions: { origin: string; destination: string; date: string }[] = [];
    if (isRoundtrip && returnDate) {
      directions.push(
        { origin: from.toUpperCase(), destination: to.toUpperCase(), date: depart },
        { origin: to.toUpperCase(), destination: from.toUpperCase(), date: returnDate }
      );
    } else {
      directions.push({ origin: from.toUpperCase(), destination: to.toUpperCase(), date: depart });
    }
    return directions;
  }, [from, to, depart, returnDate, isRoundtrip]);

  const handleSortChange = useCallback((s: "best" | "cheapest" | "fastest") => {
    setSortBy(s);
    prevSortRef.current = s;
  }, []);
  const handleFiltersChange = useCallback((f: FilterState) => { setFilters(f); }, []);

  const handleRemoveFilter = useCallback((key: keyof FilterState, value?: string) => {
    setFilters((prev) => {
      const next = { ...prev };
      if (key === "stopsMode") next.stopsMode = "any";
      else if (key === "priceRange") next.priceRange = actualPriceRange;
      else if (key === "airlines" && value) next.airlines = prev.airlines.filter((a) => a !== value);
      else if (key === "departureTime" && value) next.departureTime = prev.departureTime.filter((dt) => dt !== value);
      return next;
    });
  }, [actualPriceRange]);

  const handleClearAllFilters = useCallback(() => {
    setFilters({ ...DEFAULT_FILTERS, priceRange: actualPriceRange });
    setSelectedOrigin(null);
  }, [actualPriceRange]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.stopsMode !== "any") count++;
    count += filters.airlines.length + filters.departureTime.length;
    if (filters.priceRange[0] !== actualPriceRange[0] || filters.priceRange[1] !== actualPriceRange[1]) count++;
    if (selectedOrigin) count++;
    return count;
  }, [filters, actualPriceRange, selectedOrigin]);

  const handleRetry = useCallback(() => {
    prevSearchKeyRef.current = "";
    prevSortRef.current = sortBy;
    setFilters({ ...DEFAULT_FILTERS });
    setSelectedOrigin(null);
    if (isMultiOrigin) {
      searchMultiOrigin({
        origins, destination: to, departDate: depart,
        returnDate: isRoundtrip ? returnDate : undefined, isRoundtrip,
        adults, children, infants, currency, sort: sortBy, limit: 100, tripClass,
      });
    } else if (from && to && depart) {
      forceSearchFlights({ directions: buildDirections(), adults, children, infants, currency, sort: sortBy, limit: 100, tripClass });
    }
  }, [from, to, depart, adults, children, infants, currency, tripClass, sortBy, buildDirections, forceSearchFlights, isMultiOrigin, origins, searchMultiOrigin, isRoundtrip, returnDate]);

  const handleRefreshPrices = useCallback(() => {
    if (from && to && depart) {
      prevSearchKeyRef.current = "";
      if (isMultiOrigin) {
        searchMultiOrigin({
          origins, destination: to, departDate: depart,
          returnDate: isRoundtrip ? returnDate : undefined, isRoundtrip,
          adults, children, infants, currency, sort: sortBy, limit: 100, tripClass,
        });
      } else {
        forceSearchFlights({ directions: buildDirections(), adults, children, infants, currency, sort: sortBy, limit: 100, tripClass });
      }
    }
  }, [from, to, depart, adults, children, infants, currency, tripClass, sortBy, buildDirections, forceSearchFlights, isMultiOrigin, origins, searchMultiOrigin, isRoundtrip, returnDate]);

  const cacheAgeLabel = useMemo(() => {
    if (!cachedAt) return null;
    const mins = Math.round((Date.now() - cachedAt) / 60000);
    if (mins < 1) return t("results.updated_just_now", "Updated just now");
    return t("results.updated_ago", { count: mins, defaultValue: `Updated ${mins} min ago` });
  }, [cachedAt, t, status]);

  const totalPassengers = adults + children + infants;

  const cheapestFlight = useMemo(() => {
    if (!sortedFlights.length) return null;
    return [...sortedFlights].sort((a, b) => a.price.amount - b.price.amount)[0];
  }, [sortedFlights]);


  const hasResults = displayFlights.length > 0;
  const showSkeleton = isSearching && prevResultsRef.current.length === 0 && displayFlights.length === 0;
  const isRevalidating = isSearching && displayFlights.length > 0;

  const headerTitle = isMultiOrigin ? `${origins.join(", ")} → ${to}` : `${from} → ${to}`;

  // Render a flight card
  const renderFlightCard = useCallback((flight: EnrichedFlight, index: number) => {
    const pinLabel = pinnedLabels.get(flight.id);
    const intel = getPriceIntelligence(flight, dedupedFlights);
    const originSource = (flight as any).origin_source || undefined;
    return (
      <div key={flight.id} className="flight-card-enter" style={{ animationDelay: `${index * 40}ms` }}>
        <FlightCard
          flight={flight}
          isBestValue={!!pinLabel}
          badgeLabel={pinLabel}
          departDate={depart}
          returnDate={returnDate}
          priceIntel={intel}
          originSource={isMultiOrigin ? originSource : undefined}
        />
      </div>
    );
  }, [pinnedLabels, dedupedFlights, depart, returnDate, isMultiOrigin]);

  return (
    <div className="min-h-screen bg-background pt-16" style={{ paddingTop: "calc(4rem + env(safe-area-inset-top))" }}>
      <div className="sticky top-16 z-40 bg-card/95 backdrop-blur-sm border-b border-border" style={{ top: "calc(4rem + env(safe-area-inset-top))" }}>
        <div className="container mx-auto px-3 sm:px-4 py-3 w-full max-w-full box-border overflow-hidden">
          <div className="flex items-center gap-2 sm:gap-3 mb-2 flex-nowrap justify-between">
            <Button variant="ghost" size="icon" onClick={() => navigate("/flights")} className="h-9 w-9 shrink-0" aria-label={t("results.back_to_search")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-sm sm:text-base md:text-lg font-semibold text-foreground break-words">{headerTitle}</h1>
              <p className="text-xs md:text-sm text-muted-foreground break-words">
                {formatDate(depart)}
                {returnDate && ` – ${formatDate(returnDate)}`} · {totalPassengers} {totalPassengers > 1 ? t("results.travelers") : t("results.traveler")}
                {isMultiOrigin && ` · ${origins.length} airports`}
              </p>
            </div>
            <div className="lg:hidden shrink-0">
              <MemoizedMobileDrawer onFiltersChange={handleFiltersChange} activeFiltersCount={activeFiltersCount} flightCount={dedupedFlights.length} flights={displayFlights} flightsCurrency={flightsCurrency} currentFilters={filters} />
            </div>
          </div>
          <div className="hidden sm:block"><CompactSearchBar /></div>
          <TrustSignals />
        </div>
      </div>

      <div className="container mx-auto px-4 py-4 md:py-6">
        {exploreFromPrice && isSearching && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5 mb-4 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Explore prices are flexible "from" estimates.</span>{" "}
            Exact prices update after selecting dates.
          </div>
        )}
        {showSkeleton && (
          <div className="space-y-6">
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Loader2 className="w-10 h-10 text-primary animate-spin mb-3" />
              <p className="text-base font-semibold text-foreground">{t("results.searching")}</p>
              <p className="text-sm text-muted-foreground">
                {isMultiOrigin
                  ? `Searching ${progress.completed}/${progress.total} departure airports…`
                  : t("results.searching_sub")}
              </p>
            </div>
            <FlightResultsSkeleton />
          </div>
        )}

        {status === "error" && !isSearching && displayFlights.length === 0 && (
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

        {status === "no_results" && !isSearching && displayFlights.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-5">
              <Plane className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-lg font-semibold text-foreground mb-2">{t("results.no_flights", "No flights found")}</p>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm">{t("results.no_flights_sub", "Try nearby dates, different airports, or adjusting your filters.")}</p>
            <Button onClick={() => navigate("/flights")}>{t("results.new_search")}</Button>
          </div>
        )}

        {hasResults && !showSkeleton && (
          <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 items-start">
            <aside className="hidden lg:block sticky top-[140px] h-fit max-h-[calc(100vh-160px)] overflow-y-auto scrollbar-thin">
              <FlightFilters onFiltersChange={handleFiltersChange} flights={displayFlights} flightsCurrency={flightsCurrency} currentFilters={filters} />
            </aside>
            <div className="min-w-0 space-y-3">
              {/* Multi-Origin Comparison Panel */}
              {isMultiOrigin && (
                <OriginComparePanel
                  flights={displayFlights}
                  origins={origins}
                  selectedOrigin={selectedOrigin}
                  onSelectOrigin={setSelectedOrigin}
                  formatPrice={formatPrice}
                  flightsCurrency={flightsCurrency}
                  viewMode={originViewMode}
                  onViewModeChange={setOriginViewMode}
                />
              )}

              {/* Failed origins warning with retry */}
              {failedOrigins.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-400">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span className="flex-1">No results from: {failedOrigins.join(", ")}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={retryFailedOrigins}
                    disabled={isSearching}
                    className="h-6 px-2 text-[11px] text-amber-400 hover:text-amber-300 gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Retry
                  </Button>
                </div>
              )}

              {sortedFlights.length > 0 && (
                <PriceInsight origin={from} destination={to} currentPrice={sortedFlights[0].price.amount} priceCurrency={flightsCurrency} />
              )}
              <PriceGraph origin={from} destination={to} />
              <MemoizedSortTabs flights={dedupedFlights} sortBy={sortBy} onSortChange={handleSortChange} />
              <div className="flex items-center gap-2 px-1 flex-wrap">
                {isRevalidating && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Loader2 className="w-3 h-3 animate-spin text-primary" />
                    <span>
                      {isMultiOrigin
                        ? `Searching ${progress.completed}/${progress.total} origins…`
                        : t("results.updating", "Searching more fares…")}
                    </span>
                  </div>
                )}
                {!isSearching && cacheAgeLabel && (
                  <>
                    <span className="text-[11px] text-muted-foreground">{cacheAgeLabel}</span>
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px] text-primary hover:text-primary/80 gap-1" onClick={handleRefreshPrices}>
                      <RefreshCw className="w-3 h-3" />
                      {t("results.refresh", "Refresh prices")}
                    </Button>
                  </>
                )}
              </div>
              <MemoizedActiveChips filters={filters} actualPriceRange={actualPriceRange} onRemoveFilter={handleRemoveFilter} onClearAll={handleClearAllFilters} flightsCurrency={flightsCurrency} />
              <div className="text-xs md:text-sm text-muted-foreground px-1">
                <span className="font-semibold text-foreground">{dedupedFlights.length}</span>{" "}
                {dedupedFlights.length !== 1 ? t("results.results_found_plural", { count: dedupedFlights.length }).replace(`${dedupedFlights.length} `, "") : t("results.results_found", { count: 1 }).replace("1 ", "")}
                {dedupedFlights.length !== displayFlights.length && (
                  <span className="ms-1 opacity-70">({t("results.from_total", { total: displayFlights.length })})</span>
                )}
                {sortedFlights.length < dedupedFlights.length && (
                  <span className="ms-1 opacity-70">· {t("results.showing_top", { count: sortedFlights.length })}</span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground/60 px-1 italic">
                Prices may differ from other platforms depending on agency availability and fare rules.
              </p>
              <FlightResultsErrorBoundary>
                <div className="space-y-3">
                  {sortedFlights.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Plane className="w-10 h-10 mx-auto mb-3 opacity-50" />
                      <p className="mb-3 text-sm">
                        {filters.stopsMode === "direct"
                          ? t("results.no_direct_flights", "No direct flights found. Try allowing 1 stop.")
                          : t("results.no_match")}
                      </p>
                      <Button variant="outline" size="sm" onClick={handleClearAllFilters}>{t("results.clear_filters")}</Button>
                    </div>
                  ) : groupedByOrigin ? (
                    // By-origin grouped view
                    groupedByOrigin.map(({ origin, flights: originFlights, cheapest }) => (
                      <div key={origin} className="space-y-2">
                        <div className="flex items-center gap-2 px-2 pt-4 pb-2 border-b border-border/40">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <span className="text-xs font-bold text-primary">{origin}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-semibold text-foreground">
                              From {origin}
                            </span>
                            <span className="text-xs text-muted-foreground ml-2">
                              — best from {formatPrice(cheapest, flightsCurrency)}
                            </span>
                          </div>
                          <span className="text-[10px] text-muted-foreground">{originFlights.length} results · Top 10 shown</span>
                        </div>
                        {originFlights.map((flight, index) => renderFlightCard(flight, index))}
                      </div>
                    ))
                  ) : (
                    // All origins flat view
                    sortedFlights.map((flight, index) => renderFlightCard(flight, index))
                  )}
                </div>
              </FlightResultsErrorBoundary>
            </div>
          </div>
        )}

      </div>
      {status === "complete" && isMobile && <div className="h-20 md:hidden" />}
    </div>
  );
};

export default LiveFlightResults;
