import { memo, useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Filter, RotateCcw } from "lucide-react";
import { Flight, getAirlineName } from "@/lib/flightNormalizer";
import { useLocale } from "@/hooks/useLocale";

// ── Price slider with tooltip ──────────────────────────────────────────────
interface PriceSliderProps {
  value: [number, number];
  min: number;
  max: number;
  step: number;
  onChange: (v: number[]) => void;
  formatPrice: (v: number, currency?: string) => string;
  currency?: string;
  labelMin: string;
  labelMax: string;
}

const PriceSlider = ({ value, min, max, onChange, step, formatPrice, currency, labelMin, labelMax }: PriceSliderProps) => {
  const [dragging, setDragging] = useState<"min" | "max" | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const minPct = max > min ? ((value[0] - min) / (max - min)) * 100 : 0;
  const maxPct = max > min ? ((value[1] - min) / (max - min)) * 100 : 100;

  return (
    <div className="space-y-2 select-none">
      {/* Grid: [min-label] [slider] [max-label] — labels are outside thumb path */}
      <div className="grid items-center gap-3" style={{ gridTemplateColumns: "68px 1fr 68px" }}>
        {/* Min value — fixed left column */}
        <span className="text-xs font-semibold text-foreground tabular-nums text-left">
          {formatPrice(value[0], currency)}
        </span>

        {/* Slider track + floating tooltips */}
        <div className="relative py-5" ref={trackRef}>
          {/* Min tooltip — appears above thumb while dragging */}
          {dragging === "min" && (
            <div
              className="absolute z-20 pointer-events-none"
              style={{ left: `clamp(0%, ${minPct}%, 100%)`, top: 0, transform: "translate(-50%, 0)" }}
            >
              <div className="bg-popover border border-border text-foreground text-[11px] font-semibold rounded-lg px-2 py-1 whitespace-nowrap shadow-md">
                {formatPrice(value[0], currency)}
              </div>
            </div>
          )}
          {/* Max tooltip — appears above thumb while dragging */}
          {dragging === "max" && (
            <div
              className="absolute z-20 pointer-events-none"
              style={{ left: `clamp(0%, ${maxPct}%, 100%)`, top: 0, transform: "translate(-50%, 0)" }}
            >
              <div className="bg-popover border border-border text-foreground text-[11px] font-semibold rounded-lg px-2 py-1 whitespace-nowrap shadow-md">
                {formatPrice(value[1], currency)}
              </div>
            </div>
          )}
          <div
            onPointerDown={(e) => {
              const target = e.target as HTMLElement;
              const thumb = target.closest("[role='slider']");
              if (!thumb) return;
              const thumbs = trackRef.current?.querySelectorAll("[role='slider']");
              if (!thumbs) return;
              setDragging(thumbs[0] === thumb ? "min" : "max");
            }}
            onPointerUp={() => setDragging(null)}
            onPointerCancel={() => setDragging(null)}
          >
            <Slider value={value} onValueChange={onChange} min={min} max={max} step={step} className="w-full" />
          </div>
        </div>

        {/* Max value — fixed right column */}
        <span className="text-xs font-semibold text-foreground tabular-nums text-right">
          {formatPrice(value[1], currency)}
        </span>
      </div>

      {/* Min / Max labels row */}
      <div className="grid text-[10px] text-muted-foreground" style={{ gridTemplateColumns: "68px 1fr 68px" }}>
        <span>{labelMin}</span>
        <span />
        <span className="text-right">{labelMax}</span>
      </div>
    </div>
  );
};

export type StopsMode = "any" | "direct" | "1" | "2plus";

export interface FilterState {
  stopsMode: StopsMode;
  airlines: string[];
  priceRange: [number, number];
  departureTime: string[];
}

interface FlightFiltersProps {
  onFiltersChange: (filters: FilterState) => void;
  flights?: Flight[];
  /** The currency code returned by the API for the current flight set */
  flightsCurrency?: string;
  /** Current filter state from the parent — used to sync when chips reset externally */
  currentFilters?: FilterState;
}

const DEFAULT_PRICE_RANGE: [number, number] = [0, 10000];
const DEBOUNCE_MS = 200;

const FlightFilters = memo(({
  onFiltersChange,
  flights = [],
  flightsCurrency,
  currentFilters,
}: FlightFiltersProps) => {
  const { t } = useTranslation();
  const { formatPrice } = useLocale();

  const DEPARTURE_TIMES = useMemo(() => [
    { value: "morning", label: t("filters.morning") },
    { value: "afternoon", label: t("filters.afternoon") },
    { value: "evening", label: t("filters.evening") },
    { value: "night", label: t("filters.night") },
  ], [t]);

  const [stopsMode, setStopsMode] = useState<StopsMode>("any");
  const [airlines, setAirlines] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>(DEFAULT_PRICE_RANGE);
  const [departureTime, setDepartureTime] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Build unique airline list with counts from flight data
  const airlineData = useMemo(() => {
    if (!flights.length) return [];
    const countMap = new Map<string, number>();
    flights.forEach(f => {
      const raw = f.airlines?.[0] || "";
      if (!raw) return;
      // Resolve display name: if it's a 2-3 letter code, map it; otherwise use as-is
      const display = raw.length <= 3 ? getAirlineName(raw) : raw;
      countMap.set(display, (countMap.get(display) || 0) + 1);
    });
    return [...countMap.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [flights]);

  const availableAirlines = useMemo(() => airlineData.map(a => a.name), [airlineData]);

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

  // Sync internal state when parent resets filters externally (e.g. chip × click)
  useEffect(() => {
    if (!currentFilters) return;
    if (currentFilters.stopsMode !== stopsModeRef.current) {
      setStopsMode(currentFilters.stopsMode);
      stopsModeRef.current = currentFilters.stopsMode;
    }
    if (JSON.stringify(currentFilters.airlines) !== JSON.stringify(airlinesRef.current)) {
      setAirlines(currentFilters.airlines);
      airlinesRef.current = currentFilters.airlines;
    }
    if (currentFilters.priceRange[0] !== priceRange[0] || currentFilters.priceRange[1] !== priceRange[1]) {
      setPriceRange(currentFilters.priceRange);
    }
    if (JSON.stringify(currentFilters.departureTime) !== JSON.stringify(departureTimeRef.current)) {
      setDepartureTime(currentFilters.departureTime);
      departureTimeRef.current = currentFilters.departureTime;
    }
  }, [currentFilters]);

  // Refs for debounced callbacks
  const stopsModeRef = useRef(stopsMode);
  const airlinesRef = useRef(airlines);
  const departureTimeRef = useRef(departureTime);
  stopsModeRef.current = stopsMode;
  airlinesRef.current = airlines;
  departureTimeRef.current = departureTime;

  const emitFilters = useCallback((overrides: Partial<FilterState> = {}) => {
    onFiltersChange({
      stopsMode: overrides.stopsMode ?? stopsModeRef.current,
      airlines: overrides.airlines ?? airlinesRef.current,
      priceRange: overrides.priceRange ?? priceRange,
      departureTime: overrides.departureTime ?? departureTimeRef.current,
    });
  }, [onFiltersChange, priceRange]);

  const emitFiltersDebounced = useCallback((newPriceRange: [number, number]) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onFiltersChange({
        stopsMode: stopsModeRef.current,
        airlines: airlinesRef.current,
        priceRange: newPriceRange,
        departureTime: departureTimeRef.current,
      });
    }, DEBOUNCE_MS);
  }, [onFiltersChange]);

  const handleStopsModeChange = useCallback((value: string) => {
    const mode = value as StopsMode;
    setStopsMode(mode);
    stopsModeRef.current = mode;
    emitFilters({ stopsMode: mode });
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

  const handleReset = useCallback(() => {
    setStopsMode("any");
    setAirlines([]);
    setPriceRange(actualPriceRange);
    setDepartureTime([]);
    stopsModeRef.current = "any";
    airlinesRef.current = [];
    departureTimeRef.current = [];
    onFiltersChange({ stopsMode: "any", airlines: [], priceRange: actualPriceRange, departureTime: [] });
  }, [actualPriceRange, onFiltersChange]);

  const hasActiveFilters = stopsMode !== "any" || airlines.length > 0 || departureTime.length > 0 ||
    priceRange[0] !== actualPriceRange[0] || priceRange[1] !== actualPriceRange[1];

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-foreground font-semibold">
          <Filter className="w-5 h-5" />
          <span>{t("filters.title")}</span>
        </div>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={handleReset} className="text-xs text-muted-foreground hover:text-foreground gap-1">
            <RotateCcw className="w-3 h-3" />
            {t("filters.clear_all")}
          </Button>
        )}
      </div>

      {/* Stops — single-choice radio group */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">{t("filters.stops")}</h3>
        <RadioGroup value={stopsMode} onValueChange={handleStopsModeChange} className="space-y-2">
          {([
            { value: "any", label: t("filters.stop_any", "Any") },
            { value: "direct", label: t("filters.stop_direct") },
            { value: "1", label: t("filters.stop_1") },
            { value: "2plus", label: t("filters.stop_2plus") },
          ] as const).map((opt) => (
            <div key={opt.value} className="flex items-center space-x-2">
              <RadioGroupItem value={opt.value} id={`stop-${opt.value}`} />
              <Label htmlFor={`stop-${opt.value}`} className="text-sm text-muted-foreground cursor-pointer truncate">{opt.label}</Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Price range */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-foreground">{t("filters.price_range")}</h3>
        <PriceSlider
          value={priceRange}
          min={actualPriceRange[0]}
          max={actualPriceRange[1]}
          step={25}
          onChange={handlePriceChange}
          formatPrice={formatPrice}
          currency={flightsCurrency}
          labelMin={t("filters.min", "Min")}
          labelMax={t("filters.max", "Max")}
        />
      </div>

      {/* Airlines */}
      {availableAirlines.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">{t("filters.airlines")}</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {airlineData.map(({ name, count }) => (
              <div key={name} className="flex items-center space-x-2 min-w-0">
                <Checkbox id={`airline-${name}`} checked={airlines.includes(name)} onCheckedChange={() => toggleAirline(name)} className="shrink-0" />
                <Label htmlFor={`airline-${name}`} className="text-sm text-muted-foreground cursor-pointer truncate min-w-0 flex-1" title={name}>{name}</Label>
                <span className="text-[11px] text-muted-foreground shrink-0">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Departure time */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">{t("filters.departure_time")}</h3>
        <div className="space-y-2">
          {DEPARTURE_TIMES.map((time) => (
            <div key={time.value} className="flex items-center space-x-2">
              <Checkbox id={`time-${time.value}`} checked={departureTime.includes(time.value)} onCheckedChange={() => toggleDepartureTime(time.value)} />
              <Label htmlFor={`time-${time.value}`} className="text-sm text-muted-foreground cursor-pointer truncate">{time.label}</Label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});
FlightFilters.displayName = "FlightFilters";

export default FlightFilters;
