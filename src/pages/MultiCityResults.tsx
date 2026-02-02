import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Plane, ArrowLeft, Search, AlertCircle, Loader2, ExternalLink } from "lucide-react";
import { format, parse } from "date-fns";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import FlightSortTabs from "@/components/FlightSortTabs";
import SkyscannerFlightCard from "@/components/SkyscannerFlightCard";
import FlightResultsSkeleton from "@/components/FlightResultsSkeleton";
import FlightErrorBoundary from "@/components/FlightErrorBoundary";
import { useFlightSearch } from "@/hooks/useFlightSearch";
import { Flight, sortFlights, isEligibleForBestValue, getAirlineName, getFlightBookingUrl, isHttpUrl } from "@/lib/flightNormalizer";

interface Segment {
  from: string;
  to: string;
  date: string;
}

interface SegmentResults {
  segment: Segment;
  flights: Flight[];
  isLoading: boolean;
  error: string | null;
}

const RESULTS_PER_SEGMENT = 10;

const MultiCityResultsContent = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const fetchedAtRef = useRef<number>(Date.now());
  
  // Parse segments from URL
  const segments = useMemo((): Segment[] => {
    const segmentCount = parseInt(searchParams.get("segments") || "0", 10);
    if (segmentCount < 2 || segmentCount > 5) return [];
    
    const result: Segment[] = [];
    for (let i = 0; i < segmentCount; i++) {
      const from = searchParams.get(`seg${i}_from`);
      const to = searchParams.get(`seg${i}_to`);
      const date = searchParams.get(`seg${i}_date`);
      
      if (from && to && date) {
        result.push({ from, to, date });
      }
    }
    return result;
  }, [searchParams]);

  // Parse shared params
  const adults = parseInt(searchParams.get("adults") || "1", 10);
  const children = parseInt(searchParams.get("children") || "0", 10);
  const infants = parseInt(searchParams.get("infants") || "0", 10);
  const travelClass = searchParams.get("class") || "economy";

  // Validate segments
  useEffect(() => {
    if (segments.length < 2) {
      toast.error("Please complete all flight segments", {
        description: "Multi-city search requires at least 2 segments.",
      });
      navigate("/flights");
    }
  }, [segments, navigate]);

  // State for each segment's results
  const [segmentResults, setSegmentResults] = useState<SegmentResults[]>([]);
  const [sortBySegment, setSortBySegment] = useState<Record<number, "best" | "cheapest" | "fastest">>({});

  // Initialize segment results
  useEffect(() => {
    if (segments.length >= 2) {
      setSegmentResults(
        segments.map((seg) => ({
          segment: seg,
          flights: [],
          isLoading: true,
          error: null,
        }))
      );
      // Initialize sort state
      const sortInit: Record<number, "best" | "cheapest" | "fastest"> = {};
      segments.forEach((_, i) => { sortInit[i] = "best"; });
      setSortBySegment(sortInit);
    }
  }, [segments]);

  // Use the flight search hook for each segment
  const { searchFlights, flights: hookFlights, isLoading: hookLoading, error: hookError } = useFlightSearch();
  
  // Track which segment we're currently searching
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [searchStarted, setSearchStarted] = useState(false);

  // Start searches sequentially
  useEffect(() => {
    if (segments.length < 2 || searchStarted) return;
    setSearchStarted(true);
    
    // Search first segment
    const seg = segments[0];
    searchFlights({
      origin: seg.from,
      destination: seg.to,
      departDate: seg.date,
      adults,
      children,
      infants,
      tripType: "oneway",
      travelClass,
    });
  }, [segments, searchStarted, adults, children, infants, travelClass, searchFlights]);

  // Handle search results and move to next segment
  useEffect(() => {
    if (hookLoading || currentSearchIndex >= segments.length) return;
    
    // Update current segment results
    setSegmentResults((prev) => {
      const updated = [...prev];
      if (updated[currentSearchIndex]) {
        // Convert hook flights to Flight format
        const normalizedFlights: Flight[] = hookFlights.map((f) => ({
          id: f.id,
          origin: f.departureCode || segments[currentSearchIndex].from,
          destination: f.arrivalCode || segments[currentSearchIndex].to,
          departureTime: f.departureTime || "",
          arrivalTime: f.arrivalTime || "",
          durationMinutes: f.durationMinutes || 0,
          stopsCount: f.stops || 0,
          stopsAirports: [],
          airlines: [f.airline?.substring(0, 2).toUpperCase() || "XX"],
          flightNumbers: f.flightNumber ? [f.flightNumber] : [],
          price: { amount: Math.round(f.price || 0), currency: "USD" },
          clickUrl: f.deepLink || "",
        }));

        updated[currentSearchIndex] = {
          ...updated[currentSearchIndex],
          flights: normalizedFlights,
          isLoading: false,
          error: hookError || null,
        };
      }
      return updated;
    });

    // Search next segment
    const nextIndex = currentSearchIndex + 1;
    if (nextIndex < segments.length) {
      setCurrentSearchIndex(nextIndex);
      const seg = segments[nextIndex];
      setTimeout(() => {
        searchFlights({
          origin: seg.from,
          destination: seg.to,
          departDate: seg.date,
          adults,
          children,
          infants,
          tripType: "oneway",
          travelClass,
        });
      }, 500); // Small delay between searches
    }
  }, [hookFlights, hookLoading, hookError, currentSearchIndex, segments, adults, children, infants, travelClass, searchFlights]);

  const formatDate = (dateStr: string) => {
    try {
      const date = parse(dateStr, "yyyy-MM-dd", new Date());
      return format(date, "EEE, MMM d, yyyy");
    } catch {
      return dateStr;
    }
  };

  const handleViewDeal = useCallback((flight: Flight) => {
    const url = getFlightBookingUrl(flight);
    if (!isHttpUrl(url)) {
      toast.error("Could not open deal. Please try again.");
      return;
    }

    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, []);

  const handleSortChange = (index: number, sort: "best" | "cheapest" | "fastest") => {
    setSortBySegment((prev) => ({ ...prev, [index]: sort }));
  };

  // Check if all segments are loading
  const allLoading = segmentResults.every((r) => r.isLoading);
  const anyLoading = segmentResults.some((r) => r.isLoading);

  if (segments.length < 2) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 pt-20 pb-12">
        <section className="py-6 px-4 bg-secondary/30 min-h-[calc(100vh-200px)]">
          <div className="container mx-auto max-w-5xl">
            {/* Header */}
            <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
                  <Plane className="w-7 h-7 text-primary shrink-0" />
                  <span>Multi-city Trip</span>
                </h1>
                <p className="text-muted-foreground mt-1">
                  {segments.length} flights • {adults + children + infants} traveler{(adults + children + infants) > 1 ? "s" : ""}
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

            {/* Segments Summary */}
            <div className="mb-6 p-4 bg-card rounded-xl border border-border">
              <div className="flex flex-wrap gap-3">
                {segments.map((seg, i) => (
                  <Badge key={i} variant="secondary" className="text-sm py-1.5 px-3">
                    <span className="font-semibold">{seg.from}</span>
                    <span className="mx-1.5">→</span>
                    <span className="font-semibold">{seg.to}</span>
                    <span className="ml-2 text-muted-foreground">{format(parse(seg.date, "yyyy-MM-dd", new Date()), "MMM d")}</span>
                  </Badge>
                ))}
              </div>
            </div>

            {/* Loading State */}
            {allLoading && (
              <div className="space-y-6">
                {segments.map((seg, i) => (
                  <div key={i} className="bg-card rounded-xl border border-border p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Badge className="bg-primary">Flight {i + 1}</Badge>
                      <span className="text-foreground font-semibold">{seg.from} → {seg.to}</span>
                      <span className="text-muted-foreground">{formatDate(seg.date)}</span>
                      <Loader2 className="w-4 h-4 animate-spin text-primary ml-auto" />
                    </div>
                    <FlightResultsSkeleton />
                  </div>
                ))}
              </div>
            )}

            {/* Results by Segment */}
            {!allLoading && (
              <div className="space-y-8">
                {segmentResults.map((result, index) => {
                  const sortedFlights = sortFlights(result.flights, sortBySegment[index] || "best");
                  const displayFlights = sortedFlights.slice(0, RESULTS_PER_SEGMENT);
                  
                  return (
                    <div key={index} className="bg-card/50 rounded-xl border border-border overflow-hidden">
                      {/* Segment Header */}
                      <div className="bg-card p-4 border-b border-border">
                        <div className="flex flex-wrap items-center gap-3">
                          <Badge className="bg-primary shrink-0">Flight {index + 1}</Badge>
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-lg font-bold text-foreground">{result.segment.from}</span>
                            <Plane className="w-4 h-4 text-primary rotate-90" />
                            <span className="text-lg font-bold text-foreground">{result.segment.to}</span>
                          </div>
                          <span className="text-muted-foreground">{formatDate(result.segment.date)}</span>
                          {result.isLoading && (
                            <Loader2 className="w-4 h-4 animate-spin text-primary ml-auto" />
                          )}
                        </div>
                      </div>

                      {/* Segment Content */}
                      <div className="p-4 space-y-4">
                        {result.isLoading ? (
                          <FlightResultsSkeleton />
                        ) : result.error ? (
                          <div className="flex items-center gap-3 p-4 bg-destructive/10 rounded-lg text-destructive">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            <span>{result.error}</span>
                          </div>
                        ) : result.flights.length === 0 ? (
                          <div className="text-center py-8">
                            <p className="text-muted-foreground">No flights found for this segment</p>
                            <Button asChild variant="outline" className="mt-3 gap-2">
                              <a
                                href={`https://www.aviasales.com/search/${result.segment.from}${result.segment.date.replace(/-/g, "").slice(2)}${result.segment.to}1?marker=694224`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="w-4 h-4" />
                                Search on Aviasales
                              </a>
                            </Button>
                          </div>
                        ) : (
                          <>
                            {/* Sort Tabs */}
                            <FlightSortTabs
                              flights={result.flights}
                              sortBy={sortBySegment[index] || "best"}
                              onSortChange={(sort) => handleSortChange(index, sort)}
                            />

                            {/* Results Count */}
                            <p className="text-sm text-muted-foreground">
                              <span className="font-semibold text-foreground">{result.flights.length}</span> flights found
                            </p>

                            {/* Flight Cards */}
                            {displayFlights.map((flight, flightIndex) => {
                              const showBestValue = flightIndex === 0 && 
                                sortBySegment[index] === "best" && 
                                isEligibleForBestValue(flight);
                              
                              return (
                                <SkyscannerFlightCard
                                  key={flight.id}
                                  flight={flight}
                                  isBestValue={showBestValue}
                                   onViewDeal={handleViewDeal}
                                />
                              );
                            })}

                            {result.flights.length > RESULTS_PER_SEGMENT && (
                              <p className="text-center text-sm text-muted-foreground">
                                Showing top {RESULTS_PER_SEGMENT} of {result.flights.length} results
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Search externally CTA */}
            {!allLoading && (
              <div className="mt-8 text-center p-6 bg-card rounded-xl border border-border">
                <p className="text-muted-foreground mb-3">
                  For combined multi-city booking, search directly:
                </p>
                <Button asChild variant="outline" className="gap-2">
                  <a
                    href={`https://www.aviasales.com/search/${segments
                      .map((s) => `${s.from}${s.date.replace(/-/g, "").slice(2)}${s.to}`)
                      .join("")}${adults}?marker=694224`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Search Combined Itinerary
                  </a>
                </Button>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

// Wrap with error boundary
const MultiCityResults = () => (
  <FlightErrorBoundary>
    <MultiCityResultsContent />
  </FlightErrorBoundary>
);

export default MultiCityResults;
