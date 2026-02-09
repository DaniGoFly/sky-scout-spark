import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Plane, ArrowLeft, AlertCircle, Loader2, ExternalLink, RefreshCw } from "lucide-react";
import { format, parse } from "date-fns";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import FlightSortTabs from "@/components/FlightSortTabs";
import SkyscannerFlightCard from "@/components/SkyscannerFlightCard";
import FlightResultsSkeleton from "@/components/FlightResultsSkeleton";
import FlightErrorBoundary from "@/components/FlightErrorBoundary";
import { searchFlights as apiSearchFlights } from "@/lib/flightSearchApi";
import { Flight, sortFlights, isEligibleForBestValue } from "@/lib/flightNormalizer";
import { attachDealContextToFlights } from "@/lib/flightDealIds";
import { useLocale } from "@/hooks/useLocale";

interface Segment {
  from: string;
  to: string;
  date: string;
}

interface SegmentResult {
  segment: Segment;
  flights: Flight[];
  isLoading: boolean;
  error: string | null;
}

const RESULTS_PER_SEGMENT = 10;

const MultiCityResultsContent = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { currency } = useLocale();

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

  const adults = parseInt(searchParams.get("adults") || "1", 10);
  const children = parseInt(searchParams.get("children") || "0", 10);
  const infants = parseInt(searchParams.get("infants") || "0", 10);

  // Validate segments
  useEffect(() => {
    if (segments.length < 2) {
      toast.error("Multi-city search requires at least 2 segments.");
      navigate("/flights");
    }
  }, [segments, navigate]);

  const [segmentResults, setSegmentResults] = useState<SegmentResult[]>([]);
  const [sortBySegment, setSortBySegment] = useState<Record<number, "best" | "cheapest" | "fastest">>({});
  const searchedRef = useRef(false);

  // Search all segments in parallel
  useEffect(() => {
    if (segments.length < 2 || searchedRef.current) return;
    searchedRef.current = true;

    // Initialize loading state
    setSegmentResults(segments.map((seg) => ({
      segment: seg,
      flights: [],
      isLoading: true,
      error: null,
    })));

    const sortInit: Record<number, "best" | "cheapest" | "fastest"> = {};
    segments.forEach((_, i) => { sortInit[i] = "best"; });
    setSortBySegment(sortInit);

    // Search each segment in parallel
    segments.forEach(async (seg, index) => {
      try {
        const data = await apiSearchFlights({
          origin: seg.from.toUpperCase(),
          destination: seg.to.toUpperCase(),
          departDate: seg.date,
          adults: adults + children + infants,
          currency: currency,
          sort: "best",
          limit: 15,
        });

        if (!data.ok) {
          setSegmentResults((prev) => {
            const updated = [...prev];
            updated[index] = {
              ...updated[index],
              isLoading: false,
              error: data.error || "Search failed. Please try again.",
            };
            return updated;
          });
          return;
        }

        const flights = attachDealContextToFlights({
          flights: (data.flights || []) as Flight[],
          search_id: data.search_id || "",
          results_base: data.results_base || null,
        });

        setSegmentResults((prev) => {
          const updated = [...prev];
          updated[index] = {
            ...updated[index],
            flights,
            isLoading: false,
            error: null,
          };
          return updated;
        });
      } catch (err) {
        setSegmentResults((prev) => {
          const updated = [...prev];
          updated[index] = {
            ...updated[index],
            isLoading: false,
            error: "Network error. Please check your connection and try again.",
          };
          return updated;
        });
      }
    });
  }, [segments, adults, children, infants, currency]);

  const handleRetrySegment = useCallback(async (index: number) => {
    const seg = segments[index];
    if (!seg) return;

    setSegmentResults((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], isLoading: true, error: null };
      return updated;
    });

    try {
      const data = await apiSearchFlights({
        origin: seg.from.toUpperCase(),
        destination: seg.to.toUpperCase(),
        departDate: seg.date,
        adults: adults + children + infants,
        currency: currency,
        sort: "best",
        limit: 15,
      });

      if (!data.ok) {
        setSegmentResults((prev) => {
          const updated = [...prev];
          updated[index] = {
            ...updated[index],
            isLoading: false,
            error: data.error || "Search failed.",
          };
          return updated;
        });
        return;
      }

      const flights = attachDealContextToFlights({
        flights: (data.flights || []) as Flight[],
        search_id: data.search_id || "",
        results_base: data.results_base || null,
      });

      setSegmentResults((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], flights, isLoading: false, error: null };
        return updated;
      });
    } catch {
      setSegmentResults((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], isLoading: false, error: "Network error." };
        return updated;
      });
    }
  }, [segments, adults, children, infants, currency]);

  const formatDateLabel = (dateStr: string) => {
    try {
      const date = parse(dateStr, "yyyy-MM-dd", new Date());
      return format(date, "EEE, MMM d, yyyy");
    } catch {
      return dateStr;
    }
  };

  const handleSortChange = (index: number, sort: "best" | "cheapest" | "fastest") => {
    setSortBySegment((prev) => ({ ...prev, [index]: sort }));
  };

  const allLoading = segmentResults.length > 0 && segmentResults.every((r) => r.isLoading);
  const totalPassengers = adults + children + infants;

  if (segments.length < 2) return null;

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
                  {segments.length} flights • {totalPassengers} traveler{totalPassengers > 1 ? "s" : ""}
                </p>
              </div>
              <Button variant="outline" onClick={() => navigate("/flights")} className="gap-2 self-start shrink-0">
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
                    <span className="ml-2 text-muted-foreground">
                      {format(parse(seg.date, "yyyy-MM-dd", new Date()), "MMM d")}
                    </span>
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
                      <span className="text-muted-foreground">{formatDateLabel(seg.date)}</span>
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
                          <span className="text-muted-foreground">{formatDateLabel(result.segment.date)}</span>
                          {result.isLoading && <Loader2 className="w-4 h-4 animate-spin text-primary ml-auto" />}
                        </div>
                      </div>

                      {/* Segment Content */}
                      <div className="p-4 space-y-4">
                        {result.isLoading ? (
                          <FlightResultsSkeleton />
                        ) : result.error ? (
                          <div className="flex flex-col items-center gap-3 py-8">
                            <div className="flex items-center gap-3 p-4 bg-destructive/10 rounded-lg text-destructive w-full">
                              <AlertCircle className="w-5 h-5 shrink-0" />
                              <span>{result.error}</span>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => handleRetrySegment(index)} className="gap-2">
                              <RefreshCw className="w-4 h-4" />
                              Retry this segment
                            </Button>
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
                                Search on partner site
                              </a>
                            </Button>
                          </div>
                        ) : (
                          <>
                            <FlightSortTabs
                              flights={result.flights}
                              sortBy={sortBySegment[index] || "best"}
                              onSortChange={(sort) => handleSortChange(index, sort)}
                            />
                            <p className="text-sm text-muted-foreground">
                              <span className="font-semibold text-foreground">{result.flights.length}</span> flights found
                            </p>
                            {displayFlights.map((flight, flightIndex) => {
                              const showBestValue = flightIndex === 0 &&
                                sortBySegment[index] === "best" &&
                                isEligibleForBestValue(flight);
                              return (
                                <SkyscannerFlightCard key={flight.id} flight={flight} isBestValue={showBestValue} />
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

            {/* Combined booking CTA */}
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

const MultiCityResults = () => (
  <FlightErrorBoundary>
    <MultiCityResultsContent />
  </FlightErrorBoundary>
);

export default MultiCityResults;
