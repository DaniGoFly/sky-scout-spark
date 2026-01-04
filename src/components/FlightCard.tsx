import { Plane, Clock, Luggage, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FlightCardProps {
  airline: string;
  airlineLogo: string;
  departureTime: string;
  arrivalTime: string;
  departureCode: string;
  arrivalCode: string;
  duration: string;
  stops: string;
  price: number;
  deepLink?: string;
  featured?: boolean;
}

const FlightCard = ({
  airline,
  airlineLogo,
  departureTime,
  arrivalTime,
  departureCode,
  arrivalCode,
  duration,
  stops,
  price,
  deepLink,
  featured = false,
}: FlightCardProps) => {
  
  const handleViewDeal = () => {
    const url = deepLink || `https://www.aviasales.com/search/${departureCode}${arrivalCode}1?marker=694224`;
    
    // Log clickout event
    const clickoutEvent = {
      timestamp: new Date().toISOString(),
      airline,
      route: `${departureCode}-${arrivalCode}`,
      price,
      url,
    };
    
    console.log("Affiliate Clickout:", clickoutEvent);
    
    // Store in localStorage for tracking
    const existingClickouts = JSON.parse(localStorage.getItem("flight_clickouts") || "[]");
    existingClickouts.push(clickoutEvent);
    localStorage.setItem("flight_clickouts", JSON.stringify(existingClickouts));

    // Open affiliate link in new tab
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      className={`relative bg-card rounded-2xl p-6 transition-all duration-300 hover:shadow-card-hover ${
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
              src={airlineLogo} 
              alt={airline} 
              className="w-8 h-8 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/placeholder.svg";
              }}
            />
          </div>
          <span className="font-semibold text-foreground">{airline}</span>
        </div>

        {/* Flight Times */}
        <div className="flex-1 flex items-center gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">{departureTime}</p>
            <p className="text-sm text-muted-foreground">{departureCode}</p>
          </div>

          <div className="flex-1 flex flex-col items-center px-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
              <Clock className="w-4 h-4" />
              <span>{duration}</span>
            </div>
            <div className="w-full h-0.5 bg-border relative">
              <Plane className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 text-primary rotate-90" />
            </div>
            <p className={`text-xs mt-2 ${stops === "Direct" ? "text-green-600" : "text-muted-foreground"}`}>
              {stops}
            </p>
          </div>

          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">{arrivalTime}</p>
            <p className="text-sm text-muted-foreground">{arrivalCode}</p>
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
            <p className="text-3xl font-bold text-foreground">${price}</p>
          </div>
          <Button variant="hero" size="lg" onClick={handleViewDeal} className="gap-2">
            View Deal
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FlightCard;
