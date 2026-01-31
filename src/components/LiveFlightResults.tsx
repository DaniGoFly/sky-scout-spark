import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ArrowLeft, AlertCircle, Plane, SlidersHorizontal, Info, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import FlightFilters, { FilterState } from "./FlightFilters";
import FlightSortTabs from "./FlightSortTabs";
import FlightSearchProgress from "./FlightSearchProgress";
import CompactSearchBar from "./CompactSearchBar";
import SkyscannerFlightCard from "./SkyscannerFlightCard";
import FlightResultsErrorBoundary from "./FlightResultsErrorBoundary";
import { useLiveFlightSearch, handleFlightClick } from "@/hooks/useLiveFlightSearch";
import { NormalizedFlight, sortFlights } from "@/lib/flightNormalizer";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";

// Maximum flights to display (Skyscanner-style limit)
const MAX_DISPLAY_FLIGHTS = 25;

const LiveFlightResults = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    flights: rawFlights,
    status,
    error,
    progress,
    isSearching,
    isDemo,
    liveUnavailable,
    searchFlights,
  } = useLiveFlightSearch();

  const [sortBy, setSortBy] = useState<"best" | "cheapest" | "fastest">("best");
  const [filters, setFilters] = useState<FilterState>({
    stops: [],
    airlines: [],
    priceRange: [0, 10000],
    departureTime: [],
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

  // Convert raw flights to normalized format
  const normalizedFlights = useMemo((): NormalizedFlight[] => {
    if (!rawFlights || !Array.isArray(rawFlights)) return [];

    return rawFlights
      .filter((f) => {
        // Validate essential fields
        if (!f || typeof f.price !== "number" || f.price <= 0) return false;
        if (!f.proposalId || !f.signature || !f.searchId || !f.resultsUrl) return false;
        if (!f.departureCode || !f.arrivalCode) return false;
        return true;
      })
      .map((f) => ({
        id: f.id || `${f.proposalId}-${f.signature}`,
        airlineCode: f.airlineCode || f.airline || "XX",
        airlineName: f.airline || f.airlineCode || "Unknown",
        airlineLogo: f.airlineLogo || "",
        flightNumber: f.flightNumber || "",
        originIata: (f.departureCode || from).toUpperCase(),
        destinationIata: (f.arrivalCode || to).toUpperCase(),
        departureTime: f.departureTime || "",
        arrivalTime: f.arrivalTime || "",
        duration: f.duration || "",
        durationMinutes: f.durationMinutes || 0,
        stops: f.stops ?? 0,
        stopAirports: [], // Could be populated from segments if available
        price: f.price,
        currency: f.currency || "EUR",
        searchId: f.searchId,
        resultsUrl: f.resultsUrl,
        proposalId: f.proposalId,
        signature: f.signature,
        hasValidBookingUrl: !!(f.searchId && f.resultsUrl && f.proposalId && f.signature),
      }));
  }, [rawFlights, from, to]);

  // Get available airlines for filter
  const availableAirlines = useMemo(() => {
    return [...new Set(normalizedFlights.map((f) => f.airlineName).filter(Boolean))].sort();
  }, [normalizedFlights]);

  // Apply filters
  const filteredFlights = useMemo(() => {
    let result = [...normalizedFlights];

    // Filter by stops
    if (filters.stops.length > 0) {
      result = result.filter((flight) => {
        return filters.stops.some((stop) => {
          if (stop === "direct") return flight.stops === 0;
          if (stop === "1stop") return flight.stops === 1;
          if (stop === "2stops") return flight.stops >= 2;
          return true;
        });
      });
    }

    // Filter by airlines
    if (filters.airlines.length > 0) {
      result = result.filter((flight) => filters.airlines.includes(flight.airlineName));
    }

    // Filter by price range
    result = result.filter(
      (flight) => flight.price >= filters.priceRange[0] && flight.price <= filters.priceRange[1]
    );

    // Filter by departure time
    if (filters.departureTime.length > 0) {
      result = result.filter((flight) => {
        if (!flight.departureTime) return true;
        const hour = parseInt(flight.departureTime.split(":")[0] || "0", 10);
        if (isNaN(hour)) return true;

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
  }, [normalizedFlights, filters]);

  // Sort and limit flights
  const displayFlights = useMemo(() => {
    const sorted = sortFlights(filteredFlights, sortBy);
    return sorted.slice(0, MAX_DISPLAY_FLIGHTS);
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

  // Handle "View Deal" click - opens in NEW TAB
  const handleViewDeal = useCallback(
    async (flight: NormalizedFlight) => {
      // Prevent double-clicks
      if (loadingFlightId) {
        console.log("[ViewDeal] Already processing a click, ignoring");
        return;
      }

      if (!flight.hasValidBookingUrl) {
        toast({
          title: "Deal unavailable",
          description: "Booking information is incomplete for this offer.",
          variant: "destructive",
        });
        return;
      }

      setLoadingFlightId(flight.id);

      try {
        const payload = {
          searchId: flight.searchId,
          proposalId: flight.proposalId,
          signature: flight.signature,
          resultsUrl: flight.resultsUrl,
        };

        console.log("[ViewDeal] Calling click action:", payload);

        const url = await handleFlightClick(payload);

        if (!url || typeof url !== "string" || !url.startsWith("http")) {
          console.error("[ViewDeal] Invalid URL received:", url);
          toast({
            title: "Deal unavailable",
            description: "Could not get provider link. Please try another offer.",
            variant: "destructive",
          });
          setLoadingFlightId(null);
          return;
        }

        console.log("[ViewDeal] Opening in new tab:", url);
        
        // Open in new tab (Skyscanner-style) - use noopener,noreferrer for security
        const newWindow = window.open(url, "_blank", "noopener,noreferrer");
        
        // If popup was blocked, show a toast with fallback
        if (!newWindow) {
          console.warn("[ViewDeal] Popup blocked, trying direct navigation");
          // Fallback: open in current tab if popup blocked
          window.location.href = url;
        }
        
        // Clear loading state after a short delay to prevent rapid re-clicks
        setTimeout(() => setLoadingFlightId(null), 500);
      } catch (err) {
        console.error("[ViewDeal] Error:", err);
        toast({
          title: "Error",
          description: "Something went wrong. Please try again.",
          variant: "destructive",
        });
        setLoadingFlightId(null);
      }
    },
    [toast, loadingFlightId]
  );

  // Retry search
  const handleRetry = () => {
    setHasSearched(false);
    setLoadingFlightId(null);
  };

  // Filters sidebar
  const FiltersContent = () => <FlightFilters onFiltersChange={setFilters} />;

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
          <FlightSearchProgress
            progress={progress}
            status={status === "searching" ? "creating" : (status as any)}
            flightsFound={rawFlights.length}
          />
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

        {/* Live unavailable */}
        {status === "no_results" && liveUnavailable && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 rounded-full bg-warning/10 flex items-center justify-center mb-6">
              <Info className="w-10 h-10 text-warning" />
            </div>
            <p className="text-xl font-semibold text-foreground mb-2">Live results not active yet</p>
            <p className="text-muted-foreground mb-6 max-w-md">
              Our live flight search is pending activation. Real-time pricing will be available soon.
            </p>
            <Button onClick={() => navigate("/flights")}>New Search</Button>
          </div>
        )}

        {/* No results */}
        {status === "no_results" && !liveUnavailable && !isSearching && (
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
        {(status === "complete" || (isSearching && rawFlights.length > 0)) && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Desktop Filters */}
            <aside className="hidden lg:block">
              <div className="sticky top-32 bg-card rounded-xl p-4 border border-border">
                <FiltersContent />
              </div>
            </aside>

            {/* Flight list */}
            <div className="lg:col-span-3 space-y-4">
              {/* Sample prices banner */}
              {isDemo && (
                <Alert className="border-primary/30 bg-primary/5">
                  <Info className="h-4 w-4 text-primary" />
                  <AlertTitle className="text-primary">Sample Prices</AlertTitle>
                  <AlertDescription className="text-primary/80">
                    Prices shown are estimates. Actual prices may vary.
                  </AlertDescription>
                </Alert>
              )}

              {/* Sort tabs */}
              <FlightSortTabs flights={filteredFlights} sortBy={sortBy} onSortChange={setSortBy} />

              {/* Results count */}
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  {filteredFlights.length.toLocaleString()} offers found · Showing{" "}
                  {displayFlights.length.toLocaleString()} of {filteredFlights.length.toLocaleString()}
                </span>
                {isSearching && (
                  <span className="text-primary flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Still searching...
                  </span>
                )}
              </div>

              {/* Flight cards */}
              <FlightResultsErrorBoundary>
                <div className="space-y-4">
                  {displayFlights.length === 0 && !isSearching ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Plane className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No flights match your filters. Try adjusting them.</p>
                    </div>
                  ) : (
                    displayFlights.map((flight, index) => (
                      <SkyscannerFlightCard
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

              {/* Show limited message */}
              {filteredFlights.length > MAX_DISPLAY_FLIGHTS && (
                <div className="text-center pt-4 text-sm text-muted-foreground">
                  <p>
                    Showing top {MAX_DISPLAY_FLIGHTS} results. Adjust filters to see different options.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveFlightResults;
