import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Loader2, AlertCircle, Plane, ArrowLeft, Search, Calendar, Info, Clock, Database, ExternalLink, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import FlightCard from "./FlightCard";
import FlightFilters, { FilterState } from "./FlightFilters";
import FlightDetailsModal from "./FlightDetailsModal";
import FlightResultsSkeleton from "./FlightResultsSkeleton";
import CompactSearchBar from "./CompactSearchBar";
import PriceCalendar from "./PriceCalendar";
import FlightSummaryBar from "./FlightSummaryBar";
import MobileFiltersDrawer from "./MobileFiltersDrawer";
import { useFlightSearch, LiveFlight } from "@/hooks/useFlightSearch";
import { format, addDays } from "date-fns";
import { getDefaultDates, parseDateSafe } from "@/lib/dateUtils";

// City to airport code mapping for auto-search
const CITY_AIRPORT_CODES: Record<string, string> = {
  "paris": "CDG",
  "tokyo": "NRT",
  "new york": "JFK",
  "dubai": "DXB",
  "london": "LHR",
  "barcelona": "BCN",
  "los angeles": "LAX",
  "miami": "MIA",
  "sydney": "SYD",
  "singapore": "SIN",
};

const FlightResults = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
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
    debugInfo: apiDebugInfo, 
    searchFlights 
  } = useFlightSearch();
  const [sortBy, setSortBy] = useState<"best" | "cheapest" | "fastest">("best");
  const [filters, setFilters] = useState<FilterState>({
    stops: [],
    airlines: [],
    priceRange: [0, 5000],
    departureTime: [],
  });
  const [showAllFlights, setShowAllFlights] = useState(false);
  const [selectedFlight, setSelectedFlight] = useState<LiveFlight | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Check for debug mode
  const isDebugMode = searchParams.get("debug") === "1";

  // Extract search params - unified schema
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";
  const depart = searchParams.get("depart") || "";
  const returnDate = searchParams.get("return") || "";
  const adults = Number(searchParams.get("adults")) || 1;
  const children = Number(searchParams.get("children")) || 0;
  const infants = Number(searchParams.get("infants")) || 0;
  const tripType = searchParams.get("trip") || "roundtrip";
  const travelClass = searchParams.get("class") || "economy";
  const autoSearch = searchParams.get("autoSearch") === "true";

  // Handle auto-search from destination cards
  useEffect(() => {
    if (autoSearch && to && !from) {
      const airportCode = CITY_AIRPORT_CODES[to.toLowerCase()] || to.toUpperCase().slice(0, 3);
      const defaults = getDefaultDates();
      const defaultDepart = format(defaults.depart, "yyyy-MM-dd");
      const defaultReturn = format(defaults.return, "yyyy-MM-dd");
      
      setShowAllFlights(false);
      setHasSearched(true);
      
      searchFlights({
        origin: "NYC",
        destination: airportCode,
        departDate: defaultDepart,
        returnDate: defaultReturn,
        adults: 1,
        tripType: "roundtrip",
        debug: isDebugMode,
      });
    }
  }, [autoSearch, to, from, searchFlights, isDebugMode]);

  // Fetch flights when params change (regular search)
  useEffect(() => {
    if (from && to && depart && !autoSearch) {
      setShowAllFlights(false);
      setHasSearched(true);
      
      searchFlights({
        origin: from,
        destination: to,
        departDate: depart,
        returnDate: returnDate || undefined,
        adults,
        children,
        infants,
        tripType,
        travelClass,
        debug: isDebugMode,
      });
    }
  }, [from, to, depart, returnDate, adults, children, infants, tripType, travelClass, searchFlights, autoSearch, isDebugMode]);

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
      } else if (tripType === "roundtrip") {
        // Calculate return date if not provided
        const suggestedDepart = parseDateSafe(suggestedSearchDate);
        if (suggestedDepart) {
          const newReturn = addDays(suggestedDepart, 7);
          newParams.set("return", format(newReturn, "yyyy-MM-dd"));
        }
      }
      setSearchParams(newParams);
    }
  };

  // Get base price for calendar
  const basePrice = useMemo(() => {
    if (flights.length === 0) return 350;
    return Math.min(...flights.map(f => f.price));
  }, [flights]);

  // Filter and sort flights
  const processedFlights = useMemo(() => {
    let result = [...flights];

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

    if (filters.airlines.length > 0) {
      result = result.filter((flight) =>
        filters.airlines.includes(flight.airline)
      );
    }

    result = result.filter(
      (flight) =>
        flight.price >= filters.priceRange[0] &&
        flight.price <= filters.priceRange[1]
    );

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

    switch (sortBy) {
      case "cheapest":
        result.sort((a, b) => a.price - b.price);
        break;
      case "fastest":
        result.sort((a, b) => a.durationMinutes - b.durationMinutes);
        break;
      case "best":
      default:
        result.sort((a, b) => a.price + a.stops * 100 - (b.price + b.stops * 100));
        break;
    }

    return result;
  }, [flights, filters, sortBy]);

  const displayedFlights = showAllFlights
    ? processedFlights
    : processedFlights.slice(0, 6);
  const totalFiltered = processedFlights.length;

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
  const displayFrom = from || (autoSearch ? "NYC" : "");
  const displayTo = to || "";
  const displayDepart = depart || (autoSearch ? format(defaults.depart, "yyyy-MM-dd") : "");
  const displayReturn = returnDate || (autoSearch ? format(defaults.return, "yyyy-MM-dd") : "");
  
  const departDateObj = parseDateSafe(depart);

  // Debug panel component
  const DebugPanel = () => {
    if (!isDebugMode) return null;
    
    return (
      <div className="mb-6 p-4 bg-secondary/50 rounded-lg text-left max-w-4xl mx-auto overflow-hidden border border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Debug Panel</span>
            <span className="text-xs text-muted-foreground">(add ?debug=1 to URL)</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const debugData = {
                frontend: {
                  params: { from, to, depart, returnDate, adults, children, infants, tripType, travelClass },
                  responseStatus,
                  emptyReason,
                  userMessage,
                  flightCount: flights.length,
                  flexibleDatesUsed,
                  aviasalesDirectUrl,
                  timestamp: new Date().toISOString()
                },
                backend: apiDebugInfo
              };
              navigator.clipboard.writeText(JSON.stringify(debugData, null, 2));
              alert('Debug info copied to clipboard!');
            }}
            className="text-xs"
          >
            Copy All Debug Info
          </Button>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs mb-3">
          <div className="bg-background p-2 rounded">
            <span className="font-semibold block text-muted-foreground">Status</span>
            <span className={responseStatus === 'OK' || responseStatus === 'OK_FLEXIBLE' ? 'text-green-500' : responseStatus === 'ERROR' ? 'text-red-500' : 'text-yellow-500'}>
              {responseStatus || 'N/A'}
            </span>
          </div>
          <div className="bg-background p-2 rounded">
            <span className="font-semibold block text-muted-foreground">Empty Reason</span>
            <span>{emptyReason || 'N/A'}</span>
          </div>
          <div className="bg-background p-2 rounded">
            <span className="font-semibold block text-muted-foreground">Flights</span>
            <span>{flights.length}</span>
          </div>
          <div className="bg-background p-2 rounded">
            <span className="font-semibold block text-muted-foreground">HTTP Status</span>
            <span>{apiDebugInfo?.httpStatus || 'N/A'}</span>
          </div>
        </div>
        
        {apiDebugInfo?.requestUrl && (
          <div className="text-xs mb-2">
            <span className="font-semibold">API URL:</span>
            <code className="ml-1 break-all text-[10px] bg-background p-1 rounded">{apiDebugInfo.requestUrl}</code>
          </div>
        )}

        {userMessage && (
          <div className="text-xs mb-2 p-2 bg-background rounded">
            <span className="font-semibold">User Message:</span> {userMessage}
          </div>
        )}

        {flexibleDatesUsed.length > 0 && (
          <div className="text-xs mb-2 p-2 bg-background rounded">
            <span className="font-semibold">Flexible Dates Used:</span> {flexibleDatesUsed.join(', ')}
          </div>
        )}
        
        {apiDebugInfo && (
          <details className="mt-2">
            <summary className="cursor-pointer text-xs font-semibold text-primary">Full Backend Response</summary>
            <pre className="text-xs text-muted-foreground overflow-auto mt-2 max-h-48 bg-background p-2 rounded">
              {JSON.stringify(apiDebugInfo, null, 2)}
            </pre>
          </details>
        )}
      </div>
    );
  };

  // Empty state for "no cached prices" (NOT an error)
  const NoCachedPricesState = () => (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6">
        <Database className="w-12 h-12 text-primary" />
      </div>
      <p className="text-2xl text-foreground font-bold mb-3">No cached prices available</p>
      <p className="text-muted-foreground max-w-lg mb-4">
        These results use historical data. For live prices, search Aviasales directly.
      </p>
      <p className="text-sm text-muted-foreground max-w-md mb-6">
        Airlines usually release prices 9–12 months in advance. Try nearer dates or use the live search below.
      </p>
      
      {/* Primary CTA - Search Live Prices */}
      <div className="mb-6">
        {aviasalesDirectUrl && (
          <Button 
            size="lg"
            onClick={() => window.open(aviasalesDirectUrl, '_blank')}
            className="gap-2 text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-shadow"
          >
            <ExternalLink className="w-5 h-5" />
            Search Live Prices
          </Button>
        )}
      </div>
      
      <div className="bg-muted/50 border border-border rounded-xl p-5 mb-6 max-w-lg text-left">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground mb-1">About cached prices</p>
            <p className="text-sm text-muted-foreground">
              Our site uses cached historical pricing data for inspiration. When no cached prices are available, 
              it doesn't mean flights don't exist. Click "Search Live Prices" to see real-time availability on Aviasales.
            </p>
          </div>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-3 justify-center">
        <Button variant="outline" onClick={() => navigate("/flights")} className="gap-2">
          <Calendar className="w-4 h-4" />
          Try Different Dates
        </Button>
        <Button variant="ghost" onClick={() => {
          // Try +30 days
          const currentDepart = parseDateSafe(depart);
          if (currentDepart) {
            const newDepart = addDays(currentDepart, 30);
            const newParams = new URLSearchParams(searchParams);
            newParams.set("depart", format(newDepart, "yyyy-MM-dd"));
            if (tripType === "roundtrip" && returnDate) {
              const returnParsed = parseDateSafe(returnDate);
              if (returnParsed) {
                const tripLength = Math.round((returnParsed.getTime() - currentDepart.getTime()) / (1000 * 60 * 60 * 24));
                newParams.set("return", format(addDays(newDepart, tripLength), "yyyy-MM-dd"));
              }
            }
            setSearchParams(newParams);
          }
        }} className="gap-2">
          <Calendar className="w-4 h-4" />
          Try +30 Days
        </Button>
      </div>
      
      <DebugPanel />
    </div>
  );

  // Empty state for "far future" (beyond airline publish window)
  const FarFutureState = () => (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-24 h-24 rounded-full bg-blue-500/10 flex items-center justify-center mb-6">
        <Clock className="w-12 h-12 text-blue-500" />
      </div>
      <p className="text-2xl text-foreground font-bold mb-3">Prices not available yet</p>
      <p className="text-muted-foreground max-w-lg mb-6">
        {userMessage || "Airlines typically publish fares 9-11 months in advance. Your selected date is beyond the current booking window."}
      </p>
      
      {/* Primary CTA - Suggested dates */}
      {suggestedSearchDate && (
        <div className="mb-6">
          <p className="text-sm text-muted-foreground mb-3">Try the nearest available dates:</p>
          <Button size="lg" onClick={handleSuggestedDateClick} className="gap-2 px-8 py-6 shadow-lg">
            <Calendar className="w-5 h-5" />
            Search {formatDate(suggestedSearchDate)}
            {suggestedReturnDate && tripType === "roundtrip" && ` – ${formatDate(suggestedReturnDate)}`}
          </Button>
        </div>
      )}
      
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-5 mb-6 max-w-lg text-left">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground mb-1">Why can't I book this far ahead?</p>
            <p className="text-sm text-muted-foreground">
              Airlines release their schedules and prices approximately 330 days (about 11 months) before departure. 
              Your selected date is beyond this window. Try a nearer date or check back closer to when prices are released.
            </p>
          </div>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-3 justify-center">
        {aviasalesDirectUrl && (
          <Button 
            variant="outline"
            onClick={() => window.open(aviasalesDirectUrl, '_blank')}
            className="gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            Try Direct Search Anyway
          </Button>
        )}
        <Button variant="outline" onClick={() => navigate("/flights")} className="gap-2">
          <Search className="w-4 h-4" />
          Modify Search
        </Button>
      </div>
      
      <DebugPanel />
    </div>
  );

  // Error state (real service errors only)
  const ErrorState = () => (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
        <AlertCircle className="w-10 h-10 text-destructive" />
      </div>
      <p className="text-xl text-foreground font-semibold mb-2">Service temporarily unavailable</p>
      <p className="text-muted-foreground max-w-md mb-6">{error || userMessage || "We're having trouble connecting to our flight data service."}</p>
      
      <div className="flex flex-wrap gap-3 justify-center mb-6">
        {aviasalesDirectUrl && (
          <Button 
            onClick={() => window.open(aviasalesDirectUrl, '_blank')}
            className="gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            Search on Aviasales
          </Button>
        )}
        <Button
          variant="outline"
          onClick={() =>
            searchFlights({
              origin: displayFrom,
              destination: displayTo,
              departDate: displayDepart,
              returnDate: displayReturn || undefined,
              adults,
              tripType,
              debug: isDebugMode,
            })
          }
          className="gap-2"
        >
          <Search className="w-4 h-4" />
          Try Again
        </Button>
      </div>
      
      <DebugPanel />
    </div>
  );

  // Flexible dates banner
  const FlexibleDatesBanner = () => {
    if (flexibleDatesUsed.length === 0) return null;
    
    return (
      <div className="mb-4 p-3 bg-primary/10 border border-primary/30 rounded-lg flex items-center gap-3">
        <Calendar className="w-5 h-5 text-primary flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">
            Showing prices for nearby dates
          </p>
          <p className="text-xs text-muted-foreground">
            No exact matches for {formatDate(depart)}. Showing results for: {flexibleDatesUsed.map(d => formatDate(d)).join(', ')}
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
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
              <Plane className="w-7 h-7 text-primary" />
              {displayFrom.toUpperCase()} → {displayTo.toUpperCase()}
            </h1>
            <p className="text-muted-foreground mt-1">
              {formatDate(displayDepart)}
              {tripType === "roundtrip" && displayReturn && ` – ${formatDate(displayReturn)}`}
              {" • "}{adults + children + infants} traveler{(adults + children + infants) > 1 ? "s" : ""}
              {travelClass !== "economy" && ` • ${travelClass.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}`}
            </p>
          </div>
          
          <Button
            variant="outline"
            onClick={() => navigate("/flights")}
            className="gap-2 self-start"
          >
            <ArrowLeft className="w-4 h-4" />
            New Search
          </Button>
        </div>

        {/* Debug Panel (shown at top when debug mode is on and we have results or loading) */}
        {isDebugMode && !error && flights.length > 0 && <DebugPanel />}

        {/* Price Calendar */}
        {!isLoading && !error && flights.length > 0 && departDateObj && (
          <PriceCalendar
            departDate={departDateObj}
            basePrice={basePrice}
            onDateSelect={handleDateSelect}
          />
        )}

        {isLoading ? (
          <div className="flex flex-col lg:flex-row gap-6 mt-6">
            <div className="lg:w-72 shrink-0">
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
            
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-4 bg-card p-3 rounded-xl border border-border">
                <span className="text-sm text-muted-foreground">Searching flights...</span>
                <Loader2 className="w-4 h-4 text-primary animate-spin ml-auto" />
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
        ) : flights.length === 0 ? (
          // Determine which empty state to show based on emptyReason
          emptyReason === 'far_future' ? (
            <FarFutureState />
          ) : emptyReason === 'no_cached_prices' ? (
            <NoCachedPricesState />
          ) : (
            // This shouldn't happen often now, but fallback to cache empty state
            <NoCachedPricesState />
          )
        ) : (
          /* Main Results View */
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Filters Sidebar - Desktop Only */}
            <div className="hidden lg:block lg:w-72 shrink-0">
              <FlightFilters
                onFiltersChange={setFilters}
              />
            </div>

            {/* Results */}
            <div className="flex-1 space-y-4">
              {/* Flexible dates banner */}
              <FlexibleDatesBanner />
              
              {/* Skyscanner-style Summary Bar */}
              <FlightSummaryBar 
                flights={flights}
                sortBy={sortBy}
                onSortChange={setSortBy}
              />

              {/* Mobile Filter Button + Count */}
              <div className="flex items-center justify-between gap-3 lg:hidden bg-card p-3 rounded-xl border border-border">
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{totalFiltered}</span> flights found
                </p>
                <MobileFiltersDrawer 
                  onFiltersChange={setFilters}
                  activeFiltersCount={
                    filters.stops.length + 
                    filters.airlines.length + 
                    filters.departureTime.length +
                    (filters.priceRange[0] > 0 || filters.priceRange[1] < 5000 ? 1 : 0)
                  }
                  flightCount={totalFiltered}
                />
              </div>

              {/* Desktop Sort & Count Bar */}
              <div className="hidden lg:flex flex-wrap items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border">
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{totalFiltered}</span> flights found
                  {responseStatus === 'OK_FLEXIBLE' && <span className="text-primary ml-1">(nearby dates)</span>}
                </p>
                <div className="flex gap-2">
                  {(["best", "cheapest", "fastest"] as const).map((option) => (
                    <Button
                      key={option}
                      variant={sortBy === option ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setSortBy(option)}
                      className="text-xs capitalize"
                    >
                      {option}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Flight Cards */}
              {displayedFlights.map((flight) => (
                <FlightCard
                  key={flight.id}
                  flight={flight}
                  onViewDetails={() => setSelectedFlight(flight)}
                />
              ))}

              {/* Show More */}
              {!showAllFlights && totalFiltered > 6 && (
                <div className="text-center pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowAllFlights(true)}
                    className="gap-2"
                  >
                    Show all {totalFiltered} flights
                  </Button>
                </div>
              )}

              {/* Direct search fallback - always show for transparency */}
              {aviasalesDirectUrl && (
                <div className="text-center pt-4 pb-2 border-t border-border mt-4">
                  <p className="text-sm text-muted-foreground mb-2">
                    These are cached historical prices. For live availability and booking:
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => window.open(aviasalesDirectUrl, '_blank')}
                    className="gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Search Live Prices
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
