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
const CACHE_PREFIX = "goflyfinder:mcCache:";
const CACHE_TTL_MS = 10 * 60 * 1000;

/* ── Cache helpers ── */
interface CachedSegmentResult {
  flights: Flight[];
}
interface CachedMcResult {
  timestamp: number;
  segments: CachedSegmentResult[];
}

function buildMcCacheKey(segments: Segment[], adults: number, currency: string): string {
  return CACHE_PREFIX + JSON.stringify({
    segs: segments.map(s => ({ f: s.from.toUpperCase(), t: s.to.toUpperCase(), d: s.date })),
    a: adults, cur: currency,
  });
}

function readMcCache(key: string): CachedMcResult | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed: CachedMcResult = JSON.parse(raw);
    if (Date.now() - parsed.timestamp > CACHE_TTL_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return parsed;
  } catch { return null; }
}

function writeMcCache(key: string, data: CachedMcResult) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch { /* ignore */ }
}

const MultiCityResultsContent = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { currency } = useLocale();

  const segments = useMemo((): Segment[] => {
    const segmentCount = parseInt(searchParams.get("segments") || "0", 10);
    if (segmentCount < 2 || segmentCount > 5) return [];
    const result: Segment[] = [];
    for (let i = 0; i < segmentCount; i++) {
      const from = searchParams.get(`seg${i}_from`);
      const to = searchParams.get(`seg${i}_to`);
      const date = searchParams.get(`seg${i}_date`);
      if (from && to && date) result.push({ from, to, date });
    }
    return result;
  }, [searchParams]);

  const adults = parseInt(searchParams.get("adults") || "1", 10);
  const children = parseInt(searchParams.get("children") || "0", 10);
  const infants = parseInt(searchParams.get("infants") || "0", 10);

  useEffect(() => {
    if (segments.length < 2) {
      toast.error("Multi-city search requires at least 2 segments.");
      navigate("/flights");
    }
  }, [segments, navigate]);

  const [segmentResults, setSegmentResults] = useState<SegmentResult[]>([]);
  const [sortBySegment, setSortBySegment] = useState<Record<number, "best" | "cheapest" | "fastest">>({});
  const searchedRef = useRef(false);
  const totalPassengers = adults + children + infants;

  // Search all segments in parallel (with cache)
  useEffect(() => {
    if (segments.length < 2 || searchedRef.current) return;
    searchedRef.current = true;

    const sortInit: Record<number, "best" | "cheapest" | "fastest"> = {};
    segments.forEach((_, i) => { sortInit[i] = "cheapest"; });
    setSortBySegment(sortInit);

    const cacheKey = buildMcCacheKey(segments, totalPassengers, currency);
    const cached = readMcCache(cacheKey);

    if (cached && cached.segments.length === segments.length) {
      setSegmentResults(segments.map((seg, i) => ({
        segment: seg,
        flights: cached.segments[i].flights,
        isLoading: false,
        error: null,
      })));
      return;
    }

    // Initialize loading state
    setSegmentResults(segments.map((seg) => ({
      segment: seg, flights: [], isLoading: true, error: null,
    })));

    const resultsCollector: (Flight[] | null)[] = new Array(segments.length).fill(null);

    segments.forEach(async (seg, index) => {
      try {
        const data = await apiSearchFlights({
          origin: seg.from.toUpperCase(),
          destination: seg.to.toUpperCase(),
          departDate: seg.date,
          adults: totalPassengers,
          currency: currency,
          sort: "best",
          limit: 15,
        });

        if (!data.ok) {
          setSegmentResults((prev) => {
            const updated = [...prev];
            updated[index] = { ...updated[index], isLoading: false, error: data.error || "Search failed." };
            return updated;
          });
          return;
        }

        const flights = attachDealContextToFlights({
          flights: (data.flights || []) as Flight[],
          search_id: data.search_id || "",
          results_base: data.results_base || null,
        });

        resultsCollector[index] = flights;

        setSegmentResults((prev) => {
          const updated = [...prev];
          updated[index] = { ...updated[index], flights, isLoading: false, error: null };
          return updated;
        });

        // Write cache when all segments done
        if (resultsCollector.every(r => r !== null)) {
          writeMcCache(cacheKey, {
            timestamp: Date.now(),
            segments: resultsCollector.map(f => ({ flights: f! })),
          });
        }
      } catch {
        setSegmentResults((prev) => {
          const updated = [...prev];
          updated[index] = { ...updated[index], isLoading: false, error: "Network error. Please check your connection." };
          return updated;
        });
      }
    });
  }, [segments, totalPassengers, currency]);

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
        adults: totalPassengers,
        currency: currency,
        sort: "best",
        limit: 15,
      });

      if (!data.ok) {
        setSegmentResults((prev) => {
          const updated = [...prev];
          updated[index] = { ...updated[index], isLoading: false, error: data.error || "Search failed." };
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
  }, [segments, totalPassengers, currency]);

  const formatDateLabel = (dateStr: string) => {
    try {
      const date = parse(dateStr, "yyyy-MM-dd", new Date());
      return format(date, "EEE, MMM d, yyyy");
    } catch { return dateStr; }
  };

  const handleSortChange = (index: number, sort: "best" | "cheapest" | "fastest") => {
    setSortBySegment((prev) => ({ ...prev, [index]: sort }));
  };

  const allLoading = segmentResults.length > 0 && segmentResults.every((r) => r.isLoading);

  if (segments.length < 2) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 pt-20 pb-8">
        <div className="container mx-auto max-w-5xl px-4">
          {/* Header row */}
          <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
                <Plane className="w-5 h-5 text-primary shrink-0" />
                Multi-city Trip
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {segments.length} flights · {totalPassengers} traveler{totalPassengers > 1 ? "s" : ""}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate("/flights")} className="gap-1.5 self-start shrink-0">
              <ArrowLeft className="w-4 h-4" />
              New Search
            </Button>
          </div>

          {/* Compact segment chips */}
          <div className="mb-5 flex flex-wrap gap-2">
            {segments.map((seg, i) => (
              <Badge key={i} variant="secondary" className="text-xs py-1 px-2.5">
                <span className="font-semibold">{seg.from}</span>
                <span className="mx-1">→</span>
                <span className="font-semibold">{seg.to}</span>
                <span className="ml-1.5 text-muted-foreground">
                  {format(parse(seg.date, "yyyy-MM-dd", new Date()), "MMM d")}
                </span>
              </Badge>
            ))}
          </div>

          {/* Loading skeleton */}
          {allLoading && (
            <div className="space-y-5">
              {segments.map((seg, i) => (
                <div key={i} className="bg-card rounded-xl border border-border p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge className="bg-primary text-xs">Flight {i + 1}</Badge>
                    <span className="text-foreground font-semibold text-sm">{seg.from} → {seg.to}</span>
                    <Loader2 className="w-4 h-4 animate-spin text-primary ml-auto" />
                  </div>
                  <FlightResultsSkeleton />
                </div>
              ))}
            </div>
          )}

          {/* Results by segment */}
          {!allLoading && (
            <div className="space-y-5">
              {segmentResults.map((result, index) => {
                const currentSort = sortBySegment[index] || "best";
                const sortedFlights = sortFlights(result.flights, currentSort);
                const displayFlights = sortedFlights.slice(0, RESULTS_PER_SEGMENT);

                return (
                  <div key={index} className="rounded-xl border border-border overflow-hidden">
                    {/* Segment header */}
                    <div className="bg-card px-4 py-3 border-b border-border">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="bg-primary text-xs shrink-0">Flight {index + 1}</Badge>
                        <span className="text-sm font-bold text-foreground">{result.segment.from}</span>
                        <Plane className="w-3.5 h-3.5 text-primary rotate-90" />
                        <span className="text-sm font-bold text-foreground">{result.segment.to}</span>
                        <span className="text-xs text-muted-foreground">· {formatDateLabel(result.segment.date)}</span>
                        {result.isLoading && <Loader2 className="w-4 h-4 animate-spin text-primary ml-auto" />}
                      </div>
                    </div>

                    {/* Segment content */}
                    <div className="p-4 space-y-3 bg-background">
                      {result.isLoading ? (
                        <FlightResultsSkeleton />
                      ) : result.error ? (
                        <div className="flex flex-col items-center gap-2 py-6">
                          <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg text-destructive w-full text-sm">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{result.error}</span>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => handleRetrySegment(index)} className="gap-1.5">
                            <RefreshCw className="w-3.5 h-3.5" />
                            Retry
                          </Button>
                        </div>
                      ) : result.flights.length === 0 ? (
                        <div className="text-center py-6">
                          <p className="text-sm text-muted-foreground">No flights found for this segment</p>
                          <Button asChild variant="outline" size="sm" className="mt-2 gap-1.5">
                            <a
                              href={`https://www.aviasales.com/search/${result.segment.from}${result.segment.date.replace(/-/g, "").slice(2)}${result.segment.to}1?marker=694224`}
                              target="_blank" rel="noopener noreferrer"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              Search partner site
                            </a>
                          </Button>
                        </div>
                      ) : (
                        <>
                          <FlightSortTabs
                            flights={result.flights}
                            sortBy={currentSort}
                            onSortChange={(sort) => handleSortChange(index, sort)}
                          />
                          <p className="text-xs text-muted-foreground">
                            <span className="font-semibold text-foreground">{result.flights.length}</span> flights found
                          </p>
                          <div className="space-y-3">
                          {displayFlights.map((flight, flightIndex) => {
                              const showBestValue = flightIndex === 0 && (currentSort === "best" || currentSort === "cheapest") && isEligibleForBestValue(flight);
                              return (
                                <SkyscannerFlightCard key={flight.id} flight={flight} isBestValue={showBestValue} badgeLabel={currentSort === "cheapest" ? "Cheapest" : undefined} />
                              );
                            })}
                          </div>
                          {result.flights.length > RESULTS_PER_SEGMENT && (
                            <p className="text-center text-xs text-muted-foreground pt-1">
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

          {/* Combined booking CTA — secondary, at the very bottom */}
          {!allLoading && segmentResults.some(r => r.flights.length > 0) && (
            <div className="mt-6 flex justify-center">
              <Button asChild variant="ghost" size="sm" className="gap-1.5 text-muted-foreground text-xs">
                <a
                  href={`https://www.aviasales.com/search/${segments
                    .map((s) => `${s.from}${s.date.replace(/-/g, "").slice(2)}${s.to}`)
                    .join("")}${adults}?marker=694224`}
                  target="_blank" rel="noopener noreferrer"
                >
                  <ExternalLink className="w-3 h-3" />
                  Search combined itinerary on partner
                </a>
              </Button>
            </div>
          )}
        </div>
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
