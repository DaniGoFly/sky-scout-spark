import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plane, Clock, Luggage, Wifi, Coffee, ExternalLink, MapPin, Check } from "lucide-react";
import { LiveFlight } from "@/hooks/useFlightSearch";
import { generateFlightAffiliateUrl } from "@/lib/affiliateLinks";
import { format } from "date-fns";

interface FlightDetailsModalProps {
  flight: LiveFlight | null;
  isOpen: boolean;
  onClose: () => void;
  searchDate?: string; // The original search departure date
}

const FlightDetailsModal = ({ flight, isOpen, onClose, searchDate }: FlightDetailsModalProps) => {
  if (!flight) return null;

  // Generate the affiliate booking URL
  const getBookingUrl = (): string => {
    // If flight has a valid deep link from API, use it
    if (flight.deepLink && flight.deepLink !== "#") {
      return flight.deepLink;
    }
    
    // Otherwise, generate Travelpayouts affiliate URL
    const departDate = searchDate || format(new Date(), "yyyy-MM-dd");
    
    return generateFlightAffiliateUrl({
      departureCode: flight.departureCode,
      arrivalCode: flight.arrivalCode,
      departDate: departDate,
      returnDate: flight.returnAt,
    });
  };

  const handleBookNow = () => {
    const bookingUrl = getBookingUrl();
    window.open(bookingUrl, "_blank", "noopener,noreferrer");
  };

  const getStopsLabel = (stops: number): string => {
    if (stops === 0) return "Direct flight";
    if (stops === 1) return "1 stop";
    return `${stops} stops`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
              <img 
                src={flight.airlineLogo} 
                alt={flight.airline}
                className="w-6 h-6 object-contain"
                onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
              />
            </div>
            {flight.airline} - {flight.flightNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Flight Route */}
          <div className="bg-secondary/30 rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div className="text-center">
                <p className="text-3xl font-bold text-foreground">{flight.departureTime}</p>
                <p className="text-lg font-medium text-muted-foreground">{flight.departureCode}</p>
              </div>

              <div className="flex-1 px-6">
                <div className="flex items-center justify-center gap-2 text-muted-foreground mb-2">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-medium">{flight.duration}</span>
                </div>
                <div className="relative">
                  <div className="h-0.5 bg-border w-full" />
                  <Plane className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 text-primary rotate-90" />
                </div>
                <p className={`text-center text-sm mt-2 ${flight.stops === 0 ? "text-emerald-600" : "text-muted-foreground"}`}>
                  {getStopsLabel(flight.stops)}
                </p>
              </div>

              <div className="text-center">
                <p className="text-3xl font-bold text-foreground">{flight.arrivalTime}</p>
                <p className="text-lg font-medium text-muted-foreground">{flight.arrivalCode}</p>
              </div>
            </div>
          </div>

          {/* Flight Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <MapPin className="w-4 h-4" />
                <span className="text-sm font-medium">Route</span>
              </div>
              <p className="font-semibold text-foreground">
                {flight.departureCode} → {flight.arrivalCode}
              </p>
            </div>

            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">Duration</span>
              </div>
              <p className="font-semibold text-foreground">{flight.duration}</p>
            </div>
          </div>

          {/* Amenities */}
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Included Amenities
            </h4>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 px-3 py-2 bg-secondary/50 rounded-lg text-sm">
                <Luggage className="w-4 h-4 text-primary" />
                <span>23kg checked bag</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-secondary/50 rounded-lg text-sm">
                <Wifi className="w-4 h-4 text-primary" />
                <span>In-flight WiFi</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-secondary/50 rounded-lg text-sm">
                <Coffee className="w-4 h-4 text-primary" />
                <span>Meals included</span>
              </div>
            </div>
          </div>

          {/* What's included */}
          <div className="bg-muted/30 rounded-xl p-4">
            <h4 className="font-semibold text-foreground mb-3">What's included</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Check className="w-4 h-4 text-emerald-500" />
                <span>Free seat selection</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Check className="w-4 h-4 text-emerald-500" />
                <span>Priority boarding</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Check className="w-4 h-4 text-emerald-500" />
                <span>Flexible rebooking</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Check className="w-4 h-4 text-emerald-500" />
                <span>24h free cancellation</span>
              </div>
            </div>
          </div>

          {/* Price & Booking */}
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total price per person</p>
                <p className="text-4xl font-bold text-foreground">${flight.price}</p>
                <p className="text-xs text-muted-foreground mt-1">Includes taxes & fees</p>
              </div>
              <Button 
                variant="hero" 
                size="lg" 
                onClick={handleBookNow} 
                className="gap-2 shrink-0"
              >
                Continue to Booking
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            You'll be redirected to our travel partner (Aviasales) to complete your booking securely.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FlightDetailsModal;
