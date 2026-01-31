import { Plane, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import AirlineMark from "@/components/AirlineMark";
import { NormalizedFlight } from "@/lib/flightNormalizer";

interface SkyscannerFlightCardProps {
  flight: NormalizedFlight;
  isBestValue?: boolean;
  isLoading?: boolean;
  onViewDeal: () => void;
}

const SkyscannerFlightCard = ({
  flight,
  isBestValue = false,
  isLoading = false,
  onViewDeal,
}: SkyscannerFlightCardProps) => {
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
    return `${symbols[currency] || currency + " "}${price.toLocaleString()}`;
  };

  const canBook = flight.hasValidBookingUrl;

  return (
    <div
      className={`relative bg-card rounded-2xl border transition-all duration-200 hover:shadow-lg ${
        isBestValue
          ? "border-primary ring-2 ring-primary/20"
          : "border-border hover:border-primary/40"
      }`}
    >
      {/* Best Value Badge */}
      {isBestValue && (
        <div className="absolute -top-3 left-6">
          <Badge className="bg-primary text-primary-foreground shadow-md">
            Best Value
          </Badge>
        </div>
      )}

      <div className="p-5 md:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-5">
          {/* Row 1: Airline Info */}
          <div className="flex items-center gap-3 lg:w-44 shrink-0">
            <AirlineMark
              airlineCode={flight.airlineCode}
              airlineName={flight.airlineName}
              logoUrl={flight.airlineLogo}
              size="md"
            />
            <div className="min-w-0">
              <p className="font-semibold text-foreground text-sm truncate">
                {flight.airlineName}
              </p>
              {flight.flightNumber && (
                <p className="text-xs text-muted-foreground">{flight.flightNumber}</p>
              )}
            </div>
          </div>

          {/* Row 2: Flight Times & Route */}
          <div className="flex-1 flex items-center gap-3 md:gap-6">
            {/* Departure */}
            <div className="text-left min-w-[60px]">
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
            <div className="flex-1 flex flex-col items-center px-2">
              {flight.duration && (
                <span className="text-xs text-muted-foreground mb-1">
                  {flight.duration}
                </span>
              )}
              <div className="w-full h-[2px] bg-border relative">
                <div className="absolute left-0 w-2 h-2 bg-muted-foreground rounded-full -translate-y-[3px]" />
                <Plane className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 text-primary rotate-90" />
                <div className="absolute right-0 w-2 h-2 bg-primary rounded-full -translate-y-[3px]" />
              </div>
              <span
                className={`text-xs mt-1 font-medium ${
                  flight.stops === 0 ? "text-green-600" : "text-muted-foreground"
                }`}
              >
                {getStopsLabel(flight.stops, flight.stopAirports)}
              </span>
            </div>

            {/* Arrival */}
            <div className="text-right min-w-[60px]">
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
          <div className="flex items-center justify-between lg:flex-col lg:items-end gap-3 lg:w-36 shrink-0">
            <div className="text-right">
              <p className="text-2xl md:text-3xl font-bold text-foreground">
                {formatPrice(flight.price, flight.currency)}
              </p>
              <p className="text-xs text-muted-foreground">per person</p>
            </div>
            <Button
              onClick={onViewDeal}
              disabled={!canBook || isLoading}
              size="lg"
              className="gap-2 min-w-[130px] font-semibold"
              title={!canBook ? "Booking unavailable" : "View this deal"}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Opening...
                </>
              ) : (
                <>
                  View Deal
                  <ExternalLink className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SkyscannerFlightCard;
