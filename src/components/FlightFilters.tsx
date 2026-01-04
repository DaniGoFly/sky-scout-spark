import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Filter } from "lucide-react";

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

const FlightFilters = ({ onFiltersChange }: FlightFiltersProps) => {
  const [stops, setStops] = useState<string[]>([]);
  const [airlines, setAirlines] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 2000]);
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

  return (
    <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
      <div className="flex items-center gap-2 text-foreground font-semibold">
        <Filter className="w-5 h-5" />
        <span>Filters</span>
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

      {/* Price Range */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">Price Range</h3>
        <Slider
          value={priceRange}
          onValueChange={handlePriceChange}
          min={0}
          max={2000}
          step={50}
          className="w-full"
        />
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>${priceRange[0]}</span>
          <span>${priceRange[1]}</span>
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
