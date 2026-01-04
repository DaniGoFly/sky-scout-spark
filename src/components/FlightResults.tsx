import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import FlightCard from "./FlightCard";
import FlightFilters, { FilterState } from "./FlightFilters";
import CompactSearchBar from "./CompactSearchBar";
import { generateMockFlights, sortFlights, filterFlights, Flight } from "@/lib/mockFlights";

const FlightResults = () => {
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"best" | "cheapest" | "fastest">("best");
  const [filters, setFilters] = useState<FilterState>({
    stops: [],
    airlines: [],
    priceRange: [0, 2000],
    departureTime: [],
  });
  const [showAllFlights, setShowAllFlights] = useState(false);

  // Extract search params
  const from = searchParams.get("from") || "NYC";
  const to = searchParams.get("to") || "LON";
  const depart = searchParams.get("depart") || "2026-02-15";
  const returnDate = searchParams.get("return") || "";
  const adults = Number(searchParams.get("adults")) || 1;
  const tripType = searchParams.get("trip") || "roundtrip";

  // Generate mock flights based on search params
  const allFlights = useMemo(() => {
    return generateMockFlights({ from, to, depart, adults });
  }, [from, to, depart, adults]);

  // Apply filters and sorting
  const displayedFlights = useMemo(() => {
    let flights = filterFlights(allFlights, filters);
    flights = sortFlights(flights, sortBy);
    return showAllFlights ? flights : flights.slice(0, 6);
  }, [allFlights, filters, sortBy, showAllFlights]);

  const totalFiltered = useMemo(() => {
    return filterFlights(allFlights, filters).length;
  }, [allFlights, filters]);

  // Simulate loading
  useEffect(() => {
    setIsLoading(true);
    setShowAllFlights(false);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, [from, to, depart, adults]);

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

  return (
    <section className="py-8 px-4 bg-secondary/30 min-h-screen">
      <div className="container mx-auto">
        {/* Compact Search Bar */}
        <CompactSearchBar />

        {/* Search Summary */}
        <div className="mt-6 mb-4">
          <h1 className="text-2xl font-bold text-foreground">
            {from.toUpperCase()} → {to.toUpperCase()}
          </h1>
          <p className="text-muted-foreground">
            {formatDate(depart)}
            {tripType === "roundtrip" && returnDate && ` - ${formatDate(returnDate)}`}
            {" • "}{adults} traveler{adults > 1 ? "s" : ""}
          </p>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
            <p className="text-lg text-muted-foreground">Searching flights...</p>
            <p className="text-sm text-muted-foreground mt-2">
              Finding the best deals for your trip
            </p>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6 mt-6">
            {/* Filters Sidebar */}
            <div className="lg:w-72 shrink-0">
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
                      className="opacity-0 animate-fade-in"
                      style={{ animationDelay: `${index * 50}ms`, animationFillMode: "forwards" }}
                    >
                      <FlightCard
                        airline={flight.airline}
                        airlineLogo={flight.airlineLogo}
                        departureTime={flight.departureTime}
                        arrivalTime={flight.arrivalTime}
                        departureCode={flight.departureCode}
                        arrivalCode={flight.arrivalCode}
                        duration={flight.duration}
                        stops={flight.stops}
                        price={flight.price}
                        deepLink={flight.deepLink}
                        featured={flight.featured}
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

              {/* Show More */}
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
      </div>
    </section>
  );
};

export default FlightResults;
