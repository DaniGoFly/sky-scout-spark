import { useState, useCallback, useEffect, useRef } from "react";
import { Plus, X, Search, Calendar } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
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
  const [openCalendarSegmentId, setOpenCalendarSegmentId] = useState<string | null>(null);
  const calendarWrapRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!openCalendarSegmentId) return;

    const onDown = (event: MouseEvent) => {
      const target = event.target as Node;
      const activeWrapper = calendarWrapRefs.current[openCalendarSegmentId];
      if (activeWrapper?.contains(target)) return;
      setOpenCalendarSegmentId(null);
    };

    document.addEventListener("mousedown", onDown, true);
    return () => document.removeEventListener("mousedown", onDown, true);
  }, [openCalendarSegmentId]);

  const addSegment = () => {
    if (segments.length >= 5) return;
    const lastSegment = segments[segments.length - 1];
    setSegments([
      ...segments,
      { id: generateId(), from: lastSegment.to, to: null, date: null },
    ]);
  };

  const removeSegment = (id: string) => {
    if (segments.length <= 2) return;
    setSegments(segments.filter((s) => s.id !== id));
    if (openCalendarSegmentId === id) {
      setOpenCalendarSegmentId(null);
    }
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
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[`${id}-${field}`];
      return newErrors;
    });
  };

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    segments.forEach((segment, index) => {
      if (!segment.from) newErrors[`${segment.id}-from`] = "Required";
      if (!segment.to) newErrors[`${segment.id}-to`] = "Required";
      if (!segment.date) newErrors[`${segment.id}-date`] = "Required";
      if (index > 0 && segment.date && segments[index - 1].date) {
        if (segment.date < segments[index - 1].date!) {
          newErrors[`${segment.id}-date`] = "Must be after previous flight";
        }
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [segments]);

  /* Style tokens matching the standard search bar */
  const SEG_LABEL = "text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-[0.12em] leading-none";

  return (
    <div className="space-y-2">
      {/* Segments */}
      {segments.map((segment, index) => (
        <div
          key={segment.id}
          className="w-full border border-border/10 bg-background/60 backdrop-blur-sm rounded-2xl overflow-visible"
        >
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] items-stretch">
            {/* From */}
            <div className={cn(
              "min-w-0 px-5 py-3 transition-colors hover:bg-secondary/60 flex flex-col justify-center overflow-visible rounded-l-2xl",
              errors[`${segment.id}-from`] && "ring-2 ring-destructive/40"
            )}>
              <span className={SEG_LABEL}>Flight {index + 1} — From</span>
              <div className="mt-1.5">
                <AirportAutocomplete
                  value={segment.from}
                  onChange={(val) => updateSegment(segment.id, "from", val)}
                  placeholder="Country, city or airport"
                  icon="from"
                  compact
                  hasError={false}
                />
              </div>
            </div>

            {/* To */}
            <div className={cn(
              "min-w-0 px-5 py-3 transition-colors hover:bg-secondary/60 flex flex-col justify-center overflow-visible border-l border-border/20",
              errors[`${segment.id}-to`] && "ring-2 ring-destructive/40"
            )}>
              <span className={SEG_LABEL}>To</span>
              <div className="mt-1.5">
                <AirportAutocomplete
                  value={segment.to}
                  onChange={(val) => updateSegment(segment.id, "to", val)}
                  placeholder="Country, city or airport"
                  icon="to"
                  compact
                  hasError={false}
                />
              </div>
            </div>

            {/* Date */}
            <div
              className={cn(
                "min-w-0 relative overflow-visible px-5 py-3 transition-colors hover:bg-secondary/60 flex flex-col justify-center border-l border-border/20",
                errors[`${segment.id}-date`] && "ring-2 ring-destructive/40"
              )}
              ref={(el) => {
                calendarWrapRefs.current[segment.id] = el;
              }}
            >
              <button
                type="button"
                onClick={() =>
                  setOpenCalendarSegmentId((prev) => (prev === segment.id ? null : segment.id))
                }
                className="w-full text-left focus:outline-none cursor-pointer"
              >
                <span className={SEG_LABEL}>Date</span>
                <span className={cn(
                  "block text-[14px] leading-[20px] mt-1.5 font-semibold whitespace-nowrap",
                  segment.date ? "text-foreground" : "text-muted-foreground/40 font-normal"
                )}>
                  {segment.date ? format(segment.date, "d MMM yyyy") : "Select date"}
                </span>
              </button>

              {openCalendarSegmentId === segment.id && (
                <div className="absolute left-0 top-[calc(100%+8px)] z-[100] w-auto rounded-xl border border-border bg-card p-0 shadow-xl">
                  <CalendarComponent
                    mode="single"
                    selected={segment.date || undefined}
                    onSelect={(date) => {
                      updateSegment(segment.id, "date", date);
                      if (date) setOpenCalendarSegmentId(null);
                    }}
                    disabled={(date) => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      if (date < today) return true;
                      if (index > 0 && segments[index - 1].date) {
                        return date < segments[index - 1].date!;
                      }
                      return false;
                    }}
                  />
                </div>
              )}
            </div>

            {/* Remove button */}
            <div className="flex items-center justify-center px-2 border-l border-border/20">
              {segments.length > 2 ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-muted-foreground hover:text-destructive shrink-0 rounded-full"
                  onClick={() => removeSegment(segment.id)}
                >
                  <X className="w-4 h-4" />
                </Button>
              ) : (
                <div className="h-9 w-9 shrink-0" />
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Add flight button */}
      {segments.length < 5 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={addSegment}
          className="gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <Plus className="w-3.5 h-3.5" />
          Add flight
        </Button>
      )}

      {/* Travelers & Search */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-4 border-t border-border/20">
        <div className="w-full md:w-auto md:min-w-[200px]">
          <TravelersPicker value={travelers} onChange={setTravelers} />
        </div>
        <Button
          size="lg"
          onClick={handleSearch}
          className="w-full md:w-auto gap-2 px-8 bg-gradient-to-b from-primary to-[hsl(220_80%_46%)] text-primary-foreground font-semibold hover:brightness-110 active:scale-[0.98] transition-all"
        >
          <Search className="w-4 h-4" />
          Search Multi-city
        </Button>
      </div>
    </div>
  );
};

export default MultiCitySearchForm;
