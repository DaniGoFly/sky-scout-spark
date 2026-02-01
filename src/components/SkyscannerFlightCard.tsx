import { useState } from "react";
import { Plane, Loader2, ExternalLink, Heart, MapPin, ChevronRight } from "lucide-react";
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
  dealsCount?: number; // Number of booking options/providers
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
    const stopInfo = stopAirports?.length ? ` · ${stopAirports.slice(0, 2).join(", ")}` : "";
    if (stops === 1) return `1 stop${stopInfo}`;
    return `${stops} stops${stopInfo}`;
  };

  const formatPrice = (price: number, currency: string): string => {
    const symbols: Record<string, string> = { EUR: "€", USD: "$", GBP: "£", CHF: "CHF " };
    return `${symbols[currency] || currency + " "}${Math.round(price).toLocaleString()}`;
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

  return (
    <div
      className={`relative bg-card rounded-2xl border transition-all duration-200 hover:shadow-lg ${
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
        <div className="bg-accent/10 border-b border-accent/20 px-4 py-2 flex items-center gap-2 min-w-0 rounded-t-2xl">
          <MapPin className="w-4 h-4 text-accent flex-shrink-0" />
          <span className="text-xs text-accent font-medium truncate">
            Nearby airport (instead of {originalAirport})
          </span>
        </div>
      )}

      {/* Main Card Content */}
      <div className="p-4 lg:p-5">
        {/* Mobile: stacked layout / Desktop: 3-column grid */}
        <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[auto_1fr_minmax(180px,240px)] lg:gap-6 lg:items-center">
          
          {/* Column 1: Airline Info */}
          <div className="flex items-center gap-3 min-w-0 lg:max-w-[140px]">
            <AirlineMark
              airlineCode={flight.airlineCode}
              airlineName={flight.airlineName}
              logoUrl={flight.airlineLogo}
              size="md"
            />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground text-sm truncate" title={flight.airlineName}>
                {flight.airlineName}
              </p>
              {flight.flightNumber && (
                <p className="text-xs text-muted-foreground truncate">{flight.flightNumber}</p>
              )}
            </div>
          </div>

          {/* Column 2: Flight Times & Route */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Departure */}
            <div className="text-left flex-shrink-0 min-w-[52px]">
              <p className="text-lg lg:text-xl font-bold text-foreground leading-tight">
                {flight.departureTime || "—"}
              </p>
              <p className="text-xs font-medium text-muted-foreground">
                {flight.originIata}
              </p>
            </div>

            {/* Flight Path Visual */}
            <div className="flex-1 flex flex-col items-center min-w-0 px-2">
              <span className="text-[11px] text-muted-foreground mb-1.5 truncate max-w-full font-medium">
                {flight.duration || "—"}
              </span>
              <div className="w-full h-[2px] bg-border relative">
                <div className="absolute left-0 w-2 h-2 bg-muted-foreground rounded-full -translate-y-[3px]" />
                <Plane className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 text-primary rotate-90" />
                <div className="absolute right-0 w-2 h-2 bg-primary rounded-full -translate-y-[3px]" />
              </div>
              <span
                className={`text-[11px] mt-1.5 font-medium truncate max-w-full ${
                  flight.stops === 0 ? "text-green-600" : "text-amber-600"
                }`}
                title={getStopsLabel(flight.stops, flight.stopAirports)}
              >
                {getStopsLabel(flight.stops, flight.stopAirports)}
              </span>
            </div>

            {/* Arrival */}
            <div className="text-right flex-shrink-0 min-w-[52px]">
              <p className="text-lg lg:text-xl font-bold text-foreground leading-tight">
                {flight.arrivalTime || "—"}
              </p>
              <p className="text-xs font-medium text-muted-foreground">
                {flight.destinationIata}
              </p>
            </div>
          </div>

          {/* Column 3: Price & CTA */}
          <div className="flex items-center gap-3 justify-between lg:justify-end min-w-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-border/50">
            {/* Price Section */}
            <div className="text-left lg:text-right min-w-0 flex-1 lg:flex-initial">
              {showCheckPrice ? (
                <>
                  <p className="text-base font-semibold text-muted-foreground">Check price</p>
                  <p className="text-[10px] text-muted-foreground/70 truncate">
                    {stale ? "Price may have changed" : "Price unavailable"}
                  </p>
                </>
              ) : (
                <>
                  {/* Deals count text */}
                  <p className="text-[11px] text-muted-foreground mb-0.5">
                    {dealsCount > 1 ? `${dealsCount} deals from` : "1 deal"}
                  </p>
                  {/* Price */}
                  <p className="text-xl lg:text-2xl font-bold text-foreground whitespace-nowrap">
                    {formatPrice(flight.price, flight.currency)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">per person</p>
                </>
              )}
              {fetchedAt && !showCheckPrice && (
                <p className={`text-[9px] ${stale ? 'text-amber-500' : 'text-muted-foreground/60'}`}>
                  Updated {getTimeAgo(fetchedAt)}
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSave}
                className={`h-9 w-9 rounded-full ${isSaved ? 'text-red-500' : 'text-muted-foreground hover:text-foreground'}`}
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
                className="gap-1 font-semibold text-sm px-4 whitespace-nowrap min-w-[90px]"
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

      {/* Price disclaimer - subtle footer */}
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
