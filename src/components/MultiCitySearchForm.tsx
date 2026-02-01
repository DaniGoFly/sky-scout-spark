import { useState, useCallback } from "react";
import { Plus, X, Search, Calendar } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import AirportAutocomplete from "./AirportAutocomplete";
import TravelersPicker, { TravelersData } from "./TravelersPicker";
import { cn } from "@/lib/utils";

interface AirportSelection {
  code: string;
  display: string;
}

interface FlightSegment {
  id: string;
  from: AirportSelection | null;
  to: AirportSelection | null;
  date: Date | null;
}

interface MultiCitySearchFormProps {
  onSearch: (segments: FlightSegment[], travelers: TravelersData) => void;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

const MultiCitySearchForm = ({ onSearch }: MultiCitySearchFormProps) => {
  const [segments, setSegments] = useState<FlightSegment[]>([
    { id: generateId(), from: null, to: null, date: null },
    { id: generateId(), from: null, to: null, date: null },
  ]);
  const [travelers, setTravelers] = useState<TravelersData>({
    adults: 1,
    children: 0,
    infantsSeat: 0,
    infantsLap: 0,
    cabinClass: "economy",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const addSegment = () => {
    if (segments.length >= 5) return;
    // Pre-fill from with previous segment's to
    const lastSegment = segments[segments.length - 1];
    setSegments([
      ...segments,
      { 
        id: generateId(), 
        from: lastSegment.to, 
        to: null, 
        date: null 
      },
    ]);
  };

  const removeSegment = (id: string) => {
    if (segments.length <= 2) return;
    setSegments(segments.filter((s) => s.id !== id));
    // Clear errors for removed segment
    const newErrors = { ...errors };
    delete newErrors[`${id}-from`];
    delete newErrors[`${id}-to`];
    delete newErrors[`${id}-date`];
    setErrors(newErrors);
  };

  const updateSegment = (id: string, field: keyof FlightSegment, value: any) => {
    setSegments(
      segments.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
    // Clear error when user updates field
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[`${id}-${field}`];
      return newErrors;
    });
  };

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    
    segments.forEach((segment, index) => {
      if (!segment.from) {
        newErrors[`${segment.id}-from`] = "Required";
      }
      if (!segment.to) {
        newErrors[`${segment.id}-to`] = "Required";
      }
      if (!segment.date) {
        newErrors[`${segment.id}-date`] = "Required";
      }
      // Check date order
      if (index > 0 && segment.date && segments[index - 1].date) {
        if (segment.date < segments[index - 1].date!) {
          newErrors[`${segment.id}-date`] = "Must be after previous flight";
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [segments]);

  const handleSearch = () => {
    if (!validate()) return;
    onSearch(segments, travelers);
  };

  return (
    <div className="gradient-border bg-card rounded-2xl p-6 md:p-8 w-full max-w-5xl mx-auto">
      <div className="space-y-4">
        {segments.map((segment, index) => (
          <div
            key={segment.id}
            className="relative bg-secondary/30 rounded-xl p-4 border border-border"
          >
            {/* Flight number label */}
            <div className="absolute -top-3 left-4">
              <span className="bg-primary text-primary-foreground text-xs font-semibold px-2 py-1 rounded">
                Flight {index + 1}
              </span>
            </div>

            {/* Remove button */}
            {segments.length > 2 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => removeSegment(segment.id)}
              >
                <X className="w-4 h-4" />
              </Button>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {/* From */}
              <div className="min-w-0">
                <label className="block text-xs font-medium text-muted-foreground mb-2">
                  From
                </label>
                <AirportAutocomplete
                  value={segment.from}
                  onChange={(val) => updateSegment(segment.id, "from", val)}
                  placeholder="Origin"
                  icon="from"
                  compact
                  hasError={!!errors[`${segment.id}-from`]}
                />
                {errors[`${segment.id}-from`] && (
                  <p className="text-destructive text-xs mt-1 truncate">
                    {errors[`${segment.id}-from`]}
                  </p>
                )}
              </div>

              {/* To */}
              <div className="min-w-0">
                <label className="block text-xs font-medium text-muted-foreground mb-2">
                  To
                </label>
                <AirportAutocomplete
                  value={segment.to}
                  onChange={(val) => updateSegment(segment.id, "to", val)}
                  placeholder="Destination"
                  icon="to"
                  compact
                  hasError={!!errors[`${segment.id}-to`]}
                />
                {errors[`${segment.id}-to`] && (
                  <p className="text-destructive text-xs mt-1 truncate">
                    {errors[`${segment.id}-to`]}
                  </p>
                )}
              </div>

              {/* Date */}
              <div className="min-w-0">
                <label className="block text-xs font-medium text-muted-foreground mb-2">
                  Date
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full h-10 justify-start text-left font-normal bg-secondary/50 border-transparent rounded-lg text-sm",
                        !segment.date && "text-muted-foreground",
                        errors[`${segment.id}-date`] && "border-destructive"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4 shrink-0" />
                      <span className="truncate">
                        {segment.date ? format(segment.date, "MMM d, yyyy") : "Select date"}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={segment.date || undefined}
                      onSelect={(date) => updateSegment(segment.id, "date", date)}
                      disabled={(date) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        if (date < today) return true;
                        // Must be after previous segment
                        if (index > 0 && segments[index - 1].date) {
                          return date < segments[index - 1].date!;
                        }
                        return false;
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {errors[`${segment.id}-date`] && (
                  <p className="text-destructive text-xs mt-1 truncate">
                    {errors[`${segment.id}-date`]}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Add Segment Button */}
        {segments.length < 5 && (
          <Button
            variant="outline"
            onClick={addSegment}
            className="w-full gap-2 border-dashed border-2"
          >
            <Plus className="w-4 h-4" />
            Add another flight
          </Button>
        )}

        {/* Travelers & Search */}
        <div className="flex flex-col md:flex-row gap-4 pt-4 border-t border-border">
          <div className="flex-1 md:max-w-xs">
            <TravelersPicker value={travelers} onChange={setTravelers} />
          </div>
          <div className="flex-1 flex items-end">
            <Button
              size="lg"
              onClick={handleSearch}
              className="w-full md:w-auto gap-2 px-8 bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
            >
              <Search className="w-4 h-4" />
              Search Multi-city
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MultiCitySearchForm;
