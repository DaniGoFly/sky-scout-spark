import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Filter, RotateCcw, Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose } from "@/components/ui/sheet";
import { FilterState } from "./FlightFilters";
import { NormalizedFlight } from "@/lib/flightNormalizer";

interface MobileFiltersDrawerProps {
  onFiltersChange: (filters: FilterState) => void;
  activeFiltersCount: number;
  flightCount: number;
  flights?: NormalizedFlight[];
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
const DEBOUNCE_MS = 200;

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
  
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Get unique airlines from normalized flight data
  const availableAirlines = useMemo(() => {
    if (!flights.length) return [];
    const uniqueAirlines = [...new Set(flights.map(f => f.airlineName))].filter(Boolean);
    return uniqueAirlines.sort();
  }, [flights]);

  // Get price range from normalized flight data
  const actualPriceRange = useMemo((): [number, number] => {
    if (!flights.length) return DEFAULT_PRICE_RANGE;
    const prices = flights.map(f => f.price).filter(p => p > 0 && Number.isFinite(p));
    if (!prices.length) return DEFAULT_PRICE_RANGE;
    const min = Math.floor(Math.min(...prices) / 25) * 25;
    const max = Math.ceil(Math.max(...prices) / 25) * 25;
    return [min, Math.max(max, min + 100)];
  }, [flights]);

  // Initialize price range when flights change
  useEffect(() => {
    if (flights.length > 0) {
      setPriceRange(actualPriceRange);
    }
  }, [actualPriceRange, flights.length]);

  // Emit filters immediately
  const emitFilters = useCallback((overrides: Partial<FilterState> = {}) => {
    onFiltersChange({
      stops: overrides.stops ?? stops,
      airlines: overrides.airlines ?? airlines,
      priceRange: overrides.priceRange ?? priceRange,
      departureTime: overrides.departureTime ?? departureTime,
      directOnly: overrides.directOnly ?? directOnly,
    });
  }, [stops, airlines, priceRange, departureTime, directOnly, onFiltersChange]);

  // Debounced emit for slider
  const emitFiltersDebounced = useCallback((newPriceRange: [number, number]) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onFiltersChange({
        stops,
        airlines,
        priceRange: newPriceRange,
        departureTime,
        directOnly,
      });
    }, DEBOUNCE_MS);
  }, [stops, airlines, departureTime, directOnly, onFiltersChange]);

  const handleReset = () => {
    setStops([]);
    setAirlines([]);
    setPriceRange(actualPriceRange);
    setDepartureTime([]);
    setDirectOnly(false);
    onFiltersChange({
      stops: [],
      airlines: [],
      priceRange: actualPriceRange,
      departureTime: [],
      directOnly: false,
    });
  };

  const toggleStop = (value: string) => {
    const newStops = stops.includes(value) ? stops.filter(s => s !== value) : [...stops, value];
    setStops(newStops);
    emitFilters({ stops: newStops });
  };

  const toggleAirline = (value: string) => {
    const newAirlines = airlines.includes(value) ? airlines.filter(a => a !== value) : [...airlines, value];
    setAirlines(newAirlines);
    emitFilters({ airlines: newAirlines });
  };

  const toggleDepartureTime = (value: string) => {
    const newTimes = departureTime.includes(value) ? departureTime.filter(t => t !== value) : [...departureTime, value];
    setDepartureTime(newTimes);
    emitFilters({ departureTime: newTimes });
  };

  const handlePriceChange = (value: number[]) => {
    const newRange: [number, number] = [value[0], value[1]];
    setPriceRange(newRange);
    emitFiltersDebounced(newRange);
  };

  const handleDirectOnlyChange = (checked: boolean) => {
    setDirectOnly(checked);
    emitFilters({ directOnly: checked });
  };

  const hasActiveFilters = stops.length > 0 || airlines.length > 0 || departureTime.length > 0 || directOnly ||
    priceRange[0] !== actualPriceRange[0] || priceRange[1] !== actualPriceRange[1];

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
                Clear all
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
                onCheckedChange={(checked) => handleDirectOnlyChange(checked === true)}
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

          {/* Price Range with Debounce */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Price Range</h3>
            <div className="px-1">
              <Slider
                value={priceRange}
                onValueChange={handlePriceChange}
                min={actualPriceRange[0]}
                max={actualPriceRange[1]}
                step={25}
                className="w-full"
              />
            </div>
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
          <Button onClick={() => setOpen(false)} className="flex-1">
            Show {flightCount} flights
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default MobileFiltersDrawer;
