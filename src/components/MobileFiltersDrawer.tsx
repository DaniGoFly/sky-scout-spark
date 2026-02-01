import { useState, useMemo } from "react";
import { Filter, RotateCcw, Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose } from "@/components/ui/sheet";
import { FilterState } from "./FlightFilters";
import { LiveFlight } from "@/hooks/useFlightSearch";

interface MobileFiltersDrawerProps {
  onFiltersChange: (filters: FilterState) => void;
  activeFiltersCount: number;
  flightCount: number;
  flights?: LiveFlight[];
}

const STOPS = [
  { value: "direct", label: "Direct only" },
  { value: "1stop", label: "1 stop" },
  { value: "2stops", label: "2+ stops" },
];

const DEPARTURE_TIMES = [
  { value: "morning", label: "Morning (6am - 12pm)" },
  { value: "afternoon", label: "Afternoon (12pm - 6pm)" },
  { value: "evening", label: "Evening (6pm - 12am)" },
  { value: "night", label: "Night (12am - 6am)" },
];

const DEFAULT_PRICE_RANGE: [number, number] = [0, 2000];

const MobileFiltersDrawer = ({ 
  onFiltersChange, 
  activeFiltersCount, 
  flightCount,
  flights = []
}: MobileFiltersDrawerProps) => {
  const [open, setOpen] = useState(false);
  const [stops, setStops] = useState<string[]>([]);
  const [airlines, setAirlines] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>(DEFAULT_PRICE_RANGE);
  const [departureTime, setDepartureTime] = useState<string[]>([]);
  const [directOnly, setDirectOnly] = useState(false);

  // Get unique airlines from actual flight data
  const availableAirlines = useMemo(() => {
    if (!flights.length) return [];
    const uniqueAirlines = [...new Set(flights.map(f => f.airline))].filter(Boolean);
    return uniqueAirlines.sort();
  }, [flights]);

  const applyFilters = () => {
    onFiltersChange({ stops, airlines, priceRange, departureTime, directOnly });
    setOpen(false);
  };

  const handleReset = () => {
    setStops([]);
    setAirlines([]);
    setPriceRange(DEFAULT_PRICE_RANGE);
    setDepartureTime([]);
    setDirectOnly(false);
    onFiltersChange({
      stops: [],
      airlines: [],
      priceRange: DEFAULT_PRICE_RANGE,
      departureTime: [],
      directOnly: false,
    });
  };

  const toggleStop = (value: string) => {
    setStops(prev => prev.includes(value) ? prev.filter(s => s !== value) : [...prev, value]);
  };

  const toggleAirline = (value: string) => {
    setAirlines(prev => prev.includes(value) ? prev.filter(a => a !== value) : [...prev, value]);
  };

  const toggleDepartureTime = (value: string) => {
    setDepartureTime(prev => prev.includes(value) ? prev.filter(t => t !== value) : [...prev, value]);
  };

  const hasActiveFilters = stops.length > 0 || airlines.length > 0 || departureTime.length > 0 || directOnly ||
    priceRange[0] !== DEFAULT_PRICE_RANGE[0] || priceRange[1] !== DEFAULT_PRICE_RANGE[1];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 lg:hidden shrink-0">
          <Filter className="w-4 h-4" />
          <span className="truncate">Filters</span>
          {activeFiltersCount > 0 && (
            <span className="bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center shrink-0">
              {activeFiltersCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl">
        <SheetHeader className="pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters
            </SheetTitle>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1 text-muted-foreground">
                <RotateCcw className="w-3 h-3" />
                Reset
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="overflow-y-auto py-6 space-y-6 max-h-[calc(85vh-160px)]">
          {/* Direct Flights Only - Quick Filter */}
          <div className="p-3 bg-primary/5 rounded-xl border border-primary/20">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="mobile-direct-only"
                checked={directOnly}
                onCheckedChange={(checked) => setDirectOnly(checked === true)}
              />
              <Label
                htmlFor="mobile-direct-only"
                className="text-sm font-medium text-foreground cursor-pointer flex items-center gap-2"
              >
                <Plane className="w-4 h-4 text-primary" />
                Direct flights only
              </Label>
            </div>
          </div>

          {/* Stops */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Stops</h3>
            <div className="flex flex-wrap gap-2">
              {STOPS.map((stop) => (
                <button
                  key={stop.value}
                  onClick={() => toggleStop(stop.value)}
                  className={`px-3 py-2 rounded-full text-sm border transition-colors truncate ${
                    stops.includes(stop.value)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border text-foreground hover:border-primary/50"
                  }`}
                >
                  {stop.label}
                </button>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Price Range</h3>
            <Slider
              value={priceRange}
              onValueChange={(v) => setPriceRange([v[0], v[1]])}
              min={0}
              max={2000}
              step={25}
              className="w-full"
            />
            <div className="flex justify-between items-center text-sm">
              <span className="font-medium text-foreground">${priceRange[0]}</span>
              <span className="text-muted-foreground">to</span>
              <span className="font-medium text-foreground">${priceRange[1]}</span>
            </div>
          </div>

          {/* Airlines - Dynamic */}
          {availableAirlines.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Airlines</h3>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                {availableAirlines.map((airline) => (
                  <button
                    key={airline}
                    onClick={() => toggleAirline(airline)}
                    className={`px-3 py-2 rounded-lg text-sm border text-left transition-colors truncate min-w-0 ${
                      airlines.includes(airline)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border text-foreground hover:border-primary/50"
                    }`}
                    title={airline}
                  >
                    {airline}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Departure Time */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Departure Time</h3>
            <div className="grid grid-cols-2 gap-2">
              {DEPARTURE_TIMES.map((time) => (
                <button
                  key={time.value}
                  onClick={() => toggleDepartureTime(time.value)}
                  className={`px-3 py-2 rounded-lg text-sm border text-left transition-colors truncate ${
                    departureTime.includes(time.value)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border text-foreground hover:border-primary/50"
                  }`}
                >
                  {time.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <SheetFooter className="pt-4 border-t border-border gap-2">
          <SheetClose asChild>
            <Button variant="outline" className="flex-1">Cancel</Button>
          </SheetClose>
          <Button onClick={applyFilters} className="flex-1">
            Show {flightCount} flights
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default MobileFiltersDrawer;
