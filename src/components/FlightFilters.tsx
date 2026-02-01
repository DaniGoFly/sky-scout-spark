import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Filter, RotateCcw, Plane } from "lucide-react";
import { NormalizedFlight } from "@/lib/flightNormalizer";

interface FlightFiltersProps {
  onFiltersChange: (filters: FilterState) => void;
  flights?: NormalizedFlight[];
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

const FlightFilters = ({ 
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
  
  // Debounce timer ref for slider
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

  // Emit filter change (immediate for checkboxes)
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

  const toggleStop = (value: string) => {
    const newStops = stops.includes(value)
      ? stops.filter((s) => s !== value)
      : [...stops, value];
    setStops(newStops);
    emitFilters({ stops: newStops });
  };

  const toggleAirline = (value: string) => {
    const newAirlines = airlines.includes(value)
      ? airlines.filter((a) => a !== value)
      : [...airlines, value];
    setAirlines(newAirlines);
    emitFilters({ airlines: newAirlines });
  };

  const toggleDepartureTime = (value: string) => {
    const newTimes = departureTime.includes(value)
      ? departureTime.filter((t) => t !== value)
      : [...departureTime, value];
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
    if (onDirectOnlyChange) {
      onDirectOnlyChange(checked);
    }
    emitFilters({ directOnly: checked });
  };

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
    if (onDirectOnlyChange) {
      onDirectOnlyChange(false);
    }
  };

  const hasActiveFilters = stops.length > 0 || airlines.length > 0 || departureTime.length > 0 ||
    priceRange[0] !== actualPriceRange[0] || priceRange[1] !== actualPriceRange[1] || directOnly;

  return (
    <div 
      className="bg-card border border-border rounded-2xl p-5 space-y-5 overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
      style={{ 
        position: 'sticky',
        top: '6rem',
        maxHeight: 'calc(100vh - 7rem)',
      }}
    >
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

      {/* Direct Flights Only - Quick Filter */}
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

      {/* Stops */}
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

      {/* Price Range - Dual Handle with Debounce */}
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

      {/* Airlines - Dynamic based on results */}
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

      {/* Departure Time */}
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
};

export default FlightFilters;
