import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Loader2, AlertCircle, Plane, Info, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import FlightCard from "./FlightCard";
import FlightFilters, { FilterState } from "./FlightFilters";
import FlightDetailsModal from "./FlightDetailsModal";
import { useFlightSearch, LiveFlight } from "@/hooks/useFlightSearch";
import { format, addDays } from "date-fns";

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
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { flights, isLoading, error, searchFlights, isUsingMockData } = useFlightSearch();
  const [sortBy, setSortBy] = useState<"best" | "cheapest" | "fastest">("best");
  const [filters, setFilters] = useState<FilterState>({
    stops: [],
    airlines: [],
    priceRange: [0, 5000],
    departureTime: [],
  });
  const [showAllFlights, setShowAllFlights] = useState(false);
  const [selectedFlight, setSelectedFlight] = useState<LiveFlight | null>(null);

  // Extract search params
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";
  const depart = searchParams.get("depart") || "";
  const returnDate = searchParams.get("return") || "";
  const adults = Number(searchParams.get("adults")) || 1;
  const tripType = searchParams.get("trip") || "roundtrip";
  const autoSearch = searchParams.get("autoSearch") === "true";

  // Handle auto-search from destination cards
  useEffect(() => {
    if (autoSearch && to && !from) {
      // Get airport code from city name
      const airportCode = CITY_AIRPORT_CODES[to.toLowerCase()] || to.toUpperCase().slice(0, 3);
      const defaultDepart = format(addDays(new Date(), 7), "yyyy-MM-dd");
      const defaultReturn = format(addDays(new Date(), 14), "yyyy-MM-dd");
      
      setShowAllFlights(false);
      searchFlights({
        origin: "NYC", // Default origin
        destination: airportCode,
        departDate: defaultDepart,
        returnDate: defaultReturn,
        adults: 1,
        tripType: "roundtrip",
      });
    }
  }, [autoSearch, to, from, searchFlights]);

  // Fetch live flights when params change (regular search)
  useEffect(() => {
    if (from && to && depart && !autoSearch) {
      setShowAllFlights(false);
      searchFlights({
        origin: from,
        destination: to,
        departDate: depart,
        returnDate: returnDate || undefined,
        adults,
        tripType,
      });
    }
  }, [from, to, depart, returnDate, adults, tripType, searchFlights, autoSearch]);

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
        month: "short",
        day: "numeric",
        year: "numeric",
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
    <section className="py-8 px-4 bg-secondary/30 min-h-screen">
      <div className="container mx-auto">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate("/flights")}
          className="mb-4 gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          New Search
        </Button>

        {/* Search Summary */}
        <div className="mt-6 mb-4">
          <h1 className="text-2xl font-bold text-foreground">
            {autoSearch && !from ? "NYC" : displayFrom.toUpperCase()} → {autoSearch ? to : displayTo.toUpperCase()}
          </h1>
          <p className="text-muted-foreground">
            {formatDate(displayDepart)}
            {tripType === "roundtrip" && displayReturn && ` - ${formatDate(displayReturn)}`}
            {" • "}{adults} traveler{adults > 1 ? "s" : ""}
          </p>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
            <p className="text-lg text-muted-foreground">Searching live prices...</p>
            <p className="text-sm text-muted-foreground mt-2">
              Finding the best deals from airlines worldwide
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mb-4" />
            <p className="text-lg text-foreground font-medium">Unable to load flights</p>
            <p className="text-sm text-muted-foreground mt-2 max-w-md">{error}</p>
            <Button
              variant="outline"
              className="mt-6"
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
            >
              Try Again
            </Button>
          </div>
        ) : flights.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Plane className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-lg text-foreground font-medium">No flights found</p>
            <p className="text-sm text-muted-foreground mt-2">
              Try different dates or destinations
            </p>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6 mt-6">
            {/* Mock Data Notice */}
            {isUsingMockData && (
              <div className="w-full mb-4 lg:hidden">
                <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-xl text-sm text-primary">
                  <Info className="w-4 h-4 shrink-0" />
                  <span>Showing sample prices. Click "View Deal" for live rates.</span>
                </div>
              </div>
            )}

            {/* Filters Sidebar */}
            <div className="lg:w-72 shrink-0">
              {isUsingMockData && (
                <div className="hidden lg:flex items-center gap-2 p-3 mb-4 bg-primary/10 border border-primary/20 rounded-xl text-sm text-primary">
                  <Info className="w-4 h-4 shrink-0" />
                  <span>Sample prices shown. Click "View Deal" for live rates.</span>
                </div>
              )}
              <FlightFilters onFiltersChange={setFilters} />
            </div>

            {/* Results */}
            <div className="flex-1">
              {/* Sort Options */}
              <div className="flex items-center gap-2 mb-4 bg-card p-3 rounded-xl border border-border">
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
                <span className="ml-auto text-sm text-muted-foreground">
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
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-card rounded-2xl p-12 text-center border border-border">
                  <p className="text-lg text-muted-foreground">No flights match your filters</p>
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