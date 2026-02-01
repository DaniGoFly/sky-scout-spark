import { useState } from "react";
import { Plane, Loader2, Heart, MapPin, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import AirlineMark from "@/components/AirlineMark";
import { NormalizedFlight, isEligibleForBestValue } from "@/lib/flightNormalizer";

interface SkyscannerFlightCardProps {
  flight: NormalizedFlight;
  isBestValue?: boolean;
  isLoading?: boolean;
  onViewDeal: () => void;
  fetchedAt?: number;
  isNearbyAirport?: boolean;
  originalAirport?: string;
  dealsCount?: number;
}

const STALE_THRESHOLD_MS = 120000;

const getTimeAgo = (timestamp: number): string => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return "price may have changed";
};

const isPriceStale = (timestamp?: number): boolean => {
  if (!timestamp) return false;
  return Date.now() - timestamp > STALE_THRESHOLD_MS;
};

// Safe text display - never shows undefined/null
const safeText = (value: string | undefined | null, fallback = "—"): string => {
  if (!value || value === "undefined" || value === "null") return fallback;
  return value;
};

const SkyscannerFlightCard = ({
  flight,
  isBestValue = false,
  isLoading = false,
  onViewDeal,
  fetchedAt,
  isNearbyAirport = false,
  originalAirport,
  dealsCount = 1,
}: SkyscannerFlightCardProps) => {
  const [isSaved, setIsSaved] = useState(false);
  
  const getStopsLabel = (stops: number, stopAirports?: string[]): string => {
    if (stops === 0) return "Direct";
    const validStops = (stopAirports || []).filter(s => s && s !== "undefined");
    const stopInfo = validStops.length > 0 ? ` · ${validStops.slice(0, 2).join(", ")}` : "";
    if (stops === 1) return `1 stop${stopInfo}`;
    return `${stops} stops${stopInfo}`;
  };

  const formatPrice = (price: number, currency: string): string => {
    const symbols: Record<string, string> = { EUR: "€", USD: "$", GBP: "£", CHF: "CHF " };
    const symbol = symbols[currency] || (currency ? currency + " " : "$");
    return `${symbol}${Math.round(price).toLocaleString()}`;
  };

  const handleSave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsSaved(!isSaved);
    const saved = JSON.parse(localStorage.getItem('savedFlights') || '[]');
    if (!isSaved) saved.push(flight.id);
    else {
      const idx = saved.indexOf(flight.id);
      if (idx > -1) saved.splice(idx, 1);
    }
    localStorage.setItem('savedFlights', JSON.stringify(saved));
  };

  const canBook = flight.hasValidBookingUrl;
  const priceInvalid = !flight.isPriceValid || !flight.price || flight.price <= 0 || isNaN(flight.price);
  const stale = isPriceStale(fetchedAt);
  const showCheckPrice = priceInvalid || stale;
  const isDisabled = !canBook;
  const showBestValue = isBestValue && isEligibleForBestValue(flight, fetchedAt, STALE_THRESHOLD_MS);

  // Safe values for display
  const departTime = safeText(flight.departureTime);
  const arriveTime = safeText(flight.arrivalTime);
  const duration = safeText(flight.duration);
  const originCode = safeText(flight.originIata, "---");
  const destCode = safeText(flight.destinationIata, "---");
  const airlineName = safeText(flight.airlineName, "Airline");

  return (
    <div
      className={`relative bg-card rounded-2xl border transition-all duration-200 hover:shadow-lg overflow-hidden ${
        showBestValue ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/40"
      }`}
    >
      {/* Best Value Badge */}
      {showBestValue && (
        <div className="absolute -top-3 left-6 z-10">
          <Badge className="bg-primary text-primary-foreground shadow-md px-3">Best</Badge>
        </div>
      )}

      {/* Nearby Airport Indicator */}
      {isNearbyAirport && originalAirport && (
        <div className="bg-accent/10 border-b border-accent/20 px-4 py-2 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-accent flex-shrink-0" />
          <span className="text-xs text-accent font-medium truncate">
            Nearby airport (instead of {originalAirport})
          </span>
        </div>
      )}

      {/* Main Card Content - CSS Grid Layout */}
      <div 
        className="p-4 lg:p-5"
        style={{ minWidth: 0 }} // Prevent grid blowout
      >
        {/* 
          Desktop: 3-column CSS grid
          Mobile: stacked flex layout
        */}
        <div 
          className="
            flex flex-col gap-4
            lg:grid lg:items-center lg:gap-4
          "
          style={{
            // Desktop grid template
            gridTemplateColumns: 'auto 1fr minmax(240px, 300px)',
          }}
        >
          
          {/* Column 1: Airline Info */}
          <div 
            className="flex items-center gap-3"
            style={{ minWidth: 0 }} // Critical for text truncation
          >
            <AirlineMark
              airlineCode={flight.airlineCode || "XX"}
              airlineName={airlineName}
              logoUrl={flight.airlineLogo}
              size="md"
            />
            <div className="min-w-0 flex-1 max-w-[120px]">
              <p 
                className="font-medium text-foreground text-sm truncate" 
                title={airlineName}
                style={{ overflowWrap: 'anywhere' }}
              >
                {airlineName}
              </p>
              {flight.flightNumber && (
                <p className="text-xs text-muted-foreground truncate">
                  {flight.flightNumber}
                </p>
              )}
            </div>
          </div>

          {/* Column 2: Flight Times & Route (Itinerary) */}
          <div 
            className="flex items-center gap-3"
            style={{ minWidth: 0 }} // Critical for flex children
          >
            {/* Departure */}
            <div className="text-left flex-shrink-0" style={{ minWidth: '56px' }}>
              <p className="text-lg lg:text-xl font-bold text-foreground leading-tight">
                {departTime}
              </p>
              <p className="text-xs font-medium text-muted-foreground uppercase">
                {originCode}
              </p>
            </div>

            {/* Flight Path Visual */}
            <div 
              className="flex-1 flex flex-col items-center px-2"
              style={{ minWidth: '80px', maxWidth: '200px' }}
            >
              <span className="text-[11px] text-muted-foreground mb-1 font-medium whitespace-nowrap">
                {duration}
              </span>
              <div className="w-full h-[2px] bg-border relative">
                <div className="absolute left-0 w-2 h-2 bg-muted-foreground rounded-full -translate-y-[3px]" />
                <Plane className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 text-primary rotate-90" />
                <div className="absolute right-0 w-2 h-2 bg-primary rounded-full -translate-y-[3px]" />
              </div>
              <span
                className={`text-[11px] mt-1 font-medium whitespace-nowrap ${
                  flight.stops === 0 ? "text-green-600" : "text-amber-600"
                }`}
                title={getStopsLabel(flight.stops, flight.stopAirports)}
              >
                {getStopsLabel(flight.stops, flight.stopAirports)}
              </span>
            </div>

            {/* Arrival */}
            <div className="text-right flex-shrink-0" style={{ minWidth: '56px' }}>
              <p className="text-lg lg:text-xl font-bold text-foreground leading-tight">
                {arriveTime}
              </p>
              <p className="text-xs font-medium text-muted-foreground uppercase">
                {destCode}
              </p>
            </div>
          </div>

          {/* Column 3: Price & CTA - Fixed Width, Never Overlaps */}
          <div 
            className="
              flex items-center gap-3 justify-between
              pt-3 border-t border-border/50
              lg:pt-0 lg:border-t-0 lg:justify-end lg:pl-4
            "
            style={{ minWidth: 0, flexShrink: 0 }}
          >
            {/* Price Section */}
            <div className="text-left lg:text-right" style={{ minWidth: 0, flexShrink: 1 }}>
              {showCheckPrice ? (
                <>
                  <p className="text-base font-semibold text-muted-foreground whitespace-nowrap">
                    Check price
                  </p>
                  <p className="text-[10px] text-muted-foreground/70">
                    {stale ? "Price may have changed" : "Price unavailable"}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[11px] text-muted-foreground">
                    {dealsCount > 1 ? `${dealsCount} deals from` : "1 deal"}
                  </p>
                  <p className="text-xl lg:text-2xl font-bold text-foreground whitespace-nowrap">
                    {formatPrice(flight.price, flight.currency)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">per person</p>
                </>
              )}
              {fetchedAt && !showCheckPrice && (
                <p className={`text-[9px] whitespace-nowrap ${stale ? 'text-amber-500' : 'text-muted-foreground/60'}`}>
                  Updated {getTimeAgo(fetchedAt)}
                </p>
              )}
            </div>

            {/* Action Buttons - Fixed Size */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSave}
                className={`h-9 w-9 rounded-full flex-shrink-0 ${
                  isSaved ? 'text-red-500' : 'text-muted-foreground hover:text-foreground'
                }`}
                title={isSaved ? "Remove from saved" : "Save flight"}
              >
                <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
              </Button>
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!isLoading && !isDisabled) onViewDeal();
                }}
                disabled={isDisabled || isLoading}
                size="default"
                className="gap-1 font-semibold text-sm px-4 whitespace-nowrap flex-shrink-0"
                style={{ minWidth: '100px' }}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="hidden sm:inline">Opening</span>
                  </>
                ) : isDisabled ? (
                  <span>Unavailable</span>
                ) : (
                  <>
                    <span>Select</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Price disclaimer footer */}
      {!showCheckPrice && (
        <div className="px-4 pb-3 lg:px-5">
          <p className="text-[9px] text-muted-foreground/50 text-right">
            Price may change when you book
          </p>
        </div>
      )}
    </div>
  );
};

export default SkyscannerFlightCard;
