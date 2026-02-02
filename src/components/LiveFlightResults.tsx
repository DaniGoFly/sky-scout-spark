import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ArrowLeft, AlertCircle, Plane, SlidersHorizontal, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import FlightFilters, { FilterState } from "./FlightFilters";
import FlightSortTabs from "./FlightSortTabs";
import CompactSearchBar from "./CompactSearchBar";
import FlightCard from "./SkyscannerFlightCard";
import FlightResultsErrorBoundary from "./FlightResultsErrorBoundary";
import { useLiveFlightSearch, Flight } from "@/hooks/useLiveFlightSearch";
import { sortFlights, getAirlineName, hasValidClickUrl } from "@/lib/flightNormalizer";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";

const LiveFlightResults = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    flights: rawFlights,
    status,
    error,
    isSearching,
    searchFlights,
  } = useLiveFlightSearch();

  const [sortBy, setSortBy] = useState<"best" | "cheapest" | "fastest">("best");
  const [filters, setFilters] = useState<FilterState>({
    stops: [],
    airlines: [],
    priceRange: [0, 10000],
    departureTime: [],
    directOnly: false,
  });
  const [hasSearched, setHasSearched] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [loadingFlightId, setLoadingFlightId] = useState<string | null>(null);

  // Extract search params
  const from = searchParams.get("from") || searchParams.get("origin") || "";
  const to = searchParams.get("to") || searchParams.get("destination") || "";
  const depart = searchParams.get("depart") || "";
  const returnDate = searchParams.get("return") || "";
  const adults = Number(searchParams.get("adults")) || 1;
  const children = Number(searchParams.get("children")) || 0;
  const infants = Number(searchParams.get("infants")) || 0;
  const tripType = searchParams.get("trip") || "roundtrip";
  const cabin = searchParams.get("cabin") || searchParams.get("class") || "economy";

  const tripClassMap: Record<string, string> = {
    economy: "Y",
    premium_economy: "W",
    business: "C",
    first: "F",
  };

  // Trigger search
  useEffect(() => {
    if (from && to && depart && !hasSearched) {
      setHasSearched(true);
      searchFlights({
        origin: from.toUpperCase(),
        destination: to.toUpperCase(),
        departDate: depart,
        returnDate: tripType === "roundtrip" ? returnDate : undefined,
        adults,
        children,
        infants,
        tripClass: tripClassMap[cabin] || "Y",
        currency: "EUR",
      });
    }
  }, [from, to, depart, returnDate, adults, children, infants, tripType, cabin, searchFlights, hasSearched]);

  // Get available airlines for filter
  const availableAirlines = useMemo(() => {
    const names = rawFlights
      .map(f => f.airlines?.[0])
      .filter(Boolean)
      .map(code => getAirlineName(code));
    return [...new Set(names)].sort();
  }, [rawFlights]);

  // Apply filters
  const filteredFlights = useMemo(() => {
    let result = [...rawFlights];

    // Direct-only filter
    if (filters.directOnly) {
      result = result.filter(f => f.stopsCount === 0);
    }

    // Stops filter
    if (filters.stops.length > 0 && !filters.directOnly) {
      result = result.filter((flight) => {
        return filters.stops.some((stop) => {
          if (stop === "direct") return flight.stopsCount === 0;
          if (stop === "1stop") return flight.stopsCount === 1;
          if (stop === "2stops") return flight.stopsCount >= 2;
          return true;
        });
      });
    }

    // Airlines filter
    if (filters.airlines.length > 0) {
      result = result.filter((flight) => {
        const flightAirline = getAirlineName(flight.airlines?.[0] || "");
        return filters.airlines.includes(flightAirline);
      });
    }

    // Price range filter
    result = result.filter(
      (flight) => flight.price.amount >= filters.priceRange[0] && flight.price.amount <= filters.priceRange[1]
    );

    // Departure time filter
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

  // Sort flights
  const sortedFlights = useMemo(() => {
    return sortFlights(filteredFlights, sortBy);
  }, [filteredFlights, sortBy]);

  // Format date
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

  // Handle "View Deal" click - opens clickUrl in NEW TAB
  const handleViewDeal = useCallback(
    (flight: Flight) => {
      if (loadingFlightId) return;
      
      if (!hasValidClickUrl(flight)) {
        toast({
          title: "Deal unavailable",
          description: "Booking link is not available for this offer.",
          variant: "destructive",
        });
        return;
      }

      setLoadingFlightId(flight.id);

      // Open in new tab using clickUrl directly from backend
      console.log("[ViewDeal] Opening:", flight.clickUrl);
      const newWindow = window.open(flight.clickUrl, "_blank", "noopener,noreferrer");
      
      if (!newWindow) {
        console.warn("[ViewDeal] Popup blocked");
        toast({
          title: "Popup blocked",
          description: "Please allow popups to view this deal.",
          variant: "destructive",
        });
      }
      
      setTimeout(() => setLoadingFlightId(null), 500);
    },
    [toast, loadingFlightId]
  );

  // Retry search
  const handleRetry = () => {
    setHasSearched(false);
    setLoadingFlightId(null);
  };

  // Filters sidebar
  const FiltersContent = () => (
    <FlightFilters 
      onFiltersChange={setFilters} 
      flights={rawFlights}
      showDirectOnly={true}
      onDirectOnlyChange={(checked) => {
        setFilters(prev => ({ ...prev, directOnly: checked }));
      }}
    />
  );

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
            <div className="flex-1">
              <h1 className="text-lg font-semibold text-foreground">
                {from} → {to}
              </h1>
              <p className="text-sm text-muted-foreground">
                {formatDate(depart)}
                {returnDate && ` – ${formatDate(returnDate)}`} · {adults + children + infants} traveler
                {adults + children + infants > 1 ? "s" : ""}
              </p>
            </div>

            {/* Mobile filter button */}
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
            <p className="text-lg font-semibold text-foreground">Searching flights...</p>
            <p className="text-muted-foreground">Finding the best deals for you</p>
          </div>
        )}

        {/* Error state */}
        {status === "error" && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
              <AlertCircle className="w-10 h-10 text-destructive" />
            </div>
            <p className="text-xl font-semibold text-foreground mb-2">Something went wrong</p>
            <p className="text-muted-foreground mb-6 max-w-md">
              {error || "Failed to search flights. Please try again."}
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
        {status === "complete" && sortedFlights.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 items-start">
            {/* Desktop Filters */}
            <aside className="hidden lg:block h-fit">
              <FiltersContent />
            </aside>

            {/* Flight list */}
            <div className="space-y-4 min-w-0">
              {/* Sort tabs */}
              <FlightSortTabs flights={sortedFlights} sortBy={sortBy} onSortChange={setSortBy} />

              {/* Results count */}
              <div className="text-sm text-muted-foreground bg-card p-3 rounded-xl border border-border">
                <span className="font-semibold text-foreground">{sortedFlights.length}</span> results found
              </div>

              {/* Flight cards */}
              <FlightResultsErrorBoundary>
                <div className="space-y-4">
                  {sortedFlights.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Plane className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No flights match your filters. Try adjusting them.</p>
                    </div>
                  ) : (
                    sortedFlights.map((flight, index) => (
                      <FlightCard
                        key={flight.id}
                        flight={flight}
                        isBestValue={index === 0 && sortBy === "best"}
                        isLoading={loadingFlightId === flight.id}
                        onViewDeal={() => handleViewDeal(flight)}
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
