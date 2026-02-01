/**
 * Skyscanner-style Flight Card
 * 2-column layout: LEFT = itinerary, RIGHT = pricing/CTA
 * Matches Skyscanner structure exactly with proper overflow handling
 */

import { useState } from "react";
import { Loader2, Heart, MapPin, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import AirlineMark from "@/components/AirlineMark";
import ItineraryRow from "@/components/ItineraryRow";
import { NormalizedFlight, isEligibleForBestValue } from "@/lib/flightNormalizer";

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
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return "price may have changed";
};

const isPriceStale = (timestamp?: number): boolean => {
  if (!timestamp) return false;
  return Date.now() - timestamp > STALE_THRESHOLD_MS;
};

const safeText = (value: string | undefined | null, fallback = "—"): string => {
  if (!value || value === "undefined" || value === "null") return fallback;
  return value;
};

const formatPrice = (price: number, currency: string): string => {
  const symbols: Record<string, string> = { EUR: "€", USD: "$", GBP: "£", CHF: "CHF " };
  const symbol = symbols[currency] || (currency ? currency + " " : "$");
  return `${symbol}${Math.round(price).toLocaleString()}`;
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
  
  // Use return leg from the normalized flight data
  const returnLeg = flight.returnLeg;
  const dealsCount = flight.dealsCount || 1;

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

  const canBook = flight.hasValidBookingUrl;
  const priceInvalid = !flight.isPriceValid || !flight.price || flight.price <= 0 || isNaN(flight.price);
  const stale = isPriceStale(fetchedAt);
  const showCheckPrice = priceInvalid || stale;
  const isDisabled = !canBook;
  const showBestValue = isBestValue && isEligibleForBestValue(flight, fetchedAt, STALE_THRESHOLD_MS);

  const airlineName = safeText(flight.airlineName, "Airline");

  return (
    <div
      className={`relative bg-card rounded-xl border transition-all duration-200 hover:shadow-lg ${
        showBestValue ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/40"
      }`}
      style={{ overflow: "visible" }}
    >
      {/* Best Value Badge */}
      {showBestValue && (
        <div className="absolute -top-3 left-6 z-10">
          <Badge className="bg-primary text-primary-foreground shadow-md px-3 py-0.5 text-xs">
            Best
          </Badge>
        </div>
      )}

      {/* Nearby Airport Indicator */}
      {isNearbyAirport && originalAirport && (
        <div className="bg-accent/10 border-b border-accent/20 px-4 py-2 flex items-center gap-2 rounded-t-xl">
          <MapPin className="w-4 h-4 text-accent flex-shrink-0" />
          <span className="text-xs text-accent font-medium truncate">
            Nearby airport (instead of {originalAirport})
          </span>
        </div>
      )}

      {/* Main Card Content */}
      <div className="p-4 md:p-5">
        {/* 
          SKYSCANNER LAYOUT:
          Desktop: 2-column CSS grid [LEFT itinerary: 1fr] [RIGHT pricing: 260px]
          Mobile (<900px): stacked 1 column
        */}
        <div
          className="
            flex flex-col gap-4
            lg:grid lg:gap-4 lg:items-stretch
          "
          style={{
            gridTemplateColumns: "1fr 260px",
          }}
        >
          {/* LEFT COLUMN: Itinerary Details */}
          <div className="flex flex-col gap-4" style={{ minWidth: 0 }}>
            {/* Airline header row */}
            <div className="flex items-center gap-3" style={{ minWidth: 0 }}>
              <AirlineMark
                airlineCode={flight.airlineCode || "XX"}
                airlineName={airlineName}
                logoUrl={flight.airlineLogo}
                size="md"
              />
              <div className="min-w-0 flex-1">
                <p
                  className="font-medium text-foreground text-sm truncate"
                  title={airlineName}
                  style={{ overflowWrap: "anywhere" }}
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

            {/* Outbound Itinerary Row */}
            <ItineraryRow
              label={returnLeg ? "Outbound" : undefined}
              departureTime={flight.departureTime}
              arrivalTime={flight.arrivalTime}
              originIata={flight.originIata}
              destinationIata={flight.destinationIata}
              duration={flight.duration}
              stops={flight.stops}
              stopAirports={flight.stopAirports}
            />

            {/* Return Itinerary Row (if roundtrip) */}
            {returnLeg && (
              <div className="pt-3 border-t border-border/50">
                <ItineraryRow
                  label="Return"
                  departureTime={returnLeg.departureTime}
                  arrivalTime={returnLeg.arrivalTime}
                  originIata={returnLeg.originIata}
                  destinationIata={returnLeg.destinationIata}
                  duration={returnLeg.duration}
                  stops={returnLeg.stops}
                  stopAirports={returnLeg.stopAirports}
                />
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Pricing + CTA */}
          <div
            className="
              flex flex-col justify-between
              pt-4 border-t border-border/50
              lg:pt-0 lg:border-t-0 lg:border-l lg:border-border/50 lg:pl-4
            "
            style={{ minWidth: 0, flexShrink: 0 }}
          >
            {/* Top: Deals + Price */}
            <div className="flex flex-col items-start lg:items-end text-left lg:text-right">
              {showCheckPrice ? (
                <>
                  <p className="text-sm font-semibold text-muted-foreground whitespace-nowrap">
                    Check price
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    {stale ? "Price may have changed" : "Price unavailable"}
                  </p>
                </>
              ) : (
                <>
                  {/* Deals count */}
                  <p className="text-xs text-muted-foreground">
                    {dealsCount > 1 ? `${dealsCount} deals from` : "1 deal"}
                  </p>
                  
                  {/* Large price */}
                  <p className="text-2xl font-bold text-foreground whitespace-nowrap mt-0.5">
                    {formatPrice(flight.price, flight.currency)}
                  </p>
                  
                  {/* Per person label */}
                  <p className="text-xs text-muted-foreground mt-0.5">per person</p>
                  
                  {/* Price disclaimer */}
                  <p className="text-[10px] text-muted-foreground/50 mt-1">
                    Price may change when you book
                  </p>
                </>
              )}

              {/* Freshness indicator */}
              {fetchedAt && !showCheckPrice && (
                <p
                  className={`text-[10px] whitespace-nowrap mt-1 ${
                    stale ? "text-amber-500" : "text-muted-foreground/60"
                  }`}
                >
                  Updated {getTimeAgo(fetchedAt)}
                </p>
              )}
            </div>

            {/* Bottom: Action Buttons */}
            <div className="flex items-center gap-2 mt-4 lg:justify-end">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSave}
                className={`h-9 w-9 rounded-full flex-shrink-0 ${
                  isSaved ? "text-red-500" : "text-muted-foreground hover:text-foreground"
                }`}
                title={isSaved ? "Remove from saved" : "Save flight"}
              >
                <Heart className={`w-4 h-4 ${isSaved ? "fill-current" : ""}`} />
              </Button>
              
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!isLoading && !isDisabled) onViewDeal();
                }}
                disabled={isDisabled || isLoading}
                size="default"
                className="flex-1 lg:flex-none gap-1 font-semibold text-sm px-6 whitespace-nowrap"
                style={{ minWidth: "120px" }}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Opening</span>
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
    </div>
  );
};

export default SkyscannerFlightCard;
