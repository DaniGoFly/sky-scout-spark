import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ArrowLeft, AlertCircle, Plane, SlidersHorizontal, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import FlightFilters, { FilterState } from "./FlightFilters";
import FlightSortTabs from "./FlightSortTabs";
import CompactSearchBar from "./CompactSearchBar";
import FlightCard from "./SkyscannerFlightCard";
import FlightResultsErrorBoundary from "./FlightResultsErrorBoundary";
import { useLiveFlightSearch } from "@/hooks/useLiveFlightSearch";
import { getAirlineName } from "@/lib/flightNormalizer";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

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
  const {
    flights: rawFlights,
    status,
    error,
    isSearching,
    searchFlights,
  } = useLiveFlightSearch();

  const [sortBy, setSortBy] = useState<"best" | "cheapest" | "fastest">("best");
  const [filters, setFilters] = useState<FilterState>({ ...DEFAULT_FILTERS });
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const prevSearchKeyRef = useRef<string>("");

  // ── Extract search params (single source of truth) ──
  const from = searchParams.get("from") || searchParams.get("origin") || "";
  const to = searchParams.get("to") || searchParams.get("destination") || "";
  const depart = searchParams.get("depart") || "";
  const returnDate = searchParams.get("return") || "";
  const adults = Number(searchParams.get("adults")) || 1;
  const children = Number(searchParams.get("children")) || 0;
  const infants = Number(searchParams.get("infants")) || 0;
  const tripType = searchParams.get("trip") || "roundtrip";
  const tripClass = searchParams.get("class") || "economy";

  // ── Stable search key derived from all search params ──
  const searchKey = useMemo(
    () => [from, to, depart, returnDate, adults, children, infants, tripType, tripClass].join("|"),
    [from, to, depart, returnDate, adults, children, infants, tripType, tripClass]
  );

  // ── A) Single effect: search when URL params change ──
  useEffect(() => {
    if (!from || !to || !depart) return;
    // Skip if same search key (prevents double-fetch)
    if (searchKey === prevSearchKeyRef.current) return;
    prevSearchKeyRef.current = searchKey;

    // Reset UI state for the new search
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
      limit: 50, // Fetch more so client-side sort/filter has data
    });
  }, [searchKey, from, to, depart, returnDate, adults, children, infants, tripType, searchFlights]);

  // ── B) Data layers: raw → filtered → sorted ──

  // Layer 1: filteredFlights (from rawFlights + filters)
  const filteredFlights = useMemo(() => {
    let result = [...rawFlights];

    // Direct only
    if (filters.directOnly) {
      result = result.filter((f) => f.stopsCount === 0);
    }

    // Stops checkboxes (only if directOnly is off)
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

    // Airlines
    if (filters.airlines.length > 0) {
      result = result.filter((flight) => {
        const flightAirline = getAirlineName(flight.airlines?.[0] || "");
        return filters.airlines.includes(flightAirline);
      });
    }

    // Price range
    result = result.filter(
      (flight) =>
        flight.price.amount >= filters.priceRange[0] &&
        flight.price.amount <= filters.priceRange[1]
    );

    // Departure time buckets
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

  // Layer 2: sortedFlights (from filteredFlights + sortBy), capped at MAX_DISPLAY
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
        // Weighted score: price (60%) + duration (30%) + stops penalty
        sorted.sort((a, b) => {
          const scoreA = a.price.amount * 0.6 + a.durationMinutes * 0.3 + a.stopsCount * 100;
          const scoreB = b.price.amount * 0.6 + b.durationMinutes * 0.3 + b.stopsCount * 100;
          return scoreA - scoreB;
        });
        break;
    }

    return sorted.slice(0, MAX_DISPLAY);
  }, [filteredFlights, sortBy]);

  // ── C) Sort tab change is client-side only ──
  const handleSortChange = useCallback((newSort: "best" | "cheapest" | "fastest") => {
    setSortBy(newSort);
  }, []);

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
    prevSearchKeyRef.current = ""; // Force re-search
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

  const FiltersContent = () => (
    <FlightFilters
      onFiltersChange={setFilters}
      flights={rawFlights}
      showDirectOnly={true}
      onDirectOnlyChange={(checked) => {
        setFilters((prev) => ({ ...prev, directOnly: checked }));
      }}
    />
  );

  const totalPassengers = adults + children + infants;

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-card/95 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-4 mb-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/flights")} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-semibold text-foreground truncate">
                {from} → {to}
              </h1>
              <p className="text-sm text-muted-foreground truncate">
                {formatDate(depart)}
                {returnDate && ` – ${formatDate(returnDate)}`} · {totalPassengers} traveler
                {totalPassengers > 1 ? "s" : ""}
              </p>
            </div>

            <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="lg:hidden gap-2">
                  <SlidersHorizontal className="w-4 h-4" />
                  Filters
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px] overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                <div className="mt-6">
                  <FiltersContent />
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <CompactSearchBar />
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Loading state */}
        {isSearching && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
            <p className="text-lg font-semibold text-foreground">Searching live prices…</p>
            <p className="text-muted-foreground">Finding the best deals for you</p>
          </div>
        )}

        {/* Error state */}
        {status === "error" && !isSearching && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
              <AlertCircle className="w-10 h-10 text-destructive" />
            </div>
            <p className="text-xl font-semibold text-foreground mb-2">Something went wrong</p>
            <p className="text-muted-foreground mb-6 max-w-md">
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
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
              <Plane className="w-10 h-10 text-muted-foreground" />
            </div>
            <p className="text-xl font-semibold text-foreground mb-2">No flights found</p>
            <p className="text-muted-foreground mb-6">
              We couldn't find any flights for this route and date.
            </p>
            <Button onClick={() => navigate("/flights")}>New Search</Button>
          </div>
        )}

        {/* Results */}
        {status === "complete" && !isSearching && rawFlights.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 items-start">
            <aside className="hidden lg:block h-fit">
              <FiltersContent />
            </aside>

            <div className="space-y-4 min-w-0">
              {/* C) Sort tabs — client-side only */}
              <FlightSortTabs flights={filteredFlights} sortBy={sortBy} onSortChange={handleSortChange} />

              {/* F) Results count based on filtered total */}
              <div className="text-sm text-muted-foreground bg-card p-3 rounded-xl border border-border">
                <span className="font-semibold text-foreground">{filteredFlights.length}</span> result
                {filteredFlights.length !== 1 ? "s" : ""} found
                {filteredFlights.length !== rawFlights.length && (
                  <span className="ml-1">(filtered from {rawFlights.length})</span>
                )}
              </div>

              <FlightResultsErrorBoundary>
                <div className="space-y-4">
                  {sortedFlights.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Plane className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p className="mb-3">No flights match your filters.</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setFilters({ ...DEFAULT_FILTERS })}
                      >
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
