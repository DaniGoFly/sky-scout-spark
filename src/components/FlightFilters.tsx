import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Filter, RotateCcw } from "lucide-react";

interface FlightFiltersProps {
  onFiltersChange: (filters: FilterState) => void;
}

export interface FilterState {
  stops: string[];
  airlines: string[];
  priceRange: [number, number];
  departureTime: string[];
}

const AIRLINES = [
  "British Airways",
  "Delta Airlines", 
  "Virgin Atlantic",
  "American Airlines",
  "United Airlines",
  "Lufthansa",
];

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

const FlightFilters = ({ onFiltersChange }: FlightFiltersProps) => {
  const [stops, setStops] = useState<string[]>([]);
  const [airlines, setAirlines] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>(DEFAULT_PRICE_RANGE);
  const [departureTime, setDepartureTime] = useState<string[]>([]);

  const updateFilters = (newFilters: Partial<FilterState>) => {
    const filters = {
      stops: newFilters.stops ?? stops,
      airlines: newFilters.airlines ?? airlines,
      priceRange: newFilters.priceRange ?? priceRange,
      departureTime: newFilters.departureTime ?? departureTime,
    };
    onFiltersChange(filters);
  };

  const toggleStop = (value: string) => {
    const newStops = stops.includes(value)
      ? stops.filter((s) => s !== value)
      : [...stops, value];
    setStops(newStops);
    updateFilters({ stops: newStops });
  };

  const toggleAirline = (value: string) => {
    const newAirlines = airlines.includes(value)
      ? airlines.filter((a) => a !== value)
      : [...airlines, value];
    setAirlines(newAirlines);
    updateFilters({ airlines: newAirlines });
  };

  const toggleDepartureTime = (value: string) => {
    const newTimes = departureTime.includes(value)
      ? departureTime.filter((t) => t !== value)
      : [...departureTime, value];
    setDepartureTime(newTimes);
    updateFilters({ departureTime: newTimes });
  };

  const handlePriceChange = (value: number[]) => {
    const newRange: [number, number] = [value[0], value[1]];
    setPriceRange(newRange);
    updateFilters({ priceRange: newRange });
  };

  const handleReset = () => {
    setStops([]);
    setAirlines([]);
    setPriceRange(DEFAULT_PRICE_RANGE);
    setDepartureTime([]);
    onFiltersChange({
      stops: [],
      airlines: [],
      priceRange: DEFAULT_PRICE_RANGE,
      departureTime: [],
    });
  };

  const hasActiveFilters = stops.length > 0 || airlines.length > 0 || departureTime.length > 0 ||
    priceRange[0] !== DEFAULT_PRICE_RANGE[0] || priceRange[1] !== DEFAULT_PRICE_RANGE[1];

  return (
    <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
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
            Reset
          </Button>
        )}
      </div>

      {/* Stops */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">Stops</h3>
        <div className="space-y-2">
          {STOPS.map((stop) => (
            <div key={stop.value} className="flex items-center space-x-2">
              <Checkbox
                id={stop.value}
                checked={stops.includes(stop.value)}
                onCheckedChange={() => toggleStop(stop.value)}
              />
              <Label
                htmlFor={stop.value}
                className="text-sm text-muted-foreground cursor-pointer"
              >
                {stop.label}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Price Range - Dual Handle */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">Price Range</h3>
        <div className="pt-2">
          <Slider
            value={priceRange}
            onValueChange={handlePriceChange}
            min={0}
            max={2000}
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

      {/* Airlines */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">Airlines</h3>
        <div className="space-y-2">
          {AIRLINES.map((airline) => (
            <div key={airline} className="flex items-center space-x-2">
              <Checkbox
                id={airline}
                checked={airlines.includes(airline)}
                onCheckedChange={() => toggleAirline(airline)}
              />
              <Label
                htmlFor={airline}
                className="text-sm text-muted-foreground cursor-pointer"
              >
                {airline}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Departure Time */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">Departure Time</h3>
        <div className="space-y-2">
          {DEPARTURE_TIMES.map((time) => (
            <div key={time.value} className="flex items-center space-x-2">
              <Checkbox
                id={time.value}
                checked={departureTime.includes(time.value)}
                onCheckedChange={() => toggleDepartureTime(time.value)}
              />
              <Label
                htmlFor={time.value}
                className="text-sm text-muted-foreground cursor-pointer"
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
