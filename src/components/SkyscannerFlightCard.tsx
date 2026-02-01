import { useState } from "react";
import { Plane, Loader2, ExternalLink, Heart, MapPin, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import AirlineMark from "@/components/AirlineMark";
import { NormalizedFlight, isEligibleForBestValue } from "@/lib/flightNormalizer";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SkyscannerFlightCardProps {
  flight: NormalizedFlight;
  isBestValue?: boolean;
  isLoading?: boolean;
  onViewDeal: () => void;
  fetchedAt?: number;
  isNearbyAirport?: boolean;
  originalAirport?: string;
}

const STALE_THRESHOLD_MS = 120000;

const getTimeAgo = (timestamp: number): string => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 5) return "Updated just now";
  if (seconds < 60) return `Updated ${seconds}s ago`;
  if (seconds < 3600) return `Updated ${Math.floor(seconds / 60)}m ago`;
  return "Price may have changed";
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
    <TooltipProvider>
      <div
        className={`relative bg-card rounded-2xl border transition-all duration-200 hover:shadow-lg ${
          showBestValue ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/40"
        }`}
      >
        {/* Best Value Badge */}
        {showBestValue && (
          <div className="absolute -top-3 left-6 z-10">
            <Badge className="bg-primary text-primary-foreground shadow-md">Best Value</Badge>
          </div>
        )}

        {/* Nearby Airport Indicator */}
        {isNearbyAirport && originalAirport && (
          <div className="bg-accent/10 border-b border-accent/20 px-4 py-2 flex items-center gap-2 min-w-0">
            <MapPin className="w-4 h-4 text-accent flex-shrink-0" />
            <span className="text-xs text-accent font-medium truncate">
              Nearby airport (instead of {originalAirport})
            </span>
          </div>
        )}

        {/* Main Card Content */}
        <div className="p-4 lg:p-5">
          {/* Mobile: stacked layout / Desktop: 3-column grid */}
          <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[auto_1fr_minmax(200px,260px)] lg:gap-5 lg:items-center">
            
            {/* Column 1: Airline Info */}
            <div className="flex items-center gap-3 min-w-0 lg:max-w-[160px]">
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

            {/* Column 2: Flight Times & Route */}
            <div className="flex items-center gap-3 min-w-0">
              {/* Departure */}
              <div className="text-left flex-shrink-0 w-14">
                <p className="text-lg lg:text-xl font-bold text-foreground leading-tight">
                  {flight.departureTime || "—"}
                </p>
                <p className="text-xs lg:text-sm font-medium text-muted-foreground">
                  {flight.originIata}
                </p>
              </div>

              {/* Flight Path Visual */}
              <div className="flex-1 flex flex-col items-center min-w-0 px-1">
                <span className="text-[10px] lg:text-xs text-muted-foreground mb-1 truncate max-w-full">
                  {flight.duration || "—"}
                </span>
                <div className="w-full h-[2px] bg-border relative">
                  <div className="absolute left-0 w-1.5 h-1.5 bg-muted-foreground rounded-full -translate-y-[2px]" />
                  <Plane className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 text-primary rotate-90" />
                  <div className="absolute right-0 w-1.5 h-1.5 bg-primary rounded-full -translate-y-[2px]" />
                </div>
                <span
                  className={`text-[10px] lg:text-xs mt-1 font-medium truncate max-w-full ${
                    flight.stops === 0 ? "text-green-600" : "text-muted-foreground"
                  }`}
                  title={getStopsLabel(flight.stops, flight.stopAirports)}
                >
                  {getStopsLabel(flight.stops, flight.stopAirports)}
                </span>
              </div>

              {/* Arrival */}
              <div className="text-right flex-shrink-0 w-14">
                <p className="text-lg lg:text-xl font-bold text-foreground leading-tight">
                  {flight.arrivalTime || "—"}
                </p>
                <p className="text-xs lg:text-sm font-medium text-muted-foreground">
                  {flight.destinationIata}
                </p>
              </div>
            </div>

            {/* Column 3: Price & CTA */}
            <div className="flex items-center gap-3 justify-between lg:justify-end min-w-0">
              {/* Price Section */}
              <div className="text-left lg:text-right min-w-0 flex-1 lg:flex-initial">
                {showCheckPrice ? (
                  <>
                    <p className="text-base lg:text-lg font-bold text-muted-foreground">Check price</p>
                    <p className="text-[10px] text-muted-foreground/70 truncate">
                      {stale ? "Price may have changed" : "Price unavailable"}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-1 lg:justify-end">
                      <span className="text-xs text-muted-foreground">From</span>
                      <p className="text-xl lg:text-2xl font-bold text-foreground whitespace-nowrap">
                        {formatPrice(flight.price, flight.currency)}
                      </p>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button 
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Info className="w-3 h-3" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p className="text-sm">Prices are estimates from our partners and can change on the booking site.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <p className="text-[10px] lg:text-xs text-muted-foreground">per person</p>
                    <p className="text-[9px] text-muted-foreground/60">Price may change when you book</p>
                  </>
                )}
                {fetchedAt && !showCheckPrice && (
                  <p className={`text-[9px] ${stale ? 'text-amber-500' : 'text-muted-foreground/60'}`}>
                    {getTimeAgo(fetchedAt)}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSave}
                  className={`h-9 w-9 rounded-full ${isSaved ? 'text-red-500' : 'text-muted-foreground'}`}
                  title={isSaved ? "Remove from saved" : "Save flight"}
                >
                  <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                </Button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!isLoading && !isDisabled) onViewDeal();
                      }}
                      disabled={isDisabled || isLoading}
                      size="default"
                      className="gap-1.5 font-semibold text-sm px-3 lg:px-4 whitespace-nowrap"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span className="hidden sm:inline">Opening</span>
                        </>
                      ) : isDisabled ? (
                        <span>Unavailable</span>
                      ) : (
                        <>
                          <span>View Deal</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </>
                      )}
                    </Button>
                  </TooltipTrigger>
                  {isDisabled && (
                    <TooltipContent side="top">
                      <p className="text-sm">Booking link unavailable</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </div>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default SkyscannerFlightCard;
