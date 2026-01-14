import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRightLeft, Calendar, Users, Search } from "lucide-react";
import { format, addDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import AirportAutocomplete from "./AirportAutocomplete";

interface AirportSelection {
  code: string;
  display: string;
}

const SearchForm = () => {
  const navigate = useNavigate();
  const [tripType, setTripType] = useState<"roundtrip" | "oneway">("roundtrip");
  const [from, setFrom] = useState<AirportSelection | null>(null);
  const [to, setTo] = useState<AirportSelection | null>(null);
  // Dynamic default dates: today + 30 days / today + 37 days
  const [departDate, setDepartDate] = useState<Date>(addDays(new Date(), 30));
  const [returnDate, setReturnDate] = useState<Date>(addDays(new Date(), 37));
  const [passengers, setPassengers] = useState(1);

  const swapLocations = () => {
    const temp = from;
    setFrom(to);
    setTo(temp);
  };

  const isValid = from !== null && to !== null;

  const handleSearch = () => {
    if (!isValid) return;

    // Normalized parameters
    const params = new URLSearchParams({
      trip: tripType,
      from: from.code,
      to: to.code,
      depart: format(departDate, "yyyy-MM-dd"),
      adults: passengers.toString(),
      children: "0",
      infants: "0",
      class: "economy",
    });

    if (tripType === "roundtrip") {
      params.set("return", format(returnDate, "yyyy-MM-dd"));
    }

    navigate(`/flights/results?${params.toString()}`);
  };

  return (
    <div className="glass-strong rounded-3xl shadow-card p-6 md:p-8 w-full max-w-5xl mx-auto transition-all duration-300 hover:shadow-card-hover">
      {/* Trip Type Toggle */}
      <div className="flex gap-2 mb-8">
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
            onChange={setFrom}
            placeholder="Where from?"
            icon="from"
          />
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
            onChange={setTo}
            placeholder="Where to?"
            icon="to"
          />
        </div>

        {/* Depart Date */}
        <div className="lg:col-span-2">
          <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Depart</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full h-14 justify-start text-left font-medium bg-secondary/50 border-2 border-transparent rounded-xl hover:bg-card hover:border-primary/50 transition-all"
              >
                <Calendar className="mr-3 h-5 w-5 text-muted-foreground" />
                {format(departDate, "MMM d, yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-card border-border" align="start">
              <CalendarComponent
                mode="single"
                selected={departDate}
                onSelect={(date) => date && setDepartDate(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Return Date */}
        {tripType === "roundtrip" && (
          <div className="lg:col-span-2">
            <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Return</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full h-14 justify-start text-left font-medium bg-secondary/50 border-2 border-transparent rounded-xl hover:bg-card hover:border-primary/50 transition-all"
                >
                  <Calendar className="mr-3 h-5 w-5 text-muted-foreground" />
                  {format(returnDate, "MMM d, yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-card border-border" align="start">
                <CalendarComponent
                  mode="single"
                  selected={returnDate}
                  onSelect={(date) => date && setReturnDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        )}

        {/* Passengers */}
        <div className={tripType === "oneway" ? "lg:col-span-2" : "lg:col-span-1"}>
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
                    onClick={() => setPassengers(passengers + 1)}
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
          disabled={!isValid}
          className="gap-3 text-base"
        >
          <Search className="w-5 h-5" />
          Search Flights
        </Button>
      </div>
    </div>
  );
};

export default SearchForm;
