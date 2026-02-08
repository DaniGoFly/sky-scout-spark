import { memo, useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Filter, RotateCcw, Plane } from "lucide-react";
import { Flight, getAirlineName } from "@/lib/flightNormalizer";

interface FlightFiltersProps {
  onFiltersChange: (filters: FilterState) => void;
  flights?: Flight[];
  showDirectOnly?: boolean;
  onDirectOnlyChange?: (checked: boolean) => void;
}

export interface FilterState {
  stops: string[];
  airlines: string[];
  priceRange: [number, number];
  departureTime: string[];
  directOnly?: boolean;
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

const FlightFilters = memo(({ 
  onFiltersChange, 
  flights = [],
  showDirectOnly = false,
  onDirectOnlyChange 
}: FlightFiltersProps) => {
  const [stops, setStops] = useState<string[]>([]);
  const [airlines, setAirlines] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>(DEFAULT_PRICE_RANGE);
  const [departureTime, setDepartureTime] = useState<string[]>([]);
  const [directOnly, setDirectOnly] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const availableAirlines = useMemo(() => {
    if (!flights.length) return [];
    const airlineNames = flights
      .map(f => f.airlines?.[0])
      .filter(Boolean)
      .map(code => getAirlineName(code));
    return [...new Set(airlineNames)].sort();
  }, [flights]);

  const actualPriceRange = useMemo((): [number, number] => {
    if (!flights.length) return DEFAULT_PRICE_RANGE;
    const prices = flights.map(f => f.price?.amount).filter(p => p > 0 && Number.isFinite(p));
    if (!prices.length) return DEFAULT_PRICE_RANGE;
    const min = Math.floor(Math.min(...prices) / 25) * 25;
    const max = Math.ceil(Math.max(...prices) / 25) * 25;
    return [min, Math.max(max, min + 100)];
  }, [flights]);

  useEffect(() => {
    if (flights.length > 0) setPriceRange(actualPriceRange);
  }, [actualPriceRange, flights.length]);

  // Use refs for latest state to avoid stale closures in debounced callback
  const stopsRef = useRef(stops);
  const airlinesRef = useRef(airlines);
  const departureTimeRef = useRef(departureTime);
  const directOnlyRef = useRef(directOnly);
  stopsRef.current = stops;
  airlinesRef.current = airlines;
  departureTimeRef.current = departureTime;
  directOnlyRef.current = directOnly;

  const emitFilters = useCallback((overrides: Partial<FilterState> = {}) => {
    onFiltersChange({
      stops: overrides.stops ?? stopsRef.current,
      airlines: overrides.airlines ?? airlinesRef.current,
      priceRange: overrides.priceRange ?? priceRange,
      departureTime: overrides.departureTime ?? departureTimeRef.current,
      directOnly: overrides.directOnly ?? directOnlyRef.current,
    });
  }, [onFiltersChange, priceRange]);

  const emitFiltersDebounced = useCallback((newPriceRange: [number, number]) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onFiltersChange({
        stops: stopsRef.current,
        airlines: airlinesRef.current,
        priceRange: newPriceRange,
        departureTime: departureTimeRef.current,
        directOnly: directOnlyRef.current,
      });
    }, DEBOUNCE_MS);
  }, [onFiltersChange]);

  const toggleStop = useCallback((value: string) => {
    setStops((prev) => {
      const newStops = prev.includes(value) ? prev.filter(s => s !== value) : [...prev, value];
      // Need to emit after state update, use functional form
      stopsRef.current = newStops;
      emitFilters({ stops: newStops });
      return newStops;
    });
  }, [emitFilters]);

  const toggleAirline = useCallback((value: string) => {
    setAirlines((prev) => {
      const newAirlines = prev.includes(value) ? prev.filter(a => a !== value) : [...prev, value];
      airlinesRef.current = newAirlines;
      emitFilters({ airlines: newAirlines });
      return newAirlines;
    });
  }, [emitFilters]);

  const toggleDepartureTime = useCallback((value: string) => {
    setDepartureTime((prev) => {
      const newTimes = prev.includes(value) ? prev.filter(t => t !== value) : [...prev, value];
      departureTimeRef.current = newTimes;
      emitFilters({ departureTime: newTimes });
      return newTimes;
    });
  }, [emitFilters]);

  const handlePriceChange = useCallback((value: number[]) => {
    const newRange: [number, number] = [value[0], value[1]];
    setPriceRange(newRange);
    emitFiltersDebounced(newRange);
  }, [emitFiltersDebounced]);

  const handleDirectOnlyChange = useCallback((checked: boolean) => {
    setDirectOnly(checked);
    directOnlyRef.current = checked;
    onDirectOnlyChange?.(checked);
    emitFilters({ directOnly: checked });
  }, [onDirectOnlyChange, emitFilters]);

  const handleReset = useCallback(() => {
    setStops([]);
    setAirlines([]);
    setPriceRange(actualPriceRange);
    setDepartureTime([]);
    setDirectOnly(false);
    stopsRef.current = [];
    airlinesRef.current = [];
    departureTimeRef.current = [];
    directOnlyRef.current = false;
    onFiltersChange({
      stops: [],
      airlines: [],
      priceRange: actualPriceRange,
      departureTime: [],
      directOnly: false,
    });
    onDirectOnlyChange?.(false);
  }, [actualPriceRange, onFiltersChange, onDirectOnlyChange]);

  const hasActiveFilters = stops.length > 0 || airlines.length > 0 || departureTime.length > 0 ||
    priceRange[0] !== actualPriceRange[0] || priceRange[1] !== actualPriceRange[1] || directOnly;

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-4 overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-foreground font-semibold">
          <Filter className="w-5 h-5" />
          <span>Filters</span>
        </div>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-xs text-muted-foreground hover:text-foreground gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            Clear all
          </Button>
        )}
      </div>

      {showDirectOnly && (
        <div className="p-3 bg-primary/5 rounded-xl border border-primary/20">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="direct-only-filter"
              checked={directOnly}
              onCheckedChange={(checked) => handleDirectOnlyChange(checked === true)}
            />
            <Label
              htmlFor="direct-only-filter"
              className="text-sm font-medium text-foreground cursor-pointer flex items-center gap-2"
            >
              <Plane className="w-4 h-4 text-primary" />
              Direct flights only
            </Label>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">Stops</h3>
        <div className="space-y-2">
          {STOPS.map((stop) => (
            <div key={stop.value} className="flex items-center space-x-2">
              <Checkbox
                id={`stop-${stop.value}`}
                checked={stops.includes(stop.value)}
                onCheckedChange={() => toggleStop(stop.value)}
              />
              <Label
                htmlFor={`stop-${stop.value}`}
                className="text-sm text-muted-foreground cursor-pointer truncate"
              >
                {stop.label}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">Price Range</h3>
        <div className="pt-2 px-1">
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
          <span className="text-muted-foreground">—</span>
          <span className="font-medium text-foreground">${priceRange[1]}</span>
        </div>
      </div>

      {availableAirlines.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">Airlines</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {availableAirlines.map((airline) => (
              <div key={airline} className="flex items-center space-x-2 min-w-0">
                <Checkbox
                  id={`airline-${airline}`}
                  checked={airlines.includes(airline)}
                  onCheckedChange={() => toggleAirline(airline)}
                  className="shrink-0"
                />
                <Label
                  htmlFor={`airline-${airline}`}
                  className="text-sm text-muted-foreground cursor-pointer truncate min-w-0"
                  title={airline}
                >
                  {airline}
                </Label>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">Departure Time</h3>
        <div className="space-y-2">
          {DEPARTURE_TIMES.map((time) => (
            <div key={time.value} className="flex items-center space-x-2">
              <Checkbox
                id={`time-${time.value}`}
                checked={departureTime.includes(time.value)}
                onCheckedChange={() => toggleDepartureTime(time.value)}
              />
              <Label
                htmlFor={`time-${time.value}`}
                className="text-sm text-muted-foreground cursor-pointer truncate"
              >
                {time.label}
              </Label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});
FlightFilters.displayName = "FlightFilters";

export default FlightFilters;
