import { useState } from "react";
import { Plane, Loader2, ExternalLink, Heart, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import AirlineMark from "@/components/AirlineMark";
import { NormalizedFlight } from "@/lib/flightNormalizer";

interface SkyscannerFlightCardProps {
  flight: NormalizedFlight;
  isBestValue?: boolean;
  isLoading?: boolean;
  onViewDeal: () => void;
  fetchedAt?: number;
  isNearbyAirport?: boolean;
  originalAirport?: string;
}

const getTimeAgo = (timestamp: number): string => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 5) return "Updated just now";
  if (seconds < 60) return `Updated ${seconds}s ago`;
  if (seconds < 3600) return `Updated ${Math.floor(seconds / 60)}m ago`;
  return "Price may be outdated";
};

const isPriceStale = (timestamp?: number): boolean => {
  if (!timestamp) return false;
  return Date.now() - timestamp > 300000; // 5 minutes
};

const SkyscannerFlightCard = ({
  flight,
  isBestValue = false,
  isLoading = false,
  onViewDeal,
  fetchedAt,
  isNearbyAirport = false,
  originalAirport,
}: SkyscannerFlightCardProps) => {
  const [isSaved, setIsSaved] = useState(false);
  
  const getStopsLabel = (stops: number, stopAirports?: string[]): string => {
    if (stops === 0) return "Direct";
    
    const stopInfo = stopAirports?.length 
      ? ` · ${stopAirports.slice(0, 2).join(", ")}`
      : "";
    
    if (stops === 1) return `1 stop${stopInfo}`;
    return `${stops} stops${stopInfo}`;
  };

  const formatPrice = (price: number, currency: string): string => {
    const symbols: Record<string, string> = {
      EUR: "€",
      USD: "$",
      GBP: "£",
      CHF: "CHF ",
    };
    // Round to whole number like Skyscanner
    const roundedPrice = Math.round(price);
    return `${symbols[currency] || currency + " "}${roundedPrice.toLocaleString()}`;
  };

  const handleSave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsSaved(!isSaved);
    // Save to localStorage
    const saved = JSON.parse(localStorage.getItem('savedFlights') || '[]');
    if (!isSaved) {
      saved.push(flight.id);
    } else {
      const idx = saved.indexOf(flight.id);
      if (idx > -1) saved.splice(idx, 1);
    }
    localStorage.setItem('savedFlights', JSON.stringify(saved));
  };

  const canBook = flight.hasValidBookingUrl;
  const priceInvalid = !flight.price || flight.price <= 0 || isNaN(flight.price);
  const stale = isPriceStale(fetchedAt);
  const showCheckPrice = priceInvalid;
  const isDisabled = !canBook || showCheckPrice;

  return (
    <div
      className={`relative bg-card rounded-2xl border transition-all duration-200 hover:shadow-lg overflow-hidden ${
        isBestValue
          ? "border-primary ring-2 ring-primary/20"
          : "border-border hover:border-primary/40"
      }`}
    >
      {/* Best Value Badge */}
      {isBestValue && (
        <div className="absolute -top-3 left-6 z-10">
          <Badge className="bg-primary text-primary-foreground shadow-md">
            Best Value
          </Badge>
        </div>
      )}

      {/* Nearby Airport Indicator */}
      {isNearbyAirport && originalAirport && (
        <div className="bg-accent/10 border-b border-accent/20 px-5 py-2 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-accent" />
          <span className="text-xs text-accent font-medium">
            Nearby airport (instead of {originalAirport})
          </span>
        </div>
      )}

      <div className="p-5 md:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-5">
          {/* Row 1: Airline Info */}
          <div className="flex items-center gap-3 lg:w-44 shrink-0 min-w-0">
            <AirlineMark
              airlineCode={flight.airlineCode}
              airlineName={flight.airlineName}
              logoUrl={flight.airlineLogo}
              size="md"
            />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-foreground text-sm truncate" title={flight.airlineName}>
                {flight.airlineName}
              </p>
              {flight.flightNumber && (
                <p className="text-xs text-muted-foreground truncate">{flight.flightNumber}</p>
              )}
            </div>
          </div>

          {/* Row 2: Flight Times & Route */}
          <div className="flex-1 flex items-center gap-3 md:gap-6 min-w-0">
            {/* Departure */}
            <div className="text-left shrink-0" style={{ minWidth: '60px' }}>
              {flight.departureTime ? (
                <p className="text-xl md:text-2xl font-bold text-foreground tracking-tight">
                  {flight.departureTime}
                </p>
              ) : (
                <p className="text-lg text-muted-foreground">—</p>
              )}
              <p className="text-sm font-medium text-muted-foreground">
                {flight.originIata}
              </p>
            </div>

            {/* Flight Path Visual */}
            <div className="flex-1 flex flex-col items-center px-2 min-w-0 overflow-hidden">
              {flight.duration && (
                <span className="text-xs text-muted-foreground mb-1 truncate max-w-full">
                  {flight.duration}
                </span>
              )}
              <div className="w-full h-[2px] bg-border relative">
                <div className="absolute left-0 w-2 h-2 bg-muted-foreground rounded-full -translate-y-[3px]" />
                <Plane className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 text-primary rotate-90" />
                <div className="absolute right-0 w-2 h-2 bg-primary rounded-full -translate-y-[3px]" />
              </div>
              <span
                className={`text-xs mt-1 font-medium truncate max-w-full ${
                  flight.stops === 0 ? "text-green-600" : "text-muted-foreground"
                }`}
              >
                {getStopsLabel(flight.stops, flight.stopAirports)}
              </span>
            </div>

            {/* Arrival */}
            <div className="text-right shrink-0" style={{ minWidth: '60px' }}>
              {flight.arrivalTime ? (
                <p className="text-xl md:text-2xl font-bold text-foreground tracking-tight">
                  {flight.arrivalTime}
                </p>
              ) : (
                <p className="text-lg text-muted-foreground">—</p>
              )}
              <p className="text-sm font-medium text-muted-foreground">
                {flight.destinationIata}
              </p>
            </div>
          </div>

          {/* Row 3: Price & CTA */}
          <div className="flex items-center justify-between lg:flex-col lg:items-end gap-3 shrink-0" style={{ minWidth: '140px' }}>
            <div className="text-right min-w-0">
              {showCheckPrice ? (
                <p className="text-lg md:text-xl font-bold text-muted-foreground truncate">
                  Check price
                </p>
              ) : (
                <>
                  <p className="text-2xl md:text-3xl font-bold text-foreground truncate">
                    {formatPrice(flight.price, flight.currency)}
                  </p>
                  <p className="text-xs text-muted-foreground">per person</p>
                </>
              )}
              {fetchedAt && !showCheckPrice && (
                <p className={`text-[10px] mt-0.5 ${stale ? 'text-amber-500' : 'text-muted-foreground/60'}`}>
                  {getTimeAgo(fetchedAt)}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSave}
                className={`h-10 w-10 rounded-full shrink-0 ${isSaved ? 'text-red-500' : 'text-muted-foreground'}`}
                title={isSaved ? "Remove from saved" : "Save flight"}
              >
                <Heart className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
              </Button>
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!isLoading && !isDisabled) {
                    onViewDeal();
                  }
                }}
                disabled={isDisabled || isLoading}
                size="lg"
                className="gap-2 font-semibold shrink-0 whitespace-nowrap"
                style={{ minWidth: '120px' }}
                title={!canBook ? "Booking unavailable" : showCheckPrice ? "Price unavailable" : "View this deal"}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="truncate">Opening...</span>
                  </>
                ) : (
                  <>
                    <span className="truncate">View Deal</span>
                    <ExternalLink className="w-4 h-4 shrink-0" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SkyscannerFlightCard;
