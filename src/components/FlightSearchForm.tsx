import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRightLeft, Users, Search } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import AirportAutocomplete from "./AirportAutocomplete";
import FlightDateRangePicker from "./FlightDateRangePicker";

interface AirportSelection {
  code: string;
  display: string;
}

const FlightSearchForm = () => {
  const navigate = useNavigate();
  const [tripType, setTripType] = useState<"roundtrip" | "oneway">("roundtrip");
  const [from, setFrom] = useState<AirportSelection | null>(null);
  const [to, setTo] = useState<AirportSelection | null>(null);
  const [departDate, setDepartDate] = useState<Date | null>(null);
  const [returnDate, setReturnDate] = useState<Date | null>(null);
  const [passengers, setPassengers] = useState(1);
  const [errors, setErrors] = useState<{ from?: string; to?: string; dates?: string }>({});

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
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [from, to, tripType, returnDate, departDate]);

  const handleSearch = useCallback(() => {
    if (!validate()) return;

    const params = new URLSearchParams({
      trip: tripType,
      from: from!.code,
      to: to!.code,
      depart: format(departDate!, "yyyy-MM-dd"),
      adults: passengers.toString(),
    });

    if (tripType === "roundtrip" && returnDate) {
      params.set("return", format(returnDate, "yyyy-MM-dd"));
    }

    navigate(`/flights/results?${params.toString()}`);
  }, [validate, tripType, from, to, departDate, passengers, returnDate, navigate]);

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
    <div className="glass-strong rounded-3xl shadow-card p-6 md:p-8 w-full max-w-5xl mx-auto">
      {/* Trip Type Toggle - Hidden on mobile, shown in calendar */}
      <div className="hidden md:flex gap-2 mb-6">
        <button
          onClick={() => setTripType("roundtrip")}
          className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
            tripType === "roundtrip"
              ? "bg-primary text-primary-foreground shadow-button"
              : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"
          }`}
        >
          Round trip
        </button>
        <button
          onClick={() => setTripType("oneway")}
          className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
            tripType === "oneway"
              ? "bg-primary text-primary-foreground shadow-button"
              : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"
          }`}
        >
          One way
        </button>
      </div>

      {/* Search Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 items-end">
        {/* From */}
        <div className="lg:col-span-3 relative">
          <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">From</label>
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
            className="rounded-full h-14 w-14 border-2 border-dashed hover:border-primary hover:text-primary hover:bg-primary/5 transition-all duration-200"
          >
            <ArrowRightLeft className="w-5 h-5" />
          </Button>
        </div>

        {/* To */}
        <div className="lg:col-span-3">
          <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">To</label>
          <AirportAutocomplete
            value={to}
            onChange={handleToChange}
            placeholder="Where to?"
            icon="to"
          />
          {errors.to && <p className="text-destructive text-xs mt-1">{errors.to}</p>}
        </div>

        {/* Date Range Picker */}
        <div className="lg:col-span-4">
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

        {/* Passengers */}
        <div className="lg:col-span-1">
          <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Travelers</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full h-14 justify-start text-left font-medium bg-secondary/50 border-2 border-transparent rounded-xl hover:bg-card hover:border-primary/50 transition-all"
              >
                <Users className="mr-3 h-5 w-5 text-muted-foreground" />
                {passengers}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 bg-card border-border" align="start">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Adults</span>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 w-9 rounded-lg"
                    onClick={() => setPassengers(Math.max(1, passengers - 1))}
                  >
                    -
                  </Button>
                  <span className="w-6 text-center font-semibold">{passengers}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 w-9 rounded-lg"
                    onClick={() => setPassengers(Math.min(9, passengers + 1))}
                  >
                    +
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Search Button */}
      <div className="mt-8 flex justify-center">
        <Button 
          variant="hero" 
          size="xl" 
          onClick={handleSearch}
          className="gap-3 text-base"
        >
          <Search className="w-5 h-5" />
          Search Flights
        </Button>
      </div>
    </div>
  );
};

export default FlightSearchForm;