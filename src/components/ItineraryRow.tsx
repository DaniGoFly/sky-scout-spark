/**
 * Reusable Itinerary Row Component
 * Displays a single flight leg in Skyscanner style:
 * [Depart Time + IATA] ─── Duration / Stops ─── [Arrive Time + IATA]
 */

import { Plane } from "lucide-react";

interface ItineraryRowProps {
  departureTime: string;
  arrivalTime: string;
  originIata: string;
  destinationIata: string;
  duration: string;
  stops: number;
  stopAirports?: string[];
  label?: string; // e.g., "Outbound" or "Return"
  operatedBy?: string;
}

// Safe text display - never shows undefined/null
const safeText = (value: string | undefined | null, fallback = "—"): string => {
  if (!value || value === "undefined" || value === "null") return fallback;
  return value;
};

const getStopsLabel = (stops: number, stopAirports?: string[]): string => {
  if (stops === 0) return "Direct";
  
  const validStops = (stopAirports || []).filter(
    (s) => s && s !== "undefined" && s !== "null" && s.trim() !== ""
  );
  
  if (stops === 1) {
    const stopInfo = validStops.length > 0 ? ` · ${validStops[0]}` : "";
    return `1 stop${stopInfo}`;
  }
  
  // 2+ stops: show first 2 codes, then +X if more
  const displayedStops = validStops.slice(0, 2).join(", ");
  const extraCount = validStops.length > 2 ? ` +${validStops.length - 2}` : "";
  const stopInfo = displayedStops ? ` · ${displayedStops}${extraCount}` : "";
  return `${stops} stops${stopInfo}`;
};

const ItineraryRow = ({
  departureTime,
  arrivalTime,
  originIata,
  destinationIata,
  duration,
  stops,
  stopAirports,
  label,
  operatedBy,
}: ItineraryRowProps) => {
  const departTime = safeText(departureTime);
  const arriveTime = safeText(arrivalTime);
  const originCode = safeText(originIata, "---");
  const destCode = safeText(destinationIata, "---");
  const durationText = safeText(duration);
  const stopsLabel = getStopsLabel(stops, stopAirports);

  return (
    <div className="flex flex-col gap-1">
      {/* Optional label (Outbound/Return) */}
      {label && (
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-1">
          {label}
        </span>
      )}
      
      {/* Main itinerary row */}
      <div className="flex items-center gap-3" style={{ minWidth: 0 }}>
        {/* Departure Time + IATA */}
        <div className="flex-shrink-0 text-left" style={{ minWidth: "60px" }}>
          <p className="text-xl font-bold text-foreground leading-tight">
            {departTime}
          </p>
          <p className="text-xs font-medium text-muted-foreground uppercase">
            {originCode}
          </p>
        </div>

        {/* Flight Path: Duration above, line in middle, stops below */}
        <div
          className="flex-1 flex flex-col items-center px-2"
          style={{ minWidth: "100px" }}
        >
          {/* Duration text */}
          <span className="text-xs text-muted-foreground font-medium mb-1 whitespace-nowrap">
            {durationText}
          </span>
          
          {/* Visual line with dots and plane */}
          <div className="w-full h-[2px] bg-border relative">
            <div className="absolute left-0 w-2 h-2 bg-muted-foreground rounded-full -translate-y-[3px]" />
            <Plane className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 text-primary rotate-90" />
            <div className="absolute right-0 w-2 h-2 bg-primary rounded-full -translate-y-[3px]" />
          </div>
          
          {/* Stops text */}
          <span
            className={`text-xs mt-1 font-medium whitespace-nowrap ${
              stops === 0 ? "text-green-600" : "text-amber-600"
            }`}
            title={stopsLabel}
          >
            {stopsLabel}
          </span>
        </div>

        {/* Arrival Time + IATA */}
        <div className="flex-shrink-0 text-right" style={{ minWidth: "60px" }}>
          <p className="text-xl font-bold text-foreground leading-tight">
            {arriveTime}
          </p>
          <p className="text-xs font-medium text-muted-foreground uppercase">
            {destCode}
          </p>
        </div>
      </div>

      {/* Optional "Operated by" text */}
      {operatedBy && (
        <p className="text-[10px] text-muted-foreground/70 mt-1 truncate" style={{ maxWidth: "100%" }}>
          Operated by {operatedBy}
        </p>
      )}
    </div>
  );
};

export default ItineraryRow;
