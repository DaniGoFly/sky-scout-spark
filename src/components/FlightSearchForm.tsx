import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRightLeft, Users, Search, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import AirportAutocomplete from "./AirportAutocomplete";
import FlightDateRangePicker from "./FlightDateRangePicker";

interface AirportSelection {
  code: string;
  display: string;
}

interface PassengerCounts {
  adults: number;
  children: number;
  infants: number;
}

const TRAVEL_CLASSES = [
  { value: "economy", label: "Economy" },
  { value: "premium_economy", label: "Premium Economy" },
  { value: "business", label: "Business" },
  { value: "first", label: "First Class" },
];

const FlightSearchForm = () => {
  const navigate = useNavigate();
  const [tripType, setTripType] = useState<"roundtrip" | "oneway">("roundtrip");
  const [from, setFrom] = useState<AirportSelection | null>(null);
  const [to, setTo] = useState<AirportSelection | null>(null);
  const [departDate, setDepartDate] = useState<Date | null>(null);
  const [returnDate, setReturnDate] = useState<Date | null>(null);
  const [passengers, setPassengers] = useState<PassengerCounts>({ adults: 1, children: 0, infants: 0 });
  const [travelClass, setTravelClass] = useState("economy");
  const [flexibleDates, setFlexibleDates] = useState(false);
  const [errors, setErrors] = useState<{ from?: string; to?: string; dates?: string }>({});
  const [passengersOpen, setPassengersOpen] = useState(false);

  const totalPassengers = passengers.adults + passengers.children + passengers.infants;

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
    if (passengers.infants > passengers.adults) {
      newErrors.dates = "Each infant needs an adult";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [from, to, tripType, returnDate, departDate, passengers]);

  const handleSearch = useCallback(() => {
    if (!validate()) return;

    const params = new URLSearchParams({
      trip: tripType,
      from: from!.code,
      to: to!.code,
      depart: format(departDate!, "yyyy-MM-dd"),
      adults: passengers.adults.toString(),
      children: passengers.children.toString(),
      infants: passengers.infants.toString(),
      class: travelClass,
      flexible: flexibleDates.toString(),
    });

    if (tripType === "roundtrip" && returnDate) {
      params.set("return", format(returnDate, "yyyy-MM-dd"));
    }

    navigate(`/flights/results?${params.toString()}`);
  }, [validate, tripType, from, to, departDate, passengers, travelClass, flexibleDates, returnDate, navigate]);

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

  const updatePassenger = (type: keyof PassengerCounts, delta: number) => {
    setPassengers(prev => {
      const newValue = prev[type] + delta;
      if (type === "adults" && newValue < 1) return prev;
      if (newValue < 0) return prev;
      if (type === "adults" && newValue > 9) return prev;
      if (type === "children" && newValue > 8) return prev;
      if (type === "infants" && newValue > prev.adults) return prev;
      return { ...prev, [type]: newValue };
    });
  };

  const getPassengerLabel = () => {
    const parts = [];
    if (passengers.adults > 0) parts.push(`${passengers.adults} Adult${passengers.adults > 1 ? 's' : ''}`);
    if (passengers.children > 0) parts.push(`${passengers.children} Child${passengers.children > 1 ? 'ren' : ''}`);
    if (passengers.infants > 0) parts.push(`${passengers.infants} Infant${passengers.infants > 1 ? 's' : ''}`);
    return parts.join(', ') || '1 Adult';
  };

  const getClassLabel = () => {
    return TRAVEL_CLASSES.find(c => c.value === travelClass)?.label || "Economy";
  };

  return (
    <div className="glass-strong rounded-3xl shadow-card p-6 md:p-8 w-full max-w-5xl mx-auto">
      {/* Trip Type & Class Toggle */}
      <div className="flex flex-wrap gap-4 mb-6 items-center justify-between">
        <div className="hidden md:flex gap-2">
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

        {/* Travel Class Selector */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="rounded-xl gap-2 bg-secondary/50 border-transparent">
              {getClassLabel()}
              <ChevronDown className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2" align="end">
            {TRAVEL_CLASSES.map((cls) => (
              <button
                key={cls.value}
                onClick={() => setTravelClass(cls.value)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  travelClass === cls.value
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-secondary"
                }`}
              >
                {cls.label}
              </button>
            ))}
          </PopoverContent>
        </Popover>
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

        {/* Passengers */}
        <div className="lg:col-span-2">
          <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Travelers</label>
          <Popover open={passengersOpen} onOpenChange={setPassengersOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full h-14 justify-start text-left font-medium bg-secondary/50 border-2 border-transparent rounded-xl hover:bg-card hover:border-primary/50 transition-all"
              >
                <Users className="mr-3 h-5 w-5 text-muted-foreground" />
                <span className="truncate">{totalPassengers}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-4" align="start">
              <div className="space-y-4">
                {/* Adults */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground">Adults</p>
                    <p className="text-xs text-muted-foreground">12+ years</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 w-9 rounded-lg"
                      onClick={() => updatePassenger("adults", -1)}
                      disabled={passengers.adults <= 1}
                    >
                      -
                    </Button>
                    <span className="w-6 text-center font-semibold">{passengers.adults}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 w-9 rounded-lg"
                      onClick={() => updatePassenger("adults", 1)}
                      disabled={passengers.adults >= 9}
                    >
                      +
                    </Button>
                  </div>
                </div>

                {/* Children */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground">Children</p>
                    <p className="text-xs text-muted-foreground">2-11 years</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 w-9 rounded-lg"
                      onClick={() => updatePassenger("children", -1)}
                      disabled={passengers.children <= 0}
                    >
                      -
                    </Button>
                    <span className="w-6 text-center font-semibold">{passengers.children}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 w-9 rounded-lg"
                      onClick={() => updatePassenger("children", 1)}
                      disabled={passengers.children >= 8}
                    >
                      +
                    </Button>
                  </div>
                </div>

                {/* Infants */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground">Infants</p>
                    <p className="text-xs text-muted-foreground">Under 2 years</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 w-9 rounded-lg"
                      onClick={() => updatePassenger("infants", -1)}
                      disabled={passengers.infants <= 0}
                    >
                      -
                    </Button>
                    <span className="w-6 text-center font-semibold">{passengers.infants}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 w-9 rounded-lg"
                      onClick={() => updatePassenger("infants", 1)}
                      disabled={passengers.infants >= passengers.adults}
                    >
                      +
                    </Button>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground pt-2 border-t border-border">
                  {getPassengerLabel()}
                </p>

                <Button 
                  className="w-full" 
                  onClick={() => setPassengersOpen(false)}
                >
                  Done
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Flexible Dates Checkbox */}
      <div className="mt-6 flex items-center gap-3">
        <Checkbox
          id="flexible-dates"
          checked={flexibleDates}
          onCheckedChange={(checked) => setFlexibleDates(checked === true)}
        />
        <Label 
          htmlFor="flexible-dates" 
          className="text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
        >
          My dates are flexible (show cheapest options nearby)
        </Label>
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