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

  const availableAirlines = useMemo(() => {
    if (!flights.length) return [];
    const airlineNames = flights.map(f => f.airlines?.[0]).filter(Boolean).map(code => getAirlineName(code));
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
    <div className="bg-card border border-border rounded-xl p-4 space-y-5 overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
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

      {/* Price range — clean layout */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-foreground">{t("filters.price_range")}</h3>
        <div className="flex justify-between text-[11px] text-muted-foreground">
          <span>{t("filters.min", "Min")}</span>
          <span>{t("filters.max", "Max")}</span>
        </div>
        <div className="px-1">
          <Slider value={priceRange} onValueChange={handlePriceChange} min={actualPriceRange[0]} max={actualPriceRange[1]} step={25} className="w-full" />
        </div>
        <div className="flex justify-between text-sm">
          <span className="font-medium text-foreground">{formatPrice(priceRange[0], flightsCurrency)}</span>
          <span className="font-medium text-foreground">{formatPrice(priceRange[1], flightsCurrency)}</span>
        </div>
      </div>

      {/* Airlines */}
      {availableAirlines.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">{t("filters.airlines")}</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {availableAirlines.map((airline) => (
              <div key={airline} className="flex items-center space-x-2 min-w-0">
                <Checkbox id={`airline-${airline}`} checked={airlines.includes(airline)} onCheckedChange={() => toggleAirline(airline)} className="shrink-0" />
                <Label htmlFor={`airline-${airline}`} className="text-sm text-muted-foreground cursor-pointer truncate min-w-0" title={airline}>{airline}</Label>
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
