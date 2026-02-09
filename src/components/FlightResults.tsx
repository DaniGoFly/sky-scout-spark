import { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Loader2, AlertCircle, Plane, ArrowLeft, Search, Calendar, Info, Clock, Database, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import FlightFilters, { FilterState } from "./FlightFilters";
import FlightDetailsModal from "./FlightDetailsModal";
import FlightResultsSkeleton from "./FlightResultsSkeleton";
import CompactSearchBar from "./CompactSearchBar";
import PriceCalendar from "./PriceCalendar";
import FlightSummaryBar from "./FlightSummaryBar";
import FlightSortTabs from "./FlightSortTabs";
import MobileFiltersDrawer from "./MobileFiltersDrawer";
import SkyscannerFlightCard from "./SkyscannerFlightCard";
import { useFlightSearch, LiveFlight } from "@/hooks/useFlightSearch";
import { Flight, sortFlights, isEligibleForBestValue, getAirlineName } from "@/lib/flightNormalizer";
import { format, addDays } from "date-fns";
import { getDefaultDates, parseDateSafe } from "@/lib/dateUtils";

// Pagination configuration (Skyscanner-style)
const RESULTS_PER_PAGE = 25;
const MAX_VISIBLE_RESULTS = 100; // Hard cap - never render more than this

const FlightResults = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const fetchedAtRef = useRef<number>(Date.now());
  
  const { 
    flights, 
    isLoading, 
    error, 
    emptyReason, 
    responseStatus,
    userMessage,
    suggestedSearchDate,
    suggestedReturnDate,
    aviasalesDirectUrl,
    flexibleDatesUsed,
    searchFlights 
  } = useFlightSearch();
  
  const [sortBy, setSortBy] = useState<"best" | "cheapest" | "fastest">("best");
  const [filters, setFilters] = useState<FilterState>({
    stopsMode: "any",
    airlines: [],
    priceRange: [0, 5000],
    departureTime: [],
  });
  const [visibleCount, setVisibleCount] = useState(RESULTS_PER_PAGE);
  const [selectedFlight, setSelectedFlight] = useState<LiveFlight | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  

  // Extract search params
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";
  const depart = searchParams.get("depart") || "";
  const returnDate = searchParams.get("return") || "";
  const adults = Number(searchParams.get("adults")) || 1;
  const children = Number(searchParams.get("children")) || 0;
  const infants = Number(searchParams.get("infants")) || 0;
  const tripType = searchParams.get("trip") || "roundtrip";
  const travelClass = searchParams.get("class") || "economy";
  // directOnly from URL params is now handled via stopsMode filter only

  // Redirect multi-city searches to the dedicated page
  useEffect(() => {
    if (tripType === "multicity") {
      // Preserve all params and redirect
      navigate(`/flights/multicity?${searchParams.toString()}`, { replace: true });
    }
  }, [tripType, searchParams, navigate]);

  // Validate required params for non-multicity
  useEffect(() => {
    if (tripType !== "multicity" && (!from || !to)) {
      toast.error("Missing search parameters", {
        description: "Please enter origin and destination.",
      });
      navigate("/flights");
    }
  }, [from, to, tripType, navigate]);

  // Convert LiveFlight to Flight format for UI
  const normalizedFlights = useMemo((): Flight[] => {
    if (!flights.length) return [];
    
    return flights.map((f): Flight => {
      const priceValue = Math.round(f.price);
      const airlineCode = f.airline?.substring(0, 2).toUpperCase() || "XX";
      
      return {
        id: f.id,
        origin: f.departureCode || from.split(",")[0],
        destination: f.arrivalCode || to.split(",")[0],
        departureTime: f.departureTime || "",
        arrivalTime: f.arrivalTime || "",
        durationMinutes: f.durationMinutes || 0,
        stopsCount: f.stops || 0,
        stopsAirports: [],
        airlines: [airlineCode],
        flightNumbers: f.flightNumber ? [f.flightNumber] : [],
        price: { amount: priceValue, currency: "USD" },
        clickUrl: f.deepLink || "",
      };
    });
  }, [flights, from, to]);

  // Update fetchedAt when flights change
  useEffect(() => {
    if (flights.length > 0) {
      fetchedAtRef.current = Date.now();
    }
  }, [flights]);

  // Reset visible count when sort or filters change
  useEffect(() => {
    setVisibleCount(RESULTS_PER_PAGE);
  }, [sortBy, filters]);

  // Fetch flights when params change
  useEffect(() => {
    if (from && to && depart) {
      setVisibleCount(RESULTS_PER_PAGE);
      setHasSearched(true);
      fetchedAtRef.current = Date.now();
      
      searchFlights({
        origin: from.split(",")[0], // Use primary airport
        destination: to.split(",")[0],
        departDate: depart,
        returnDate: returnDate || undefined,
        adults,
        children,
        infants,
        tripType,
        travelClass,
      });
    }
  }, [from, to, depart, returnDate, adults, children, infants, tripType, travelClass, searchFlights]);

  // Handle price calendar date selection
  const handleDateSelect = (newDate: Date) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("depart", format(newDate, "yyyy-MM-dd"));
    setSearchParams(newParams);
  };

  // Handle suggested date click
  const handleSuggestedDateClick = () => {
    if (suggestedSearchDate) {
      const newParams = new URLSearchParams(searchParams);
      newParams.set("depart", suggestedSearchDate);
      if (suggestedReturnDate && tripType === "roundtrip") {
        newParams.set("return", suggestedReturnDate);
      }
      setSearchParams(newParams);
    }
  };

  // Get base price for calendar
  const basePrice = useMemo(() => {
    if (normalizedFlights.length === 0) return 350;
    return Math.min(...normalizedFlights.map(f => f.price.amount));
  }, [normalizedFlights]);

  // Filter and sort flights
  const processedFlights = useMemo(() => {
    let result = [...normalizedFlights];

    // Apply stops filter using stopsMode (single-choice, no directOnly from URL)
    if (filters.stopsMode === "direct") {
      result = result.filter(f => f.stopsCount === 0);
    } else if (filters.stopsMode === "1") {
      result = result.filter(f => f.stopsCount === 1);
    } else if (filters.stopsMode === "2plus") {
      result = result.filter(f => f.stopsCount >= 2);
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
        const hour = parseInt(flight.departureTime.split(":")[0]);
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

    // Sort flights
    return sortFlights(result, sortBy);
  }, [normalizedFlights, filters, sortBy]);

  // Slice to visible count (capped at MAX_VISIBLE_RESULTS)
  const displayedFlights = useMemo(() => {
    const cappedVisible = Math.min(visibleCount, MAX_VISIBLE_RESULTS);
    return processedFlights.slice(0, cappedVisible);
  }, [processedFlights, visibleCount]);

  const totalFiltered = processedFlights.length;
  const canShowMore = visibleCount < Math.min(totalFiltered, MAX_VISIBLE_RESULTS);
  const remainingToShow = Math.min(RESULTS_PER_PAGE, Math.min(totalFiltered, MAX_VISIBLE_RESULTS) - visibleCount);

  const handleShowMore = () => {
    setVisibleCount(prev => Math.min(prev + RESULTS_PER_PAGE, MAX_VISIBLE_RESULTS));
  };


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

  // Get display values
  const defaults = getDefaultDates();
  const displayFrom = from.split(",")[0] || "";
  const displayTo = to.split(",")[0] || "";
  const displayDepart = depart || format(defaults.depart, "yyyy-MM-dd");
  const displayReturn = returnDate || format(defaults.return, "yyyy-MM-dd");
  
  const departDateObj = parseDateSafe(depart);

  // Empty states
  const NoCachedPricesState = () => (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6">
        <Database className="w-12 h-12 text-primary" />
      </div>
      <p className="text-2xl text-foreground font-bold mb-3">No cached prices available</p>
      <p className="text-muted-foreground max-w-lg mb-4">
        These results use historical data. For live prices, search directly.
      </p>
      
      {aviasalesDirectUrl && (
        <Button asChild size="lg" className="gap-2 mb-6">
          <a href={aviasalesDirectUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="w-5 h-5" />
            Search Live Prices
          </a>
        </Button>
      )}
      
      <div className="flex flex-wrap gap-3 justify-center">
        <Button variant="outline" onClick={() => navigate("/flights")} className="gap-2">
          <Calendar className="w-4 h-4" />
          Try Different Dates
        </Button>
      </div>
    </div>
  );

  const FarFutureState = () => (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-24 h-24 rounded-full bg-blue-500/10 flex items-center justify-center mb-6">
        <Clock className="w-12 h-12 text-blue-500" />
      </div>
      <p className="text-2xl text-foreground font-bold mb-3">Prices not available yet</p>
      <p className="text-muted-foreground max-w-lg mb-6">
        {userMessage || "Airlines typically publish fares 9-11 months in advance."}
      </p>
      
      {suggestedSearchDate && (
        <Button size="lg" onClick={handleSuggestedDateClick} className="gap-2 mb-6">
          <Calendar className="w-5 h-5" />
          Search {formatDate(suggestedSearchDate)}
        </Button>
      )}
      
      <Button variant="outline" onClick={() => navigate("/flights")} className="gap-2">
        <Search className="w-4 h-4" />
        Modify Search
      </Button>
    </div>
  );

  const ErrorState = () => (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
        <AlertCircle className="w-10 h-10 text-destructive" />
      </div>
      <p className="text-xl text-foreground font-semibold mb-2">Service temporarily unavailable</p>
      <p className="text-muted-foreground max-w-md mb-6">{error || "We're having trouble connecting."}</p>
      
      <div className="flex flex-wrap gap-3 justify-center">
        {aviasalesDirectUrl && (
          <Button asChild className="gap-2">
            <a href={aviasalesDirectUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4" />
              Search Directly
            </a>
          </Button>
        )}
        <Button
          variant="outline"
          onClick={() => searchFlights({
            origin: displayFrom,
            destination: displayTo,
            departDate: displayDepart,
            returnDate: displayReturn || undefined,
            adults,
            tripType,
          })}
          className="gap-2"
        >
          <Search className="w-4 h-4" />
          Try Again
        </Button>
      </div>
    </div>
  );

  const FlexibleDatesBanner = () => {
    if (flexibleDatesUsed.length === 0) return null;
    
    return (
      <div className="mb-4 p-3 bg-primary/10 border border-primary/30 rounded-lg flex items-center gap-3">
        <Calendar className="w-5 h-5 text-primary shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            Showing prices for nearby dates
          </p>
          <p className="text-xs text-muted-foreground truncate">
            Results for: {flexibleDatesUsed.map(d => formatDate(d)).join(', ')}
          </p>
        </div>
      </div>
    );
  };

  return (
    <section className="py-6 px-4 bg-secondary/30 min-h-screen">
      <div className="container mx-auto">
        {/* Sticky Compact Search Bar */}
        <div className="sticky top-20 z-40 -mx-4 px-4 py-3 bg-background/95 backdrop-blur-sm border-b border-border mb-6">
          <CompactSearchBar />
        </div>

        {/* Search Summary Header */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
              <Plane className="w-7 h-7 text-primary shrink-0" />
              <span className="truncate">{displayFrom.toUpperCase()} → {displayTo.toUpperCase()}</span>
            </h1>
            <p className="text-muted-foreground mt-1 truncate">
              {formatDate(displayDepart)}
              {tripType === "roundtrip" && displayReturn && ` – ${formatDate(displayReturn)}`}
              {" • "}{adults + children + infants} traveler{(adults + children + infants) > 1 ? "s" : ""}
              {travelClass !== "economy" && ` • ${travelClass.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}`}
            </p>
          </div>
          
          <Button
            variant="outline"
            onClick={() => navigate("/flights")}
            className="gap-2 self-start shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            New Search
          </Button>
        </div>

        {/* Price Calendar */}
        {!isLoading && !error && normalizedFlights.length > 0 && departDateObj && (
          <PriceCalendar
            departDate={departDateObj}
            basePrice={basePrice}
            onDateSelect={handleDateSelect}
          />
        )}

        {isLoading ? (
          <div className="flex flex-col lg:flex-row gap-6 mt-6">
            <div className="hidden lg:block lg:w-72 shrink-0">
              <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
                <div className="flex items-center gap-2 text-foreground font-semibold">
                  <div className="w-5 h-5 bg-muted rounded animate-pulse" />
                  <span>Filters</span>
                </div>
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="space-y-3">
                    <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                    <div className="space-y-2">
                      {[...Array(3)].map((_, j) => (
                        <div key={j} className="h-6 bg-muted rounded animate-pulse" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-4 bg-card p-3 rounded-xl border border-border">
                <span className="text-sm text-muted-foreground truncate">Searching flights...</span>
                <Loader2 className="w-4 h-4 text-primary animate-spin ml-auto shrink-0" />
              </div>
              <FlightResultsSkeleton />
            </div>
          </div>
        ) : error || emptyReason === 'service_unavailable' ? (
          <ErrorState />
        ) : !hasSearched ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <Search className="w-10 h-10 text-primary" />
            </div>
            <p className="text-xl text-foreground font-semibold mb-2">Ready to search</p>
            <p className="text-muted-foreground max-w-md">
              Enter your travel details above to find the best flight deals
            </p>
          </div>
        ) : normalizedFlights.length === 0 ? (
          emptyReason === 'far_future' ? <FarFutureState /> : <NoCachedPricesState />
        ) : (
          /* Main Results View with Independent Scrolling */
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Filters Sidebar - Sticky & Independently Scrollable */}
            <div className="hidden lg:block lg:w-72 shrink-0">
              <FlightFilters
                onFiltersChange={setFilters}
                flights={normalizedFlights}
              />
            </div>

            {/* Results Column */}
            <div className="flex-1 space-y-4 min-w-0">
              {/* Flexible dates banner */}
              <FlexibleDatesBanner />
              
              {/* Skyscanner-style Sort Tabs */}
              <FlightSortTabs 
                flights={processedFlights}
                sortBy={sortBy}
                onSortChange={setSortBy}
              />

              {/* Mobile Filter Button + Count */}
              <div className="flex items-center justify-between gap-3 lg:hidden bg-card p-3 rounded-xl border border-border">
                <p className="text-sm text-muted-foreground truncate">
                  <span className="font-semibold text-foreground">{totalFiltered}</span> flights found
                </p>
                <MobileFiltersDrawer 
                  onFiltersChange={setFilters}
                  activeFiltersCount={
                    (filters.stopsMode !== "any" ? 1 : 0) +
                    filters.airlines.length + 
                    filters.departureTime.length +
                    (filters.priceRange[0] > 0 || filters.priceRange[1] < 5000 ? 1 : 0)
                  }
                  flightCount={totalFiltered}
                  flights={normalizedFlights}
                />
              </div>

              {/* Desktop Results Count - Skyscanner style */}
              <div className="hidden lg:flex items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border">
                <p className="text-sm text-muted-foreground truncate">
                  <span className="font-semibold text-foreground">{totalFiltered.toLocaleString()}</span> results found
                  {displayedFlights.length < totalFiltered && (
                    <span> · Showing top {displayedFlights.length}</span>
                  )}
                  {responseStatus === 'OK_FLEXIBLE' && <span className="text-primary ml-1">(nearby dates)</span>}
                </p>
              </div>

              {/* Flight Cards */}
              {displayedFlights.map((flight, index) => {
                const showBestValue = index === 0 && sortBy === "best" && isEligibleForBestValue(flight);
                
                return (
                  <SkyscannerFlightCard
                    key={flight.id}
                    flight={flight}
                    isBestValue={showBestValue}
                  />
                );
              })}

              {/* Show More Button - Progressive Loading */}
              {canShowMore && (
                <div className="text-center pt-4">
                  <Button
                    variant="outline"
                    onClick={handleShowMore}
                    className="gap-2"
                  >
                    Show {remainingToShow} more flights
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    Showing {displayedFlights.length} of {Math.min(totalFiltered, MAX_VISIBLE_RESULTS).toLocaleString()} results
                    {totalFiltered > MAX_VISIBLE_RESULTS && (
                      <span className="text-muted-foreground/70"> (capped at {MAX_VISIBLE_RESULTS})</span>
                    )}
                  </p>
                </div>
              )}

              {/* Max results reached message */}
              {visibleCount >= MAX_VISIBLE_RESULTS && totalFiltered > MAX_VISIBLE_RESULTS && (
                <div className="text-center pt-4 text-sm text-muted-foreground border-t border-border">
                  <p>
                    Showing top {MAX_VISIBLE_RESULTS} results. Use filters to narrow your search.
                  </p>
                </div>
              )}

              {/* Direct search fallback */}
              {aviasalesDirectUrl && (
                <div className="text-center pt-4 pb-2 border-t border-border mt-4">
                  <p className="text-sm text-muted-foreground mb-2">
                    For live availability and booking:
                  </p>
                  <Button asChild variant="outline" className="gap-2">
                    <a href={aviasalesDirectUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4" />
                      Search Live Prices
                    </a>
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Flight Details Modal */}
        <FlightDetailsModal
          flight={selectedFlight}
          isOpen={!!selectedFlight}
          onClose={() => setSelectedFlight(null)}
        />
      </div>
    </section>
  );
};

export default FlightResults;
