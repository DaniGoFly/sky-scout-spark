import { Plane, Clock, Luggage } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LiveFlight } from "@/hooks/useFlightSearch";

interface FlightCardProps {
  flight: LiveFlight;
  featured?: boolean;
  onViewDetails?: () => void;
}

const FlightCard = ({ flight, featured = false, onViewDetails }: FlightCardProps) => {
  const getStopsLabel = (stops: number): string => {
    if (stops === 0) return "Direct";
    if (stops === 1) return "1 stop";
    return `${stops} stops`;
  };

  return (
    <div
      className={`relative bg-card rounded-2xl p-6 transition-all duration-300 hover:shadow-card-hover hover:scale-[1.01] ${
        featured ? "ring-2 ring-primary shadow-card" : "shadow-card"
      }`}
    >
      {featured && (
        <div className="absolute -top-3 left-6 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
          Best Value
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center gap-6">
        {/* Airline Info */}
        <div className="flex items-center gap-4 lg:w-48">
          <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center overflow-hidden">
            <img 
              src={flight.airlineLogo} 
              alt={flight.airline} 
              className="w-8 h-8 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/placeholder.svg";
              }}
            />
          </div>
          <span className="font-semibold text-foreground">{flight.airline}</span>
        </div>

        {/* Flight Times */}
        <div className="flex-1 flex items-center gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">{flight.departureTime}</p>
            <p className="text-sm text-muted-foreground">{flight.departureCode}</p>
          </div>

          <div className="flex-1 flex flex-col items-center px-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
              <Clock className="w-4 h-4" />
              <span>{flight.duration}</span>
            </div>
            <div className="w-full h-0.5 bg-border relative">
              <Plane className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 text-primary rotate-90" />
            </div>
            <p className={`text-xs mt-2 ${flight.stops === 0 ? "text-green-600" : "text-muted-foreground"}`}>
              {getStopsLabel(flight.stops)}
            </p>
          </div>

          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">{flight.arrivalTime}</p>
            <p className="text-sm text-muted-foreground">{flight.arrivalCode}</p>
          </div>
        </div>

        {/* Amenities */}
        <div className="hidden md:flex items-center gap-4 text-muted-foreground">
          <div className="flex items-center gap-1.5 text-sm">
            <Luggage className="w-4 h-4" />
            <span>23kg</span>
          </div>
        </div>

        {/* Price & CTA */}
        <div className="flex items-center justify-between lg:flex-col lg:items-end gap-3">
          <div className="text-right">
            <p className="text-sm text-muted-foreground">From</p>
            <p className="text-3xl font-bold text-foreground">${flight.price}</p>
            <p className="text-xs text-muted-foreground">per person</p>
          </div>
          <Button 
            variant="hero" 
            size="lg" 
            className="gap-2" 
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails?.();
            }}
          >
            View Deal
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FlightCard;
