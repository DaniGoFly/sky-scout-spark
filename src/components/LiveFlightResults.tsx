import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ArrowLeft, AlertCircle, Plane, SlidersHorizontal, Loader2 } from "lucide-react";
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
import { useIsMobile } from "@/hooks/use-mobile";

const DEFAULT_FILTERS: FilterState = {
  stops: [],
  airlines: [],
  priceRange: [0, 10000],
  departureTime: [],
  directOnly: false,
};

const MAX_DISPLAY = 25;

const LiveFlightResults = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const {
    flights: rawFlights,
    status,
    error,
    isSearching,
    searchFlights,
  } = useLiveFlightSearch();

  const [sortBy, setSortBy] = useState<"best" | "cheapest" | "fastest">("best");
  const [filters, setFilters] = useState<FilterState>({ ...DEFAULT_FILTERS });
  const prevSearchKeyRef = useRef<string>("");

  // ── Extract search params ──
  const from = searchParams.get("from") || searchParams.get("origin") || "";
  const to = searchParams.get("to") || searchParams.get("destination") || "";
  const depart = searchParams.get("depart") || "";
  const returnDate = searchParams.get("return") || "";
  const adults = Number(searchParams.get("adults")) || 1;
  const children = Number(searchParams.get("children")) || 0;
  const infants = Number(searchParams.get("infants")) || 0;
  const tripType = searchParams.get("trip") || "roundtrip";
  const tripClass = searchParams.get("class") || "economy";

  const searchKey = useMemo(
    () => [from, to, depart, returnDate, adults, children, infants, tripType, tripClass].join("|"),
    [from, to, depart, returnDate, adults, children, infants, tripType, tripClass]
  );

  // ── Search on URL change ──
  useEffect(() => {
    if (!from || !to || !depart) return;
    if (searchKey === prevSearchKeyRef.current) return;
    prevSearchKeyRef.current = searchKey;
    setFilters({ ...DEFAULT_FILTERS });
    setSortBy("best");
    searchFlights({
      origin: from.toUpperCase(),
      destination: to.toUpperCase(),
      departDate: depart,
      returnDate: tripType === "roundtrip" ? returnDate : undefined,
      adults: adults + children + infants,
      currency: "EUR",
      sort: "best",
      limit: 50,
    });
  }, [searchKey, from, to, depart, returnDate, adults, children, infants, tripType, searchFlights]);

  // ── Actual price range for chips ──
  const actualPriceRange = useMemo((): [number, number] => {
    if (!rawFlights.length) return [0, 10000];
    const prices = rawFlights.map((f) => f.price?.amount).filter((p) => p > 0 && Number.isFinite(p));
    if (!prices.length) return [0, 10000];
    const min = Math.floor(Math.min(...prices) / 25) * 25;
    const max = Math.ceil(Math.max(...prices) / 25) * 25;
    return [min, Math.max(max, min + 100)];
  }, [rawFlights]);

  // ── Filter layer ──
  const filteredFlights = useMemo(() => {
    let result = [...rawFlights];

    if (filters.directOnly) {
      result = result.filter((f) => f.stopsCount === 0);
    }

    if (filters.stops.length > 0 && !filters.directOnly) {
      result = result.filter((flight) =>
        filters.stops.some((stop) => {
          if (stop === "direct") return flight.stopsCount === 0;
          if (stop === "1stop") return flight.stopsCount === 1;
          if (stop === "2stops") return flight.stopsCount >= 2;
          return true;
        })
      );
    }

    if (filters.airlines.length > 0) {
      result = result.filter((flight) => {
        const flightAirline = getAirlineName(flight.airlines?.[0] || "");
        return filters.airlines.includes(flightAirline);
      });
    }

    result = result.filter(
      (flight) =>
        flight.price.amount >= filters.priceRange[0] &&
        flight.price.amount <= filters.priceRange[1]
    );

    if (filters.departureTime.length > 0) {
      result = result.filter((flight) => {
        if (!flight.departureTime) return true;
        const timeParts = flight.departureTime.match(/(\d+):(\d+)\s*(AM|PM)?/i);
        if (!timeParts) return true;
        let hour = parseInt(timeParts[1], 10);
        const ampm = timeParts[3]?.toUpperCase();
        if (ampm === "PM" && hour !== 12) hour += 12;
        if (ampm === "AM" && hour === 12) hour = 0;
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
  }, [rawFlights, filters]);

  // ── Sort layer ──
  const sortedFlights = useMemo(() => {
    const sorted = [...filteredFlights];
    switch (sortBy) {
      case "cheapest":
        sorted.sort((a, b) => a.price.amount - b.price.amount);
        break;
      case "fastest":
        sorted.sort((a, b) => a.durationMinutes - b.durationMinutes);
        break;
      case "best":
      default:
        sorted.sort((a, b) => {
          const scoreA = a.price.amount * 0.6 + a.durationMinutes * 0.3 + a.stopsCount * 100;
          const scoreB = b.price.amount * 0.6 + b.durationMinutes * 0.3 + b.stopsCount * 100;
          return scoreA - scoreB;
        });
        break;
    }
    return sorted.slice(0, MAX_DISPLAY);
  }, [filteredFlights, sortBy]);

  const handleSortChange = useCallback((newSort: "best" | "cheapest" | "fastest") => {
    setSortBy(newSort);
  }, []);

  const handleRemoveFilter = useCallback(
    (key: keyof FilterState, value?: string) => {
      setFilters((prev) => {
        const next = { ...prev };
        if (key === "directOnly") {
          next.directOnly = false;
        } else if (key === "priceRange") {
          next.priceRange = actualPriceRange;
        } else if (key === "stops" && value) {
          next.stops = prev.stops.filter((s) => s !== value);
        } else if (key === "airlines" && value) {
          next.airlines = prev.airlines.filter((a) => a !== value);
        } else if (key === "departureTime" && value) {
          next.departureTime = prev.departureTime.filter((t) => t !== value);
        }
        return next;
      });
    },
    [actualPriceRange]
  );

  const handleClearAllFilters = useCallback(() => {
    setFilters({
      ...DEFAULT_FILTERS,
      priceRange: actualPriceRange,
    });
  }, [actualPriceRange]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.directOnly) count++;
    count += filters.stops.length;
    count += filters.airlines.length;
    count += filters.departureTime.length;
    if (filters.priceRange[0] !== actualPriceRange[0] || filters.priceRange[1] !== actualPriceRange[1]) count++;
    return count;
  }, [filters, actualPriceRange]);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const handleRetry = useCallback(() => {
    prevSearchKeyRef.current = "";
    setFilters({ ...DEFAULT_FILTERS });
    setSortBy("best");
    if (from && to && depart) {
      searchFlights({
        origin: from.toUpperCase(),
        destination: to.toUpperCase(),
        departDate: depart,
        returnDate: tripType === "roundtrip" ? returnDate : undefined,
        adults: adults + children + infants,
        currency: "EUR",
        sort: "best",
        limit: 50,
      });
    }
  }, [from, to, depart, returnDate, adults, children, infants, tripType, searchFlights]);

  const totalPassengers = adults + children + infants;

  return (
    <div className="min-h-screen bg-background">
      {/* ── Sticky Header ── */}
      <div className="sticky top-0 z-40 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-3 mb-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/flights")}
              className="h-9 w-9 shrink-0"
              aria-label="Back to search"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-base md:text-lg font-semibold text-foreground truncate">
                {from} → {to}
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground truncate">
                {formatDate(depart)}
                {returnDate && ` – ${formatDate(returnDate)}`} · {totalPassengers} traveler
                {totalPassengers > 1 ? "s" : ""}
              </p>
            </div>

            {/* Mobile/tablet filters button */}
            <div className="lg:hidden">
              <MobileFiltersDrawer
                onFiltersChange={setFilters}
                activeFiltersCount={activeFiltersCount}
                flightCount={filteredFlights.length}
                flights={rawFlights}
              />
            </div>
          </div>

          {/* Compact search bar - hide on small mobile for space */}
          <div className="hidden sm:block">
            <CompactSearchBar />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4 md:py-6">
        {/* Loading */}
        {isSearching && (
          <div className="space-y-6">
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Loader2 className="w-10 h-10 text-primary animate-spin mb-3" />
              <p className="text-base font-semibold text-foreground">Searching live prices…</p>
              <p className="text-sm text-muted-foreground">Finding the best deals for you</p>
            </div>
            <FlightResultsSkeleton />
          </div>
        )}

        {/* Error */}
        {status === "error" && !isSearching && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-5">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <p className="text-lg font-semibold text-foreground mb-2">Something went wrong</p>
            <p className="text-sm text-muted-foreground mb-6 max-w-md">
              {error || "We couldn't find flights for this search. Please try again."}
            </p>
            <div className="flex gap-3">
              <Button onClick={handleRetry}>Try Again</Button>
              <Button variant="outline" onClick={() => navigate("/flights")}>
                New Search
              </Button>
            </div>
          </div>
        )}

        {/* No results */}
        {status === "no_results" && !isSearching && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-5">
              <Plane className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-lg font-semibold text-foreground mb-2">No flights found</p>
            <p className="text-sm text-muted-foreground mb-6">
              We couldn't find any flights for this route and date.
            </p>
            <Button onClick={() => navigate("/flights")}>New Search</Button>
          </div>
        )}

        {/* ── Results ── */}
        {status === "complete" && !isSearching && rawFlights.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 items-start">
            {/* Desktop sidebar */}
            <aside className="hidden lg:block sticky top-[140px] h-fit max-h-[calc(100vh-160px)] overflow-y-auto scrollbar-thin">
              <FlightFilters
                onFiltersChange={setFilters}
                flights={rawFlights}
                showDirectOnly
                onDirectOnlyChange={(checked) => {
                  setFilters((prev) => ({ ...prev, directOnly: checked }));
                }}
              />
            </aside>

            {/* Results column */}
            <div className="min-w-0 space-y-3">
              {/* Sort tabs */}
              <FlightSortTabs flights={filteredFlights} sortBy={sortBy} onSortChange={handleSortChange} />

              {/* Active filter chips */}
              <ActiveFilterChips
                filters={filters}
                actualPriceRange={actualPriceRange}
                onRemoveFilter={handleRemoveFilter}
                onClearAll={handleClearAllFilters}
              />

              {/* Results count */}
              <div className="text-xs md:text-sm text-muted-foreground px-1">
                <span className="font-semibold text-foreground">{filteredFlights.length}</span> result
                {filteredFlights.length !== 1 ? "s" : ""} found
                {filteredFlights.length !== rawFlights.length && (
                  <span className="ml-1 opacity-70">(from {rawFlights.length})</span>
                )}
                {sortedFlights.length < filteredFlights.length && (
                  <span className="ml-1 opacity-70">· Showing top {sortedFlights.length}</span>
                )}
              </div>

              <FlightResultsErrorBoundary>
                <div className="space-y-3">
                  {sortedFlights.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Plane className="w-10 h-10 mx-auto mb-3 opacity-50" />
                      <p className="mb-3 text-sm">No flights match your filters.</p>
                      <Button variant="outline" size="sm" onClick={handleClearAllFilters}>
                        Clear all filters
                      </Button>
                    </div>
                  ) : (
                    sortedFlights.map((flight, index) => (
                      <FlightCard
                        key={flight.id}
                        flight={flight}
                        isBestValue={index === 0 && sortBy === "best"}
                      />
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
