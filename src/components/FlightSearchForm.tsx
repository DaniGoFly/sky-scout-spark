import { useState, useCallback, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRightLeft, Search } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import AirportAutocomplete from "./AirportAutocomplete";
import FlightDateRangePicker from "./FlightDateRangePicker";
import TravelersPicker, { TravelersData } from "./TravelersPicker";
import { getDefaultDates } from "@/lib/dateUtils";
import type { AISearchParams } from "./FlightSearchHero";

interface AirportSelection {
  code: string;
  display: string;
}

interface FlightSearchFormProps {
  aiSearchParams?: AISearchParams | null;
  onParamsConsumed?: () => void;
}

const FlightSearchForm = ({ aiSearchParams, onParamsConsumed }: FlightSearchFormProps) => {
  const navigate = useNavigate();
  
  // Dynamic default dates using centralized utility (today + 30 / today + 37)
  const defaultDates = useMemo(() => getDefaultDates(), []);
  
  const [tripType, setTripType] = useState<"roundtrip" | "oneway">("roundtrip");
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
  const [errors, setErrors] = useState<{ from?: string; to?: string; dates?: string }>({});
  const [highlightDestination, setHighlightDestination] = useState(false);

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

    // Normalized parameters (unified schema)
    const params = new URLSearchParams({
      trip: tripType,
      from: from!.code,
      to: to!.code,
      depart: format(departDate!, "yyyy-MM-dd"),
      adults: travelers.adults.toString(),
      children: travelers.children.toString(),
      infants: totalInfants.toString(),
      class: travelers.cabinClass,
      flexible: flexibleDates.toString(),
    });

    if (tripType === "roundtrip" && returnDate) {
      params.set("return", format(returnDate, "yyyy-MM-dd"));
    }

    navigate(`/flights/results?${params.toString()}`);
  }, [validate, tripType, from, to, departDate, travelers, flexibleDates, returnDate, navigate]);

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

  return (
    <div className="gradient-border bg-card rounded-2xl p-6 md:p-8 w-full max-w-5xl mx-auto">
      {/* Trip Type Toggle */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTripType("roundtrip")}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
            tripType === "roundtrip"
              ? "bg-gradient-to-r from-primary to-accent text-white"
              : "bg-secondary text-muted-foreground hover:text-foreground"
          }`}
        >
          Round trip
        </button>
        <button
          onClick={() => setTripType("oneway")}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
            tripType === "oneway"
              ? "bg-gradient-to-r from-primary to-accent text-white"
              : "bg-secondary text-muted-foreground hover:text-foreground"
          }`}
        >
          One way
        </button>
      </div>

      {/* Search Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 items-end">
        {/* From */}
        <div className="lg:col-span-3 relative">
          <label className="block text-xs font-medium text-muted-foreground mb-2">From</label>
          <AirportAutocomplete
            value={from}
            onChange={handleFromChange}
            placeholder="Where from?"
            icon="from"
          />
          {errors.from && <p className="text-destructive text-xs mt-1">{errors.from}</p>}
        </div>

        {/* Swap Button */}
        <div className="lg:col-span-1 flex justify-center">
          <Button
            variant="outline"
            size="icon"
            onClick={swapLocations}
            className="rounded-full h-12 w-12 border-2 border-dashed border-border hover:border-primary hover:text-primary transition-all bg-background"
          >
            <ArrowRightLeft className="w-4 h-4" />
          </Button>
        </div>

        {/* To */}
        <div className={`lg:col-span-3 transition-all duration-300 ${highlightDestination ? "ring-2 ring-primary ring-offset-2 ring-offset-card rounded-lg" : ""}`}>
          <label className="block text-xs font-medium text-muted-foreground mb-2">To</label>
          <AirportAutocomplete
            value={to}
            onChange={handleToChange}
            placeholder="Where to?"
            icon="to"
          />
          {errors.to && <p className="text-destructive text-xs mt-1">{errors.to}</p>}
        </div>

        {/* Date Range Picker */}
        <div className="lg:col-span-3">
          <FlightDateRangePicker
            departDate={departDate}
            returnDate={returnDate}
            onDepartChange={handleDepartChange}
            onReturnChange={handleReturnChange}
            tripType={tripType}
            onTripTypeChange={handleTripTypeChange}
            hasError={!!errors.dates}
          />
          {errors.dates && <p className="text-destructive text-xs mt-1">{errors.dates}</p>}
        </div>

        {/* Travelers Picker */}
        <div className="lg:col-span-2">
          <TravelersPicker
            value={travelers}
            onChange={setTravelers}
          />
        </div>
      </div>

      {/* Flexible Dates Checkbox */}
      <div className="mt-6 flex items-center gap-3">
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
