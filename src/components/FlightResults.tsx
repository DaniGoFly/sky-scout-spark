import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Loader2, AlertCircle, Plane, ArrowLeft, Search, Calendar, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import FlightCard from "./FlightCard";
import FlightFilters, { FilterState } from "./FlightFilters";
import FlightDetailsModal from "./FlightDetailsModal";
import FlightResultsSkeleton from "./FlightResultsSkeleton";
import CompactSearchBar from "./CompactSearchBar";
import PriceCalendar from "./PriceCalendar";
import { useFlightSearch, LiveFlight } from "@/hooks/useFlightSearch";
import { format, addDays, parseISO, differenceInMonths, differenceInDays } from "date-fns";

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
  const { flights, isLoading, error, searchFlights } = useFlightSearch();
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
  const [debugInfo, setDebugInfo] = useState<any>(null);

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
  const flexible = searchParams.get("flexible") === "true";
  const autoSearch = searchParams.get("autoSearch") === "true";

  // Calculate if date is far in the future (more than 9 months)
  const isFarFuture = useMemo(() => {
    if (!depart) return false;
    try {
      const departDate = parseISO(depart);
      const monthsDiff = differenceInMonths(departDate, new Date());
      return monthsDiff > 9;
    } catch {
      return false;
    }
  }, [depart]);

  // Handle auto-search from destination cards
  useEffect(() => {
    if (autoSearch && to && !from) {
      const airportCode = CITY_AIRPORT_CODES[to.toLowerCase()] || to.toUpperCase().slice(0, 3);
      const defaultDepart = format(addDays(new Date(), 30), "yyyy-MM-dd");
      const defaultReturn = format(addDays(new Date(), 37), "yyyy-MM-dd");
      
      setShowAllFlights(false);
      setHasSearched(true);
      
      if (isDebugMode) {
        console.log("[DEBUG] Auto-search params:", { origin: "NYC", destination: airportCode, departDate: defaultDepart, returnDate: defaultReturn });
      }
      
      searchFlights({
        origin: "NYC",
        destination: airportCode,
        departDate: defaultDepart,
        returnDate: defaultReturn,
        adults: 1,
        tripType: "roundtrip",
      });
    }
  }, [autoSearch, to, from, searchFlights, isDebugMode]);

  // Fetch live flights when params change (regular search)
  useEffect(() => {
    if (from && to && depart && !autoSearch) {
      setShowAllFlights(false);
      setHasSearched(true);
      
      const searchData = {
        origin: from,
        destination: to,
        departDate: depart,
        returnDate: returnDate || undefined,
        adults,
        children,
        infants,
        tripType,
        travelClass,
      };
      
      if (isDebugMode) {
        console.log("[DEBUG] Search params:", searchData);
        setDebugInfo({ request: searchData, timestamp: new Date().toISOString() });
      }
      
      searchFlights(searchData);
    }
  }, [from, to, depart, returnDate, adults, children, infants, tripType, travelClass, searchFlights, autoSearch, isDebugMode]);

  // Handle price calendar date selection
  const handleDateSelect = (newDate: Date) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("depart", format(newDate, "yyyy-MM-dd"));
    setSearchParams(newParams);
  };

  // Get base price for calendar
  const basePrice = useMemo(() => {
    if (flights.length === 0) return 350;
    return Math.min(...flights.map(f => f.price));
  }, [flights]);

  // Filter and sort flights
  const processedFlights = useMemo(() => {
    let result = [...flights];

    // Apply filters
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

    // Apply sorting
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

  // Get display values for auto-search
  const displayFrom = from || (autoSearch ? "NYC" : "");
  const displayTo = to || "";
  const displayDepart = depart || (autoSearch ? format(addDays(new Date(), 7), "yyyy-MM-dd") : "");
  const displayReturn = returnDate || (autoSearch ? format(addDays(new Date(), 14), "yyyy-MM-dd") : "");

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
              {autoSearch && !from ? "NYC" : displayFrom.toUpperCase()} → {autoSearch ? to : displayTo.toUpperCase()}
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

        {/* Price Calendar - only show when we have results and a depart date */}
        {!isLoading && !error && flights.length > 0 && depart && (
          <PriceCalendar
            departDate={parseISO(depart)}
            basePrice={basePrice}
            onDateSelect={handleDateSelect}
          />
        )}

        {isLoading ? (
          <div className="flex flex-col lg:flex-row gap-6 mt-6">
            {/* Skeleton Filters */}
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
            
            {/* Skeleton Results */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-4 bg-card p-3 rounded-xl border border-border">
                <span className="text-sm text-muted-foreground">Searching flights...</span>
                <Loader2 className="w-4 h-4 text-primary animate-spin ml-auto" />
              </div>
              <FlightResultsSkeleton />
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <AlertCircle className="w-16 h-16 text-destructive mb-4" />
            <p className="text-xl text-foreground font-semibold mb-2">Unable to load flights</p>
            <p className="text-muted-foreground max-w-md mb-6">{error}</p>
            <Button
              onClick={() =>
                searchFlights({
                  origin: displayFrom,
                  destination: displayTo,
                  departDate: displayDepart,
                  returnDate: displayReturn || undefined,
                  adults,
                  tripType,
                })
              }
              className="gap-2"
            >
              <Search className="w-4 h-4" />
              Try Again
            </Button>
          </div>
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
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
              {isFarFuture ? (
                <Calendar className="w-10 h-10 text-muted-foreground" />
              ) : (
                <Plane className="w-10 h-10 text-muted-foreground" />
              )}
            </div>
            <p className="text-xl text-foreground font-semibold mb-2">
              {isFarFuture 
                ? "Prices not available yet" 
                : "No flights found"}
            </p>
            <p className="text-muted-foreground max-w-md mb-6">
              {isFarFuture 
                ? "Flight prices are typically available 9-12 months in advance. Try closer dates for this route."
                : "We couldn't find any flights for your search. Try different dates, nearby airports, or flexible travel days."}
            </p>
            
            {/* Debug info panel */}
            {isDebugMode && debugInfo && (
              <div className="mb-6 p-4 bg-secondary/50 rounded-lg text-left max-w-lg w-full">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold">Debug Info</span>
                </div>
                <pre className="text-xs text-muted-foreground overflow-auto">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </div>
            )}
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => navigate("/flights")}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Modify Search
              </Button>
              {isFarFuture && depart && (
                <Button
                  variant="default"
                  onClick={() => {
                    // Suggest dates 30 days from now instead
                    const newParams = new URLSearchParams(searchParams);
                    newParams.set("depart", format(addDays(new Date(), 30), "yyyy-MM-dd"));
                    if (tripType === "roundtrip") {
                      newParams.set("return", format(addDays(new Date(), 37), "yyyy-MM-dd"));
                    }
                    setSearchParams(newParams);
                  }}
                  className="gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  Try Dates in 30 Days
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6 mt-6">
            {/* Filters Sidebar */}
            <div className="lg:w-72 shrink-0">
              <div className="sticky top-40">
                <FlightFilters onFiltersChange={setFilters} />
              </div>
            </div>

            {/* Results */}
            <div className="flex-1">
              {/* Sort Options */}
              <div className="flex flex-wrap items-center gap-2 mb-4 bg-card p-3 rounded-xl border border-border">
                <span className="text-sm text-muted-foreground mr-2">Sort by:</span>
                <Button
                  variant={sortBy === "best" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setSortBy("best")}
                >
                  Best
                </Button>
                <Button
                  variant={sortBy === "cheapest" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setSortBy("cheapest")}
                >
                  Cheapest
                </Button>
                <Button
                  variant={sortBy === "fastest" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setSortBy("fastest")}
                >
                  Fastest
                </Button>
                <span className="ml-auto text-sm text-muted-foreground font-medium">
                  {totalFiltered} result{totalFiltered !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Flight Cards */}
              {displayedFlights.length > 0 ? (
                <div className="space-y-4">
                  {displayedFlights.map((flight, index) => (
                    <div
                      key={flight.id}
                      className="opacity-0 animate-fade-in cursor-pointer"
                      style={{ animationDelay: `${index * 50}ms`, animationFillMode: "forwards" }}
                      onClick={() => setSelectedFlight(flight)}
                    >
                      <FlightCard
                        flight={flight}
                        featured={index === 0}
                        onViewDetails={() => setSelectedFlight(flight)}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-card rounded-2xl p-12 text-center border border-border">
                  <p className="text-lg text-foreground font-medium">No flights match your filters</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Try adjusting your filters to see more results
                  </p>
                </div>
              )}

              {!showAllFlights && totalFiltered > 6 && (
                <div className="mt-8 text-center">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setShowAllFlights(true)}
                  >
                    Show {totalFiltered - 6} More Flights
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
