import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Plane, ArrowLeft, AlertCircle, Loader2, RefreshCw } from "lucide-react";
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
import { useLiveFlightSearch } from "@/hooks/useLiveFlightSearch";
import { sortFlights, isEligibleForBestValue } from "@/lib/flightNormalizer";
import { getPriceIntelligence } from "@/lib/priceIntelligence";
import { useLocale } from "@/hooks/useLocale";

interface Segment {
  from: string;
  to: string;
  date: string;
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
  const tripClass = searchParams.get("class") || "economy";

  useEffect(() => {
    if (segments.length < 2) {
      toast.error("Multi-city search requires at least 2 segments.");
      navigate("/flights");
    }
  }, [segments, navigate]);

  const {
    flights, status, error, isSearching, searchFlights, cancelSearch,
  } = useLiveFlightSearch();

  const [sortBy, setSortBy] = useState<"best" | "cheapest" | "fastest">("cheapest");
  const searchedRef = useRef(false);
  const prevResultsRef = useRef<typeof flights>([]);
  const totalPassengers = adults + children + infants;

  useEffect(() => {
    if (segments.length < 2 || searchedRef.current) return;
    searchedRef.current = true;

    const directions = segments.map(seg => ({
      origin: seg.from.toUpperCase(),
      destination: seg.to.toUpperCase(),
      date: seg.date,
    }));

    searchFlights({
      directions, adults, children, infants, currency,
      sort: "cheapest", limit: 100, tripClass,
    });
  }, [segments, adults, children, infants, currency, tripClass, searchFlights]);

  // Keep previous results visible during re-sort
  useEffect(() => {
    if (flights.length > 0) prevResultsRef.current = flights;
  }, [flights]);

  const displayFlights = flights.length > 0 ? flights : prevResultsRef.current;

  const handleRetry = useCallback(() => {
    searchedRef.current = false;
    cancelSearch();
    const directions = segments.map(seg => ({
      origin: seg.from.toUpperCase(),
      destination: seg.to.toUpperCase(),
      date: seg.date,
    }));
    searchFlights({
      directions, adults, children, infants, currency,
      sort: "cheapest", limit: 100, tripClass,
    });
  }, [segments, adults, children, infants, currency, tripClass, searchFlights, cancelSearch]);

  const handleSortChange = useCallback((s: "best" | "cheapest" | "fastest") => {
    setSortBy(s);
    if (segments.length >= 2) {
      searchedRef.current = false;
      cancelSearch();
      const directions = segments.map(seg => ({
        origin: seg.from.toUpperCase(),
        destination: seg.to.toUpperCase(),
        date: seg.date,
      }));
      searchFlights({
        directions, adults, children, infants, currency,
        sort: s, limit: 100, tripClass,
      });
    }
  }, [segments, adults, children, infants, currency, tripClass, searchFlights, cancelSearch]);

  // Dedup
  const dedupedFlights = useMemo(() => {
    const seen = new Set<string>();
    return displayFlights.filter(f => {
      if (seen.has(f.id)) return false;
      seen.add(f.id);
      return true;
    });
  }, [displayFlights]);

  const sortedFlights = useMemo(() => {
    return sortFlights(dedupedFlights, sortBy).slice(0, 25);
  }, [dedupedFlights, sortBy]);

  const formatDateLabel = (dateStr: string) => {
    try {
      const date = parse(dateStr, "yyyy-MM-dd", new Date());
      return format(date, "EEE, MMM d, yyyy");
    } catch { return dateStr; }
  };

  const from = segments[0]?.from || "";

  if (segments.length < 2) return null;

  const hasResults = (status === "complete" || isSearching) && dedupedFlights.length > 0;
  const showSkeleton = isSearching && prevResultsRef.current.length === 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 pt-20 pb-8">
        <div className="container mx-auto max-w-5xl px-4">
          {/* Header */}
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

          {/* Segment chips with leg labels */}
          <div className="mb-5 space-y-2">
            {segments.map((seg, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold w-12 shrink-0">
                  Leg {i + 1}
                </span>
                <Badge variant="secondary" className="text-xs py-1 px-2.5">
                  <span className="font-semibold">{seg.from}</span>
                  <span className="mx-1.5">→</span>
                  <span className="font-semibold">{seg.to}</span>
                  <span className="ml-1.5 text-muted-foreground">
                    {format(parse(seg.date, "yyyy-MM-dd", new Date()), "MMM d")}
                  </span>
                </Badge>
                {i < segments.length - 1 && (
                  <div className="h-4 w-px bg-border/50 ml-1" />
                )}
              </div>
            ))}
          </div>

          {/* Loading */}
          {showSkeleton && (
            <div className="space-y-6">
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Loader2 className="w-10 h-10 text-primary animate-spin mb-3" />
                <p className="text-base font-semibold text-foreground">Searching combined itinerary…</p>
                <p className="text-sm text-muted-foreground">Finding the best multi-city options</p>
              </div>
              <FlightResultsSkeleton />
            </div>
          )}

          {/* Error */}
          {status === "error" && !isSearching && dedupedFlights.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-5">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
              <p className="text-lg font-semibold text-foreground mb-2">Search failed</p>
              <p className="text-sm text-muted-foreground mb-6 max-w-md">{error || "Something went wrong."}</p>
              <div className="flex gap-3">
                <Button onClick={handleRetry} className="gap-1.5"><RefreshCw className="w-4 h-4" />Retry</Button>
                <Button variant="outline" onClick={() => navigate("/flights")}>New Search</Button>
              </div>
            </div>
          )}

          {/* No results */}
          {status === "no_results" && !isSearching && dedupedFlights.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-5">
                <Plane className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-semibold text-foreground mb-2">No combined itineraries found</p>
              <p className="text-sm text-muted-foreground mb-6">Try adjusting your dates or airports.</p>
              <div className="flex gap-3">
                <Button onClick={handleRetry} className="gap-1.5"><RefreshCw className="w-4 h-4" />Retry</Button>
                <Button variant="outline" onClick={() => navigate("/flights")}>New Search</Button>
              </div>
            </div>
          )}

          {/* Results */}
          {hasResults && !showSkeleton && (
            <div className="space-y-4">
              <FlightSortTabs
                flights={dedupedFlights}
                sortBy={sortBy}
                onSortChange={handleSortChange}
              />
              {isSearching && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                  <span>Updating results…</span>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{dedupedFlights.length}</span> combined itineraries found
              </p>
              <p className="text-[11px] text-muted-foreground/60 italic">
                Prices may differ from other platforms depending on agency availability and fare rules.
              </p>
              <div className="space-y-3">
                {sortedFlights.map((flight, index) => {
                  const showBestValue = index === 0 && isEligibleForBestValue(flight);
                  const intel = getPriceIntelligence(flight, dedupedFlights);
                  return (
                    <div key={flight.id} className="flight-card-enter" style={{ animationDelay: `${index * 40}ms` }}>
                      <SkyscannerFlightCard
                        flight={flight}
                        isBestValue={showBestValue}
                        badgeLabel={index === 0 && sortBy === "cheapest" ? "Cheapest" : undefined}
                        priceIntel={intel}
                      />
                    </div>
                  );
                })}
              </div>
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
