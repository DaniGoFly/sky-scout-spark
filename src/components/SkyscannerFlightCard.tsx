/**
 * Skyscanner-style Flight Card
 * Display-only component - renders backend data directly
 */

import { useState } from "react";
import { Heart, Plane, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Flight, getAirlineName, getAirlineLogo, formatDuration, formatPrice, getStopsLabel } from "@/lib/flightNormalizer";
import { resolveClickUrl } from "@/lib/flightSearchApi";
import { toast } from "sonner";

interface FlightCardProps {
  flight: Flight;
  isBestValue?: boolean;
}

const safeText = (value: string | undefined | null, fallback = "—"): string => {
  if (!value || value === "undefined" || value === "null") return fallback;
  return value;
};

/**
 * Check if a URL is valid (starts with http:// or https://)
 */
const isValidUrl = (url: string | undefined | null): boolean => {
  if (!url) return false;
  return url.startsWith("http://") || url.startsWith("https://");
};

const FlightCard = ({
  flight,
  isBestValue = false,
}: FlightCardProps) => {
  const [isSaved, setIsSaved] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  
  // Check if we have a clickUrl to resolve
  const clickUrl = flight.clickUrl;
  const hasClickUrl = isValidUrl(clickUrl);
  
  const airlineCode = flight.airlines?.[0] || "";
  const airlineName = getAirlineName(airlineCode);
  const airlineLogo = getAirlineLogo(airlineCode);
  const flightNumber = flight.flightNumbers?.join(", ") || "";

  const handleSave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsSaved(!isSaved);
    const saved = JSON.parse(localStorage.getItem("savedFlights") || "[]");
    if (!isSaved) saved.push(flight.id);
    else {
      const idx = saved.indexOf(flight.id);
      if (idx > -1) saved.splice(idx, 1);
    }
    localStorage.setItem("savedFlights", JSON.stringify(saved));
  };

  const handleViewDeal = async () => {
    if (!hasClickUrl || !clickUrl || isResolving) return;
    
    setIsResolving(true);
    
    try {
      // Call the edge function to resolve the clickUrl to final booking URL
      const result = await resolveClickUrl(clickUrl);
      
      if (result.ok && result.redirectUrl) {
        // Open the resolved booking URL in a new tab
        window.open(result.redirectUrl, "_blank", "noopener,noreferrer");
      } else {
        console.error("Failed to resolve deal:", result.error);
        toast.error("Deal temporarily unavailable", {
          description: "Please try again in a moment",
        });
      }
    } catch (err) {
      console.error("Error resolving deal:", err);
      toast.error("Deal temporarily unavailable");
    } finally {
      setIsResolving(false);
    }
  };

  // Render a single leg (outbound or return)
  const renderLeg = (
    label: string | null,
    origin: string,
    destination: string,
    departureTime: string,
    arrivalTime: string,
    durationMinutes: number,
    stopsCount: number,
    stopsAirports: string[]
  ) => (
    <div className="flex flex-col gap-1">
      {label && (
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-1">
          {label}
        </span>
      )}
      <div className="flex items-center gap-3" style={{ minWidth: 0 }}>
        {/* Departure */}
        <div className="flex-shrink-0 text-left" style={{ minWidth: "60px" }}>
          <p className="text-xl font-bold text-foreground leading-tight">
            {safeText(departureTime)}
          </p>
          <p className="text-xs font-medium text-muted-foreground uppercase">
            {safeText(origin, "---")}
          </p>
        </div>

        {/* Flight path */}
        <div className="flex-1 flex flex-col items-center px-2" style={{ minWidth: "100px" }}>
          <span className="text-xs text-muted-foreground font-medium mb-1 whitespace-nowrap">
            {formatDuration(durationMinutes)}
          </span>
          <div className="w-full h-[2px] bg-border relative">
            <div className="absolute left-0 w-2 h-2 bg-muted-foreground rounded-full -translate-y-[3px]" />
            <Plane className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 text-primary rotate-90" />
            <div className="absolute right-0 w-2 h-2 bg-primary rounded-full -translate-y-[3px]" />
          </div>
          <span
            className={`text-xs mt-1 font-medium whitespace-nowrap ${
              stopsCount === 0 ? "text-green-600" : "text-amber-600"
            }`}
          >
            {getStopsLabel(stopsCount, stopsAirports)}
          </span>
        </div>

        {/* Arrival */}
        <div className="flex-shrink-0 text-right" style={{ minWidth: "60px" }}>
          <p className="text-xl font-bold text-foreground leading-tight">
            {safeText(arrivalTime)}
          </p>
          <p className="text-xs font-medium text-muted-foreground uppercase">
            {safeText(destination, "---")}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div
      className={`relative bg-card rounded-xl border transition-all duration-200 hover:shadow-lg ${
        isBestValue ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/40"
      }`}
    >
      {/* Best Value Badge */}
      {isBestValue && (
        <div className="absolute -top-3 left-6 z-10">
          <Badge className="bg-primary text-primary-foreground shadow-md px-3 py-0.5 text-xs">
            Best
          </Badge>
        </div>
      )}

      <div className="p-4 md:p-5">
        <div
          className="flex flex-col gap-4 lg:grid lg:gap-4 lg:items-stretch"
          style={{ gridTemplateColumns: "1fr 260px" }}
        >
          {/* LEFT: Itinerary */}
          <div className="flex flex-col gap-4" style={{ minWidth: 0 }}>
            {/* Airline header */}
            <div className="flex items-center gap-3" style={{ minWidth: 0 }}>
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                {airlineLogo ? (
                  <img
                    src={airlineLogo}
                    alt={airlineName}
                    className="w-8 h-8 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <Plane className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground text-sm truncate">
                  {airlineName || "Airline"}
                </p>
                {flightNumber && (
                  <p className="text-xs text-muted-foreground truncate">{flightNumber}</p>
                )}
              </div>
            </div>

            {/* Outbound leg */}
            {renderLeg(
              flight.return ? "Outbound" : null,
              flight.origin,
              flight.destination,
              flight.departureTime,
              flight.arrivalTime,
              flight.durationMinutes,
              flight.stopsCount,
              flight.stopsAirports
            )}

            {/* Return leg */}
            {flight.return && (
              <div className="pt-3 border-t border-border/50">
                {renderLeg(
                  "Return",
                  flight.return.origin,
                  flight.return.destination,
                  flight.return.departureTime,
                  flight.return.arrivalTime,
                  flight.return.durationMinutes,
                  flight.return.stopsCount,
                  flight.return.stopsAirports
                )}
              </div>
            )}
          </div>

          {/* RIGHT: Price & CTA */}
          <div
            className="flex flex-col justify-between pt-4 border-t border-border/50 lg:pt-0 lg:border-t-0 lg:border-l lg:border-border/50 lg:pl-4"
            style={{ minWidth: 0, flexShrink: 0 }}
          >
            <div className="flex flex-col items-start lg:items-end text-left lg:text-right">
              <p className="text-2xl font-bold text-foreground whitespace-nowrap mt-0.5">
                {formatPrice(flight.price.amount, flight.price.currency)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">per person</p>
            </div>

            <div className="flex items-center gap-2 mt-4 lg:justify-end">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSave}
                className={`h-9 w-9 rounded-full flex-shrink-0 ${
                  isSaved ? "text-red-500" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Heart className={`w-4 h-4 ${isSaved ? "fill-current" : ""}`} />
              </Button>
              
              {/* View Deal button - resolves clickUrl and opens booking page */}
              {hasClickUrl ? (
                <Button
                  type="button"
                  onClick={handleViewDeal}
                  disabled={isResolving}
                  size="default"
                  className="flex-1 lg:flex-none gap-1 font-semibold text-sm px-6 whitespace-nowrap"
                  style={{ minWidth: "120px" }}
                >
                  {isResolving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Opening...</span>
                    </>
                  ) : (
                    <>
                      <span>View Deal</span>
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              ) : (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        disabled
                        size="default"
                        className="flex-1 lg:flex-none gap-1 font-semibold text-sm px-6 whitespace-nowrap opacity-50"
                        style={{ minWidth: "120px" }}
                      >
                        <span>Deal unavailable</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>This deal is currently unavailable</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlightCard;
