import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ArrowLeft, AlertCircle, Plane, SlidersHorizontal, Info, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import FlightFilters, { FilterState } from "./FlightFilters";
import FlightSummaryBar from "./FlightSummaryBar";
import FlightSearchProgress from "./FlightSearchProgress";
import CompactSearchBar from "./CompactSearchBar";
import { useLiveFlightSearch, LiveFlightResult, handleFlightClick } from "@/hooks/useLiveFlightSearch";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import AirlineMark from "@/components/AirlineMark";
import FlightResultsErrorBoundary from "@/components/FlightResultsErrorBoundary";

// City to airport code mapping
const CITY_AIRPORT_CODES: Record<string, string> = {
  "paris": "CDG", "tokyo": "NRT", "new york": "JFK", "dubai": "DXB",
  "london": "LHR", "barcelona": "BCN", "los angeles": "LAX", "miami": "MIA",
  "sydney": "SYD", "singapore": "SIN",
};

/**
 * Validate that a flight has all required data for rendering
 * This prevents white-screen crashes from incomplete API responses
 */
function isValidFlight(flight: LiveFlightResult | null | undefined): flight is LiveFlightResult {
  if (!flight) return false;
  
  // Must have a valid price (number > 0)
  if (typeof flight.price !== "number" || flight.price <= 0) return false;
  
  // Must have booking metadata for the click action
  if (!flight.searchId || !flight.resultsUrl || !flight.proposalId || !flight.signature) return false;
  
  // Must have at least departure/arrival codes
  if (!flight.departureCode || !flight.arrivalCode) return false;
  
  return true;
}

/**
 * Generate a stable React key for a flight card
 */
function getStableKey(flight: LiveFlightResult, index: number): string {
  // Prefer proposalId + signature combo (most unique)
  if (flight.proposalId && flight.signature) {
    return `${flight.proposalId}-${flight.signature}`;
  }
  // Fallback to flight.id
  if (flight.id) {
    return flight.id;
  }
  // Last resort: index-based
  return `flight-${index}`;
}

const LiveFlightResults = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { flights, status, error, progress, isSearching, isDemo, liveUnavailable, searchFlights, cancelSearch } = useLiveFlightSearch();
  
  const [sortBy, setSortBy] = useState<"best" | "cheapest" | "fastest">("best");
  const [filters, setFilters] = useState<FilterState>({
    stops: [],
    airlines: [],
    priceRange: [0, 10000],
    departureTime: [],
  });
  // Pagination: show first PAGE_SIZE flights, then add PAGE_SIZE more on each "Show more"
  const PAGE_SIZE = 25;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [hasSearched, setHasSearched] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  
  // Track loading state for individual flight buttons
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

  // Map cabin class to API format
  const tripClassMap: Record<string, string> = {
    economy: "Y", premium_economy: "W", business: "C", first: "F"
  };

  // Trigger search when params change
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
        currency: "EUR"
      });
    }
  }, [from, to, depart, returnDate, adults, children, infants, tripType, cabin, searchFlights, hasSearched]);

  // DEFENSIVE: Filter out invalid flights BEFORE any processing
  const validFlights = useMemo(() => {
    return (flights || []).filter(isValidFlight);
  }, [flights]);

  // Get unique airlines for filters (from valid flights only)
  const availableAirlines = useMemo(() => {
    return [...new Set(validFlights.map(f => f.airline).filter(Boolean))].sort();
  }, [validFlights]);

  // Filter and sort flights (using validated flights)
  const processedFlights = useMemo(() => {
    let result = [...validFlights];

    // Filter by stops
    if (filters.stops.length > 0) {
      result = result.filter((flight) => {
        const stops = flight.stops ?? 0;
        return filters.stops.some((stop) => {
          if (stop === "direct") return stops === 0;
          if (stop === "1stop") return stops === 1;
          if (stop === "2stops") return stops >= 2;
          return true;
        });
      });
    }

    // Filter by airlines
    if (filters.airlines.length > 0) {
      result = result.filter((flight) => flight.airline && filters.airlines.includes(flight.airline));
    }

    // Filter by price range (with defensive check)
    result = result.filter((flight) => {
      const price = flight.price ?? 0;
      return price >= filters.priceRange[0] && price <= filters.priceRange[1];
    });

    // Filter by departure time (with defensive check)
    if (filters.departureTime.length > 0) {
      result = result.filter((flight) => {
        const timeStr = flight.departureTime || "";
        const hour = parseInt(timeStr.split(":")[0] || "0", 10);
        if (isNaN(hour)) return true; // Don't filter if time is invalid
        
        return filters.departureTime.some((time) => {
          if (time === "morning") return hour >= 6 && hour < 12;
          if (time === "afternoon") return hour >= 12 && hour < 18;
          if (time === "evening") return hour >= 18 && hour < 24;
          if (time === "night") return hour >= 0 && hour < 6;
          return true;
        });
      });
    }

    // Sort with defensive number handling
    switch (sortBy) {
      case "cheapest":
        result.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
        break;
      case "fastest":
        result.sort((a, b) => (a.durationMinutes ?? 0) - (b.durationMinutes ?? 0));
        break;
      case "best":
      default:
        // Weighted score: price + stops penalty + duration penalty
        result.sort((a, b) => {
          const scoreA = (a.price ?? 0) + (a.stops ?? 0) * 80 + (a.durationMinutes ?? 0) * 0.5;
          const scoreB = (b.price ?? 0) + (b.stops ?? 0) * 80 + (b.durationMinutes ?? 0) * 0.5;
          return scoreA - scoreB;
        });
        break;
    }

    return result;
  }, [validFlights, filters, sortBy]);

  // SAFE: Paginate with defensive slicing - show only visibleCount flights
  const displayedFlights = useMemo(() => {
    const safeProcessed = processedFlights || [];
    return safeProcessed.slice(0, visibleCount);
  }, [processedFlights, visibleCount]);
  
  // Calculate remaining flights for "Show more" button
  const remainingFlights = Math.max(0, (processedFlights?.length ?? 0) - visibleCount);
  const hasMoreFlights = remainingFlights > 0;

  // Format date for display
  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        weekday: "short", month: "short", day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  // Check if flight has all required booking data
  const hasValidBookingData = (flight: LiveFlightResult): boolean => {
    return !!(flight.searchId && flight.proposalId && flight.signature && flight.resultsUrl);
  };

  // Handle "View deal" - calls backend click action then redirects
  // DEFENSIVE: Wrapped in try-catch to prevent white screen on any error
  const handleViewDeal = async (flight: LiveFlightResult) => {
    // Validate required booking data
    if (!hasValidBookingData(flight)) {
      toast({
        title: "Deal unavailable",
        description: "Booking information is incomplete for this offer. Please try another.",
        variant: "destructive"
      });
      return;
    }

    // Set loading state for this specific flight
    const flightId = flight.id || `${flight.proposalId}-${flight.signature}`;
    setLoadingFlightId(flightId);

    const payload = {
      searchId: flight.searchId,
      proposalId: flight.proposalId,
      signature: flight.signature,
      resultsUrl: flight.resultsUrl,
    };
    
    console.log("[ViewDeal] Sending click payload to backend:", payload);

    try {
      const url = await handleFlightClick(payload);

      if (!url) {
        toast({
          title: "Deal unavailable",
          description: "Could not get provider link. Please try another offer.",
          variant: "destructive"
        });
        setLoadingFlightId(null);
        return;
      }

      // Validate URL before redirect
      if (typeof url !== "string" || !url.startsWith("http")) {
        console.error("[ViewDeal] Invalid URL received:", url);
        toast({
          title: "Invalid redirect",
          description: "Received an invalid booking link. Please try another offer.",
          variant: "destructive"
        });
        setLoadingFlightId(null);
        return;
      }

      console.log("[ViewDeal] Redirecting to:", url);
      // Redirect to the provider URL using window.location.href (NOT router)
      window.location.href = url;
    } catch (err) {
      console.error("[ViewDeal] Error:", err);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
      setLoadingFlightId(null);
    }
  };
  
  // Handle "Show more" button - SAFE: only increments visible count, no fetching
  const handleShowMore = () => {
    setVisibleCount(prev => prev + PAGE_SIZE);
  };

  // Handle retry after error
  const handleRetry = () => {
    setHasSearched(false);
    setLoadingFlightId(null);
  };

  // Get stops label
  const getStopsLabel = (stops: number): string => {
    if (stops === 0) return "Direct";
    if (stops === 1) return "1 stop";
    return `${stops} stops`;
  };

  // Filters sidebar content
  const FiltersContent = () => (
    <FlightFilters
      onFiltersChange={setFilters}
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
                {formatDate(depart)}{returnDate && ` – ${formatDate(returnDate)}`} · {adults + children + infants} traveler{(adults + children + infants) > 1 ? "s" : ""}
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

          {/* Compact search bar for editing */}
          <CompactSearchBar />
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Loading state with progress */}
        {isSearching && (
          <FlightSearchProgress 
            progress={progress} 
            status={status === 'searching' ? 'creating' : status as 'creating' | 'polling' | 'complete' | 'error' | 'idle' | 'no_results'} 
            flightsFound={flights.length} 
          />
        )}

        {/* Error state - with retry button */}
        {status === 'error' && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
              <AlertCircle className="w-10 h-10 text-destructive" />
            </div>
            <p className="text-xl font-semibold text-foreground mb-2">Something went wrong</p>
            <p className="text-muted-foreground mb-6 max-w-md">{error || "Failed to search flights. Please check your connection and try again."}</p>
            <div className="flex gap-3">
              <Button onClick={handleRetry}>Try Again</Button>
              <Button variant="outline" onClick={() => navigate("/flights")}>New Search</Button>
            </div>
          </div>
        )}

        {/* No results state - live unavailable */}
        {status === 'no_results' && liveUnavailable && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 rounded-full bg-warning/10 flex items-center justify-center mb-6">
              <Info className="w-10 h-10 text-warning" />
            </div>
            <p className="text-xl font-semibold text-foreground mb-2">Live results not active yet</p>
            <p className="text-muted-foreground mb-6 max-w-md">
              Our live flight search is pending activation. Real-time pricing will be available soon.
              In the meantime, try adjusting your search or check back later.
            </p>
            <Button onClick={() => navigate("/flights")}>New Search</Button>
          </div>
        )}

        {/* No results state - no flights found (only after polling is done) */}
        {status === 'no_results' && !liveUnavailable && !isSearching && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
              <Plane className="w-10 h-10 text-muted-foreground" />
            </div>
            <p className="text-xl font-semibold text-foreground mb-2">No flights found</p>
            <p className="text-muted-foreground mb-6">
              We couldn't find any flights for this route and date. Try different dates or destinations.
            </p>
            <Button onClick={() => navigate("/flights")}>New Search</Button>
          </div>
        )}

        {/* Results */}
        {(status === 'complete' || (isSearching && flights.length > 0)) && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Desktop Filters */}
            <aside className="hidden lg:block">
              <div className="sticky top-32 bg-card rounded-xl p-4 border border-border">
                <FiltersContent />
              </div>
            </aside>

            {/* Flight list */}
            <div className="lg:col-span-3 space-y-4">
              {/* Sample prices indicator */}
              {isDemo && (
                <Alert className="border-primary/30 bg-primary/5">
                  <Info className="h-4 w-4 text-primary" />
                  <AlertTitle className="text-primary">Sample Prices</AlertTitle>
                  <AlertDescription className="text-primary/80">
                    Prices shown are estimates for this route. Actual prices may vary at time of booking.
                  </AlertDescription>
                </Alert>
              )}

              {/* Summary bar */}
              <FlightSummaryBar 
                flights={processedFlights as any}
                sortBy={sortBy}
                onSortChange={setSortBy}
              />

              {/* Results count */}
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  {processedFlights.length.toLocaleString()} offers found · Showing {displayedFlights.length.toLocaleString()} of {processedFlights.length.toLocaleString()}
                </span>
                {isSearching && (
                  <span className="text-primary flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Still searching...
                  </span>
                )}
              </div>

              {/* Flight cards - with defensive rendering */}
              <FlightResultsErrorBoundary>
                {displayedFlights.map((flight, index) => {
                  // Extra safety check - skip if flight became invalid
                  if (!isValidFlight(flight)) {
                    return null;
                  }

                  const isLoading = loadingFlightId === flight.id;
                  const hasBookingData = !!(flight.searchId && flight.proposalId && flight.signature && flight.resultsUrl);
                  const isDisabled = !hasBookingData || isLoading;

                  // Safe access to all display fields (NO placeholders)
                  const airlineCode = (flight.airlineCode || flight.airline || "??").toUpperCase();
                  const airlineName = flight.airline || airlineCode;
                  const airlineLogo = flight.airlineLogo || "";
                  const departTime = flight.departureTime || "";
                  const arriveTime = flight.arrivalTime || "";
                  const depCode = (flight.departureCode || from.toUpperCase()).toUpperCase();
                  const arrCode = (flight.arrivalCode || to.toUpperCase()).toUpperCase();
                  const duration = flight.duration || "";
                  const stops = flight.stops ?? 0;
                  const price = flight.price ?? 0;
                  const currency = flight.currency || "EUR";
                  const stableKey = getStableKey(flight, index);

                  return (
                    <div
                      key={stableKey}
                      className={`bg-card rounded-xl p-6 border border-border hover:border-primary/30 transition-all hover:shadow-lg ${
                        index === 0 && sortBy === "best" ? "ring-2 ring-primary" : ""
                      }`}
                    >
                      {index === 0 && sortBy === "best" && (
                        <div className="inline-block bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full mb-4">
                          Best Value
                        </div>
                      )}

                      <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                        {/* Airline */}
                        <div className="flex items-center gap-4 lg:w-40">
                          <AirlineMark airlineCode={airlineCode} airlineName={airlineName} logoUrl={airlineLogo} />
                          <span className="font-semibold text-foreground text-sm">{airlineName}</span>
                        </div>

                        {/* Times (hide time text if missing; always show IATA codes) */}
                        <div className="flex-1 flex items-center gap-4">
                          <div className="text-center">
                            {departTime ? <p className="text-2xl font-bold text-foreground">{departTime}</p> : null}
                            <p className="text-sm text-muted-foreground">{depCode}</p>
                          </div>

                          <div className="flex-1 flex flex-col items-center px-4">
                            {duration ? <span className="text-sm text-muted-foreground">{duration}</span> : null}
                            <div className="w-full h-0.5 bg-border relative my-2">
                              <Plane className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 text-primary rotate-90" />
                            </div>
                            <span className={`text-xs ${stops === 0 ? "text-primary" : "text-muted-foreground"}`}>
                              {getStopsLabel(stops)}
                            </span>
                          </div>

                          <div className="text-center">
                            {arriveTime ? <p className="text-2xl font-bold text-foreground">{arriveTime}</p> : null}
                            <p className="text-sm text-muted-foreground">{arrCode}</p>
                          </div>
                        </div>

                        {/* Price & Book */}
                        <div className="flex items-center justify-between lg:flex-col lg:items-end gap-3">
                          <div className="text-right">
                            <p className="text-3xl font-bold text-foreground">
                              {currency === "EUR" ? "€" : currency === "USD" ? "$" : currency}
                              {price}
                            </p>
                            <p className="text-xs text-muted-foreground">per person</p>
                          </div>
                          <Button
                            onClick={() => handleViewDeal(flight)}
                            className="gap-2 min-w-[120px]"
                            size="lg"
                            disabled={isDisabled}
                            title={!hasBookingData ? "Booking data incomplete" : undefined}
                          >
                            {isLoading ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Opening...
                              </>
                            ) : (
                              "View Deal"
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Show more - SAFE state update, only reveals more flights */}
                {hasMoreFlights && (
                  <div className="text-center pt-4">
                    <Button variant="outline" onClick={handleShowMore}>
                      Show {Math.min(remainingFlights, PAGE_SIZE)} more offers
                      {remainingFlights > PAGE_SIZE && ` (${remainingFlights} remaining)`}
                    </Button>
                  </div>
                )}
              </FlightResultsErrorBoundary>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveFlightResults;
