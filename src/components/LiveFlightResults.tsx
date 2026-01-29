import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ArrowLeft, AlertCircle, Plane, SlidersHorizontal, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import FlightFilters, { FilterState } from "./FlightFilters";
import FlightSummaryBar from "./FlightSummaryBar";
import FlightSearchProgress from "./FlightSearchProgress";
import CompactSearchBar from "./CompactSearchBar";
import { useLiveFlightSearch, LiveFlightResult, handleFlightClick } from "@/hooks/useLiveFlightSearch";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";

// City to airport code mapping
const CITY_AIRPORT_CODES: Record<string, string> = {
  "paris": "CDG", "tokyo": "NRT", "new york": "JFK", "dubai": "DXB",
  "london": "LHR", "barcelona": "BCN", "los angeles": "LAX", "miami": "MIA",
  "sydney": "SYD", "singapore": "SIN",
};

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
  const [showAllFlights, setShowAllFlights] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

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
        currency: "EUR" // Using EUR as specified
      });
    }
  }, [from, to, depart, returnDate, adults, children, infants, tripType, cabin, searchFlights, hasSearched]);

  // Get unique airlines for filters
  const availableAirlines = useMemo(() => {
    return [...new Set(flights.map(f => f.airline))].sort();
  }, [flights]);

  // Filter and sort flights
  const processedFlights = useMemo(() => {
    let result = [...flights];

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
      result = result.filter((flight) => filters.airlines.includes(flight.airline));
    }

    // Filter by price range
    result = result.filter(
      (flight) => flight.price >= filters.priceRange[0] && flight.price <= filters.priceRange[1]
    );

    // Filter by departure time
    if (filters.departureTime.length > 0) {
      result = result.filter((flight) => {
        const hour = parseInt(flight.departureTime.split(":")[0]);
        return filters.departureTime.some((time) => {
          if (time === "morning") return hour >= 6 && hour < 12;
          if (time === "afternoon") return hour >= 12 && hour < 18;
          if (time === "evening") return hour >= 18 && hour < 24;
          if (time === "night") return hour >= 0 && hour < 6;
          return true;
        });
      });
    }

    // Sort
    switch (sortBy) {
      case "cheapest":
        result.sort((a, b) => a.price - b.price);
        break;
      case "fastest":
        result.sort((a, b) => a.durationMinutes - b.durationMinutes);
        break;
      case "best":
      default:
        // Weighted score: price + stops penalty + duration penalty
        result.sort((a, b) => {
          const scoreA = a.price + a.stops * 80 + a.durationMinutes * 0.5;
          const scoreB = b.price + b.stops * 80 + b.durationMinutes * 0.5;
          return scoreA - scoreB;
        });
        break;
    }

    return result;
  }, [flights, filters, sortBy]);

  const displayedFlights = showAllFlights ? processedFlights : processedFlights.slice(0, 10);

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

  // Handle "View deal" - calls backend click action then redirects
  const handleViewDeal = async (flight: LiveFlightResult) => {
    // Validate required booking data
    if (!flight.searchId || !flight.proposalId) {
      toast({
        title: "Deal unavailable",
        description: "Booking information is incomplete for this offer.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Call backend click action using the external Supabase endpoint
      const url = await handleFlightClick({
        searchId: flight.searchId,
        proposalId: flight.proposalId,
        signature: flight.signature || "",
        resultsUrl: flight.resultsUrl || "",
      });

      if (!url) {
        toast({
          title: "Deal unavailable",
          description: "Provider link unavailable for this offer.",
          variant: "destructive"
        });
        return;
      }

      // Redirect to the provider URL
      window.location.href = url;
    } catch (err) {
      console.error("[ViewDeal] Error:", err);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
    }
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

        {/* Error state */}
        {status === 'error' && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
              <AlertCircle className="w-10 h-10 text-destructive" />
            </div>
            <p className="text-xl font-semibold text-foreground mb-2">Something went wrong</p>
            <p className="text-muted-foreground mb-6">{error || "Failed to search flights"}</p>
            <Button onClick={() => { setHasSearched(false); }}>Try Again</Button>
          </div>
        )}

        {/* No results state - live unavailable */}
        {status === 'no_results' && liveUnavailable && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center mb-6">
              <Info className="w-10 h-10 text-amber-500" />
            </div>
            <p className="text-xl font-semibold text-foreground mb-2">Live results not active yet</p>
            <p className="text-muted-foreground mb-6 max-w-md">
              Our live flight search is pending activation. Real-time pricing will be available soon.
              In the meantime, try adjusting your search or check back later.
            </p>
            <Button onClick={() => navigate("/flights")}>New Search</Button>
          </div>
        )}

        {/* No results state - no flights found */}
        {status === 'no_results' && !liveUnavailable && (
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
                <span>{processedFlights.length} flights found</span>
                {isSearching && <span className="text-primary">Still searching...</span>}
              </div>

              {/* Flight cards */}
              {displayedFlights.map((flight, index) => (
                <div
                  key={flight.id}
                  className={`bg-card rounded-xl p-6 border border-border hover:border-primary/30 transition-all hover:shadow-lg ${
                    index === 0 && sortBy === 'best' ? 'ring-2 ring-primary' : ''
                  }`}
                >
                  {index === 0 && sortBy === 'best' && (
                    <div className="inline-block bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full mb-4">
                      Best Value
                    </div>
                  )}
                  
                  <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                    {/* Airline */}
                    <div className="flex items-center gap-4 lg:w-40">
                      <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center overflow-hidden">
                        <img
                          src={flight.airlineLogo}
                          alt={flight.airline}
                          className="w-8 h-8 object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/placeholder.svg";
                          }}
                        />
                      </div>
                      <span className="font-semibold text-foreground text-sm">{flight.airline}</span>
                    </div>

                    {/* Times */}
                    <div className="flex-1 flex items-center gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-foreground">{flight.departureTime}</p>
                        <p className="text-sm text-muted-foreground">{flight.departureCode}</p>
                      </div>

                      <div className="flex-1 flex flex-col items-center px-4">
                        <span className="text-sm text-muted-foreground">{flight.duration}</span>
                        <div className="w-full h-0.5 bg-border relative my-2">
                          <Plane className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 text-primary rotate-90" />
                        </div>
                        <span className={`text-xs ${flight.stops === 0 ? "text-primary" : "text-muted-foreground"}`}>
                          {getStopsLabel(flight.stops)}
                        </span>
                      </div>

                      <div className="text-center">
                        <p className="text-2xl font-bold text-foreground">{flight.arrivalTime}</p>
                        <p className="text-sm text-muted-foreground">{flight.arrivalCode}</p>
                      </div>
                    </div>

                    {/* Price & Book */}
                    <div className="flex items-center justify-between lg:flex-col lg:items-end gap-3">
                      <div className="text-right">
                        <p className="text-3xl font-bold text-foreground">
                          {flight.currency === 'EUR' ? '€' : flight.currency === 'USD' ? '$' : flight.currency}{flight.price}
                        </p>
                        <p className="text-xs text-muted-foreground">per person</p>
                      </div>
                      <Button
                        onClick={() => handleViewDeal(flight)}
                        className="gap-2"
                        size="lg"
                      >
                        View Deal
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Show more */}
              {processedFlights.length > 10 && !showAllFlights && (
                <div className="text-center pt-4">
                  <Button variant="outline" onClick={() => setShowAllFlights(true)}>
                    Show {processedFlights.length - 10} more flights
                  </Button>
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
