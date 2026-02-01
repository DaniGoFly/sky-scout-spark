import { useState, useCallback, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRightLeft, Search, MapPin, Plane } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import AirportAutocomplete from "./AirportAutocomplete";
import FlightDateRangePicker from "./FlightDateRangePicker";
import TravelersPicker, { TravelersData } from "./TravelersPicker";
import MultiCitySearchForm from "./MultiCitySearchForm";
import { getDefaultDates } from "@/lib/dateUtils";
import { getNearbyAirports } from "@/lib/airports";
import type { AISearchParams } from "./FlightSearchHero";

interface AirportSelection {
  code: string;
  display: string;
}

interface FlightSearchFormProps {
  aiSearchParams?: AISearchParams | null;
  onParamsConsumed?: () => void;
}

type TripType = "roundtrip" | "oneway" | "multicity";

const FlightSearchForm = ({ aiSearchParams, onParamsConsumed }: FlightSearchFormProps) => {
  const navigate = useNavigate();
  
  // Dynamic default dates using centralized utility (today + 30 / today + 37)
  const defaultDates = useMemo(() => getDefaultDates(), []);
  
  const [tripType, setTripType] = useState<TripType>("roundtrip");
  const [from, setFrom] = useState<AirportSelection | null>(null);
  const [to, setTo] = useState<AirportSelection | null>(null);
  const [departDate, setDepartDate] = useState<Date | null>(defaultDates.depart);
  const [returnDate, setReturnDate] = useState<Date | null>(defaultDates.return);
  const [travelers, setTravelers] = useState<TravelersData>({
    adults: 1,
    children: 0,
    infantsSeat: 0,
    infantsLap: 0,
    cabinClass: "economy",
  });
  const [flexibleDates, setFlexibleDates] = useState(false);
  const [directOnly, setDirectOnly] = useState(false);
  const [nearbyOrigin, setNearbyOrigin] = useState(false);
  const [nearbyDestination, setNearbyDestination] = useState(false);
  const [errors, setErrors] = useState<{ from?: string; to?: string; dates?: string }>({});
  const [highlightDestination, setHighlightDestination] = useState(false);

  // Get nearby airports for display
  const nearbyOriginAirports = useMemo(() => {
    if (!from?.code || !nearbyOrigin) return [];
    return getNearbyAirports(from.code);
  }, [from?.code, nearbyOrigin]);

  const nearbyDestinationAirports = useMemo(() => {
    if (!to?.code || !nearbyDestination) return [];
    return getNearbyAirports(to.code);
  }, [to?.code, nearbyDestination]);

  // Handle AI search params
  useEffect(() => {
    if (aiSearchParams) {
      setTo({
        code: aiSearchParams.destinationCode,
        display: aiSearchParams.destinationName,
      });
      setErrors(e => ({ ...e, to: undefined }));
      
      // Highlight the destination field briefly
      setHighlightDestination(true);
      setTimeout(() => setHighlightDestination(false), 2000);
      
      // Notify parent that params were consumed
      onParamsConsumed?.();
    }
  }, [aiSearchParams, onParamsConsumed]);

  const swapLocations = useCallback(() => {
    setFrom(prev => {
      setTo(from);
      return to;
    });
  }, [from, to]);

  const validate = useCallback((): boolean => {
    const newErrors: { from?: string; to?: string; dates?: string } = {};
    
    if (!from) {
      newErrors.from = "Please select origin";
    }
    if (!to) {
      newErrors.to = "Please select destination";
    }
    if (!departDate) {
      newErrors.dates = "Please select departure date";
    }
    if (tripType === "roundtrip" && !returnDate) {
      newErrors.dates = "Please select return date";
    }
    if (tripType === "roundtrip" && departDate && returnDate && returnDate <= departDate) {
      newErrors.dates = "Return date must be after departure";
    }
    
    const totalInfants = travelers.infantsSeat + travelers.infantsLap;
    if (totalInfants > travelers.adults) {
      newErrors.dates = "Each infant needs an adult";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [from, to, tripType, returnDate, departDate, travelers]);

  const handleSearch = useCallback(() => {
    if (!validate()) return;

    // Normalize infants: combine infantsSeat + infantsLap
    const totalInfants = travelers.infantsSeat + travelers.infantsLap;

    // Build origin airports list (main + nearby)
    let originCodes = from!.code;
    if (nearbyOrigin && nearbyOriginAirports.length > 0) {
      originCodes = [from!.code, ...nearbyOriginAirports].join(",");
    }

    // Build destination airports list (main + nearby)
    let destCodes = to!.code;
    if (nearbyDestination && nearbyDestinationAirports.length > 0) {
      destCodes = [to!.code, ...nearbyDestinationAirports].join(",");
    }

    // Normalized parameters (unified schema)
    const params = new URLSearchParams({
      trip: tripType,
      from: originCodes,
      to: destCodes,
      depart: format(departDate!, "yyyy-MM-dd"),
      adults: travelers.adults.toString(),
      children: travelers.children.toString(),
      infants: totalInfants.toString(),
      class: travelers.cabinClass,
      flexible: flexibleDates.toString(),
      direct: directOnly.toString(),
    });

    if (tripType === "roundtrip" && returnDate) {
      params.set("return", format(returnDate, "yyyy-MM-dd"));
    }

    // Store nearby settings for results page
    if (nearbyOrigin) params.set("nearbyOrigin", "true");
    if (nearbyDestination) params.set("nearbyDest", "true");

    navigate(`/flights/results?${params.toString()}`);
  }, [validate, tripType, from, to, departDate, travelers, flexibleDates, directOnly, returnDate, navigate, nearbyOrigin, nearbyDestination, nearbyOriginAirports, nearbyDestinationAirports]);

  const handleFromChange = useCallback((val: AirportSelection | null) => {
    setFrom(val);
    setErrors(e => ({ ...e, from: undefined }));
  }, []);

  const handleToChange = useCallback((val: AirportSelection | null) => {
    setTo(val);
    setErrors(e => ({ ...e, to: undefined }));
  }, []);

  const handleDepartChange = useCallback((date: Date | null) => {
    setDepartDate(date);
    setErrors(e => ({ ...e, dates: undefined }));
  }, []);

  const handleReturnChange = useCallback((date: Date | null) => {
    setReturnDate(date);
    setErrors(e => ({ ...e, dates: undefined }));
  }, []);

  const handleTripTypeChange = useCallback((type: "roundtrip" | "oneway") => {
    setTripType(type);
  }, []);

  const handleMultiCitySearch = useCallback((segments: any[], travelersData: TravelersData) => {
    // Build URL with all segments
    const params = new URLSearchParams({
      trip: "multicity",
      adults: travelersData.adults.toString(),
      children: travelersData.children.toString(),
      infants: (travelersData.infantsSeat + travelersData.infantsLap).toString(),
      class: travelersData.cabinClass,
    });

    // Add segment data
    segments.forEach((seg, i) => {
      params.set(`seg${i}_from`, seg.from.code);
      params.set(`seg${i}_to`, seg.to.code);
      params.set(`seg${i}_date`, format(seg.date, "yyyy-MM-dd"));
    });
    params.set("segments", segments.length.toString());

    navigate(`/flights/results?${params.toString()}`);
  }, [navigate]);

  // Multi-city mode
  if (tripType === "multicity") {
    return (
      <div className="w-full max-w-5xl mx-auto">
        {/* Trip Type Toggle */}
        <div className="flex gap-2 mb-6 justify-center">
          {(["roundtrip", "oneway", "multicity"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setTripType(type)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                tripType === type
                  ? "bg-gradient-to-r from-primary to-accent text-white"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {type === "roundtrip" ? "Round trip" : type === "oneway" ? "One way" : "Multi-city"}
            </button>
          ))}
        </div>
        <MultiCitySearchForm onSearch={handleMultiCitySearch} />
      </div>
    );
  }

  return (
    <div className="gradient-border bg-card rounded-2xl p-6 md:p-8 w-full max-w-5xl mx-auto overflow-hidden">
      {/* Trip Type Toggle */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {(["roundtrip", "oneway", "multicity"] as const).map((type) => (
          <button
            key={type}
            onClick={() => setTripType(type)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
              tripType === type
                ? "bg-gradient-to-r from-primary to-accent text-white"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {type === "roundtrip" ? "Round trip" : type === "oneway" ? "One way" : "Multi-city"}
          </button>
        ))}
      </div>

      {/* Search Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 items-end">
        {/* From */}
        <div className="lg:col-span-3 relative min-w-0">
          <label className="block text-xs font-medium text-muted-foreground mb-2">From</label>
          <AirportAutocomplete
            value={from}
            onChange={handleFromChange}
            placeholder="Where from?"
            icon="from"
            hasError={!!errors.from}
          />
          {errors.from && <p className="text-destructive text-xs mt-1 truncate">{errors.from}</p>}
          {/* Nearby airports indicator */}
          {nearbyOrigin && nearbyOriginAirports.length > 0 && (
            <p className="text-xs text-accent mt-1 flex items-center gap-1 truncate">
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="truncate">+{nearbyOriginAirports.join(", ")}</span>
            </p>
          )}
        </div>

        {/* Swap Button */}
        <div className="lg:col-span-1 flex justify-center">
          <Button
            variant="outline"
            size="icon"
            onClick={swapLocations}
            className="rounded-full h-12 w-12 border-2 border-dashed border-border hover:border-primary hover:text-primary transition-all bg-background shrink-0"
          >
            <ArrowRightLeft className="w-4 h-4" />
          </Button>
        </div>

        {/* To */}
        <div className={`lg:col-span-3 transition-all duration-300 min-w-0 ${highlightDestination ? "ring-2 ring-primary ring-offset-2 ring-offset-card rounded-lg" : ""}`}>
          <label className="block text-xs font-medium text-muted-foreground mb-2">To</label>
          <AirportAutocomplete
            value={to}
            onChange={handleToChange}
            placeholder="Where to?"
            icon="to"
            hasError={!!errors.to}
          />
          {errors.to && <p className="text-destructive text-xs mt-1 truncate">{errors.to}</p>}
          {/* Nearby airports indicator */}
          {nearbyDestination && nearbyDestinationAirports.length > 0 && (
            <p className="text-xs text-accent mt-1 flex items-center gap-1 truncate">
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="truncate">+{nearbyDestinationAirports.join(", ")}</span>
            </p>
          )}
        </div>

        {/* Date Range Picker */}
        <div className="lg:col-span-3 min-w-0">
          <FlightDateRangePicker
            departDate={departDate}
            returnDate={returnDate}
            onDepartChange={handleDepartChange}
            onReturnChange={handleReturnChange}
            tripType={tripType as "roundtrip" | "oneway"}
            onTripTypeChange={handleTripTypeChange}
            hasError={!!errors.dates}
          />
          {errors.dates && <p className="text-destructive text-xs mt-1 truncate">{errors.dates}</p>}
        </div>

        {/* Travelers Picker */}
        <div className="lg:col-span-2 min-w-0">
          <TravelersPicker
            value={travelers}
            onChange={setTravelers}
          />
        </div>
      </div>

      {/* Options Row */}
      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
        {/* Nearby Airports - Origin */}
        <div className="flex items-center gap-2">
          <Checkbox
            id="nearby-origin"
            checked={nearbyOrigin}
            onCheckedChange={(checked) => setNearbyOrigin(checked === true)}
            className="border-muted-foreground data-[state=checked]:bg-accent data-[state=checked]:border-accent"
          />
          <Label 
            htmlFor="nearby-origin" 
            className="text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors flex items-center gap-1"
          >
            <MapPin className="w-3 h-3" />
            <span className="hidden sm:inline">Nearby airports</span>
            <span className="sm:hidden">Nearby</span>
            <span className="text-xs">(origin)</span>
          </Label>
        </div>

        {/* Nearby Airports - Destination */}
        <div className="flex items-center gap-2">
          <Checkbox
            id="nearby-dest"
            checked={nearbyDestination}
            onCheckedChange={(checked) => setNearbyDestination(checked === true)}
            className="border-muted-foreground data-[state=checked]:bg-accent data-[state=checked]:border-accent"
          />
          <Label 
            htmlFor="nearby-dest" 
            className="text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors flex items-center gap-1"
          >
            <MapPin className="w-3 h-3" />
            <span className="hidden sm:inline">Nearby airports</span>
            <span className="sm:hidden">Nearby</span>
            <span className="text-xs">(dest)</span>
          </Label>
        </div>

        {/* Direct Flights Only */}
        <div className="flex items-center gap-2">
          <Checkbox
            id="direct-only"
            checked={directOnly}
            onCheckedChange={(checked) => setDirectOnly(checked === true)}
            className="border-muted-foreground data-[state=checked]:bg-primary data-[state=checked]:border-primary"
          />
          <Label 
            htmlFor="direct-only" 
            className="text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors flex items-center gap-1"
          >
            <Plane className="w-3 h-3" />
            Direct flights only
          </Label>
        </div>

        {/* Flexible Dates */}
        <div className="flex items-center gap-2">
          <Checkbox
            id="flexible-dates"
            checked={flexibleDates}
            onCheckedChange={(checked) => setFlexibleDates(checked === true)}
            className="border-muted-foreground data-[state=checked]:bg-primary data-[state=checked]:border-primary"
          />
          <Label 
            htmlFor="flexible-dates" 
            className="text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
          >
            My dates are flexible
          </Label>
        </div>
      </div>

      {/* Search Button */}
      <div className="mt-6 flex justify-center md:justify-end">
        <Button 
          size="lg" 
          onClick={handleSearch}
          className="gap-2 px-8 bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
        >
          <Search className="w-4 h-4" />
          Search Flights
        </Button>
      </div>
    </div>
  );
};

export default FlightSearchForm;
