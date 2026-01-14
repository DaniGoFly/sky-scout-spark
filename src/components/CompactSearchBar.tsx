import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ArrowRightLeft, Calendar, Users, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format, parse, addDays } from "date-fns";
import AirportAutocomplete from "./AirportAutocomplete";

interface AirportSelection {
  code: string;
  display: string;
}

const CompactSearchBar = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [tripType, setTripType] = useState<"roundtrip" | "oneway">(
    (searchParams.get("trip") as "roundtrip" | "oneway") || "roundtrip"
  );
  
  // Initialize from URL params
  const fromCode = searchParams.get("from") || "";
  const toCode = searchParams.get("to") || "";
  
  const [from, setFrom] = useState<AirportSelection | null>(
    fromCode ? { code: fromCode, display: fromCode } : null
  );
  const [to, setTo] = useState<AirportSelection | null>(
    toCode ? { code: toCode, display: toCode } : null
  );
  // Dynamic default dates: today + 30 / today + 37 (no hardcoded 2026)
  const [departDate, setDepartDate] = useState<Date>(() => {
    const dateStr = searchParams.get("depart");
    return dateStr ? parse(dateStr, "yyyy-MM-dd", new Date()) : addDays(new Date(), 30);
  });
  const [returnDate, setReturnDate] = useState<Date>(() => {
    const dateStr = searchParams.get("return");
    return dateStr ? parse(dateStr, "yyyy-MM-dd", new Date()) : addDays(new Date(), 37);
  });
  const [passengers, setPassengers] = useState(Number(searchParams.get("adults")) || 1);

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
      from: from.code,
      to: to.code,
      depart: format(departDate, "yyyy-MM-dd"),
      adults: passengers.toString(),
      children: "0",
      infants: "0",
      class: "economy",
      trip: tripType,
    });
    
    if (tripType === "roundtrip") {
      params.set("return", format(returnDate, "yyyy-MM-dd"));
    }
    
    navigate(`/flights/results?${params.toString()}`);
  };

  return (
    <div className="bg-card border border-border rounded-2xl shadow-card p-4">
      <div className="flex flex-wrap items-center gap-3">
        {/* Trip Type */}
        <div className="flex gap-1">
          <button
            onClick={() => setTripType("roundtrip")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              tripType === "roundtrip"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            Round trip
          </button>
          <button
            onClick={() => setTripType("oneway")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              tripType === "oneway"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            One way
          </button>
        </div>

        {/* From */}
        <div className="flex-1 min-w-[140px]">
          <AirportAutocomplete
            value={from}
            onChange={setFrom}
            placeholder="From"
            icon="from"
            compact
          />
        </div>

        {/* Swap */}
        <Button
          variant="ghost"
          size="icon"
          onClick={swapLocations}
          className="h-10 w-10 rounded-full hover:bg-secondary"
        >
          <ArrowRightLeft className="w-4 h-4" />
        </Button>

        {/* To */}
        <div className="flex-1 min-w-[140px]">
          <AirportAutocomplete
            value={to}
            onChange={setTo}
            placeholder="To"
            icon="to"
            compact
          />
        </div>

        {/* Depart */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="h-10 justify-start text-left font-normal bg-secondary/50 border-transparent rounded-lg text-sm min-w-[130px]"
            >
              <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
              {format(departDate, "MMM d")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-card" align="start">
            <CalendarComponent
              mode="single"
              selected={departDate}
              onSelect={(date) => date && setDepartDate(date)}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>

        {/* Return */}
        {tripType === "roundtrip" && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="h-10 justify-start text-left font-normal bg-secondary/50 border-transparent rounded-lg text-sm min-w-[130px]"
              >
                <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                {format(returnDate, "MMM d")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-card" align="start">
              <CalendarComponent
                mode="single"
                selected={returnDate}
                onSelect={(date) => date && setReturnDate(date)}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        )}

        {/* Passengers */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="h-10 justify-start text-left font-normal bg-secondary/50 border-transparent rounded-lg text-sm"
            >
              <Users className="mr-2 h-4 w-4 text-muted-foreground" />
              {passengers}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 bg-card" align="start">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Adults</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8"
                  onClick={() => setPassengers(Math.max(1, passengers - 1))}
                >
                  -
                </Button>
                <span className="w-4 text-center">{passengers}</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8"
                  onClick={() => setPassengers(passengers + 1)}
                >
                  +
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Search */}
        <Button onClick={handleSearch} disabled={!isValid} className="h-10 gap-2">
          <Search className="w-4 h-4" />
          Search
        </Button>
      </div>
    </div>
  );
};

export default CompactSearchBar;
