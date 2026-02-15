import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ArrowRightLeft, Calendar, Users, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format, parse } from "date-fns";
import AirportAutocomplete from "./AirportAutocomplete";
import MultiOriginInput, { type AirportSelection } from "./MultiOriginInput";
import { getDefaultDates } from "@/lib/dateUtils";

const CompactSearchBar = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const defaultDates = getDefaultDates();
  
  const [tripType, setTripType] = useState<"roundtrip" | "oneway">(
    (searchParams.get("trip") as "roundtrip" | "oneway") || "roundtrip"
  );
  
  // Parse multi-origin from URL
  const fromParam = searchParams.get("from") || "";
  const fromCodes = fromParam.split(",").map(s => s.trim()).filter(Boolean);
  
  const [origins, setOrigins] = useState<AirportSelection[]>(
    fromCodes.map(code => ({ code, display: code }))
  );
  
  const toCode = searchParams.get("to")?.split(",")[0] || "";
  const [to, setTo] = useState<AirportSelection | null>(
    toCode ? { code: toCode, display: toCode } : null
  );
  
  const [departDate, setDepartDate] = useState<Date>(() => {
    const dateStr = searchParams.get("depart");
    return dateStr ? parse(dateStr, "yyyy-MM-dd", new Date()) : defaultDates.depart;
  });
  const [returnDate, setReturnDate] = useState<Date>(() => {
    const dateStr = searchParams.get("return");
    return dateStr ? parse(dateStr, "yyyy-MM-dd", new Date()) : defaultDates.return;
  });
  const [passengers, setPassengers] = useState(Number(searchParams.get("adults")) || 1);
  const isInitialMount = useRef(true);

  const [departPopoverOpen, setDepartPopoverOpen] = useState(false);
  const [returnPopoverOpen, setReturnPopoverOpen] = useState(false);
  const shouldAutoJump = useRef(false);

  useEffect(() => {
    if (!departPopoverOpen && shouldAutoJump.current && tripType === "roundtrip") {
      shouldAutoJump.current = false;
      const timer = setTimeout(() => setReturnPopoverOpen(true), 150);
      return () => clearTimeout(timer);
    }
  }, [departPopoverOpen, tripType]);

  const swapLocations = () => {
    if (origins.length === 1 && to) {
      const temp = origins[0];
      setOrigins([to]);
      setTo(temp);
    }
  };

  const isValid = origins.length > 0 && to !== null;

  const handleSearchNav = useCallback(() => {
    if (origins.length === 0 || !to) return;
    const params = new URLSearchParams({
      from: origins.map(o => o.code).join(","),
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
  }, [origins, to, departDate, returnDate, passengers, tripType, navigate]);

  // Build a stable key for auto-search
  const originsKey = origins.map(o => o.code).join(",");

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (origins.length === 0 || !to) return;
    const timer = setTimeout(() => {
      handleSearchNav();
    }, 600);
    return () => clearTimeout(timer);
  }, [originsKey, to?.code, departDate.getTime(), returnDate.getTime(), passengers, tripType, handleSearchNav]);

  const handleSearch = () => handleSearchNav();

  return (
    <div className="bg-card border border-border rounded-2xl shadow-card p-4">
      <div className="flex flex-wrap items-center gap-3">
        {/* Trip Type */}
        <div className="flex gap-1 shrink-0">
          <button
            onClick={() => setTripType("roundtrip")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              tripType === "roundtrip"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            Round trip
          </button>
          <button
            onClick={() => setTripType("oneway")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              tripType === "oneway"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            One way
          </button>
        </div>

        {/* From — Multi-Origin */}
        <div className="flex-1 min-w-[140px] max-w-[260px]">
          <MultiOriginInput
            values={origins}
            onChange={setOrigins}
            placeholder="From"
            compact
          />
        </div>

        {/* Swap */}
        <Button
          variant="ghost"
          size="icon"
          onClick={swapLocations}
          disabled={origins.length !== 1}
          className="h-10 w-10 rounded-full hover:bg-secondary shrink-0 disabled:opacity-30"
        >
          <ArrowRightLeft className="w-4 h-4" />
        </Button>

        {/* To */}
        <div className="flex-1 min-w-[120px] max-w-[200px]">
          <AirportAutocomplete
            value={to}
            onChange={setTo}
            placeholder="To"
            icon="to"
            compact
          />
        </div>

        {/* Depart */}
        <Popover open={departPopoverOpen} onOpenChange={setDepartPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="h-10 justify-start text-left font-normal bg-secondary/50 border-transparent rounded-lg text-sm shrink-0"
              style={{ minWidth: '100px' }}
            >
              <Calendar className="mr-2 h-4 w-4 text-muted-foreground shrink-0" />
              <span className="truncate">{format(departDate, "MMM d")}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-card" align="start">
            <CalendarComponent
              mode="single"
              selected={departDate}
              onSelect={(date) => {
                if (date) {
                  setDepartDate(date);
                  if (date > returnDate) {
                    setReturnDate(new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000));
                  }
                  if (tripType === "roundtrip") {
                    shouldAutoJump.current = true;
                  }
                  setDepartPopoverOpen(false);
                }
              }}
              disabled={(date) => date < new Date()}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>

        {/* Return */}
        {tripType === "roundtrip" && (
          <Popover open={returnPopoverOpen} onOpenChange={setReturnPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="h-10 justify-start text-left font-normal bg-secondary/50 border-transparent rounded-lg text-sm shrink-0"
                style={{ minWidth: '100px' }}
              >
                <Calendar className="mr-2 h-4 w-4 text-muted-foreground shrink-0" />
                <span className="truncate">{format(returnDate, "MMM d")}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-card" align="start">
              <CalendarComponent
                mode="single"
                selected={returnDate}
                onSelect={(date) => {
                  if (date) {
                    setReturnDate(date);
                    setReturnPopoverOpen(false);
                  }
                }}
                disabled={(date) => date < departDate}
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
              className="h-10 justify-start text-left font-normal bg-secondary/50 border-transparent rounded-lg text-sm shrink-0"
            >
              <Users className="mr-2 h-4 w-4 text-muted-foreground shrink-0" />
              <span>{passengers}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 bg-card" align="start">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Adults</span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-8 w-8"
                  onClick={() => setPassengers(Math.max(1, passengers - 1))}>-</Button>
                <span className="w-4 text-center">{passengers}</span>
                <Button variant="outline" size="sm" className="h-8 w-8"
                  onClick={() => setPassengers(passengers + 1)}>+</Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Search */}
        <Button onClick={handleSearch} disabled={!isValid} className="h-10 gap-2 shrink-0">
          <Search className="w-4 h-4" />
          <span className="hidden sm:inline">Search</span>
        </Button>
      </div>
    </div>
  );
};

export default CompactSearchBar;
