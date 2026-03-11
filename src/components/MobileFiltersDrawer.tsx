import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Filter, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose } from "@/components/ui/sheet";
import { FilterState, StopsMode } from "./FlightFilters";
import { Flight, getAirlineName } from "@/lib/flightNormalizer";
import { useLocale } from "@/hooks/useLocale";

interface MobileFiltersDrawerProps {
  onFiltersChange: (filters: FilterState) => void;
  activeFiltersCount: number;
  flightCount: number;
  flights?: Flight[];
  flightsCurrency?: string;
  currentFilters?: FilterState;
}

const DEFAULT_PRICE_RANGE: [number, number] = [0, 2000];
const DEBOUNCE_MS = 200;

const MobileFiltersDrawer = ({
  onFiltersChange, activeFiltersCount, flightCount, flights = [], flightsCurrency, currentFilters,
}: MobileFiltersDrawerProps) => {
  const { t } = useTranslation();
  const { formatPrice } = useLocale();
  const [open, setOpen] = useState(false);
  const [stopsMode, setStopsMode] = useState<StopsMode>("any");
  const [airlines, setAirlines] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>(DEFAULT_PRICE_RANGE);
  const [departureTime, setDepartureTime] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const DEPARTURE_TIMES = useMemo(() => [
    { value: "morning", label: t("filters.morning") },
    { value: "afternoon", label: t("filters.afternoon") },
    { value: "evening", label: t("filters.evening") },
    { value: "night", label: t("filters.night") },
  ], [t]);

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
    if (currentFilters.stopsMode !== stopsMode) setStopsMode(currentFilters.stopsMode);
    if (JSON.stringify(currentFilters.airlines) !== JSON.stringify(airlines)) setAirlines(currentFilters.airlines);
    if (currentFilters.priceRange[0] !== priceRange[0] || currentFilters.priceRange[1] !== priceRange[1]) setPriceRange(currentFilters.priceRange);
    if (JSON.stringify(currentFilters.departureTime) !== JSON.stringify(departureTime)) setDepartureTime(currentFilters.departureTime);
  }, [currentFilters]);

  const emitFilters = useCallback((overrides: Partial<FilterState> = {}) => {
    onFiltersChange({
      stopsMode: overrides.stopsMode ?? stopsMode,
      airlines: overrides.airlines ?? airlines,
      priceRange: overrides.priceRange ?? priceRange,
      departureTime: overrides.departureTime ?? departureTime,
    });
  }, [stopsMode, airlines, priceRange, departureTime, onFiltersChange]);

  const emitFiltersDebounced = useCallback((newPriceRange: [number, number]) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onFiltersChange({ stopsMode, airlines, priceRange: newPriceRange, departureTime });
    }, DEBOUNCE_MS);
  }, [stopsMode, airlines, departureTime, onFiltersChange]);

  const handleReset = () => {
    setStopsMode("any"); setAirlines([]); setPriceRange(actualPriceRange); setDepartureTime([]);
    onFiltersChange({ stopsMode: "any", airlines: [], priceRange: actualPriceRange, departureTime: [] });
  };

  const handleStopsModeChange = (value: string) => { const m = value as StopsMode; setStopsMode(m); emitFilters({ stopsMode: m }); };
  const toggleAirline = (value: string) => { const n = airlines.includes(value) ? airlines.filter(a => a !== value) : [...airlines, value]; setAirlines(n); emitFilters({ airlines: n }); };
  const toggleDepartureTime = (value: string) => { const n = departureTime.includes(value) ? departureTime.filter(t => t !== value) : [...departureTime, value]; setDepartureTime(n); emitFilters({ departureTime: n }); };
  const handlePriceChange = (value: number[]) => { const nr: [number, number] = [value[0], value[1]]; setPriceRange(nr); emitFiltersDebounced(nr); };

  const hasActiveFilters = stopsMode !== "any" || airlines.length > 0 || departureTime.length > 0 ||
    priceRange[0] !== actualPriceRange[0] || priceRange[1] !== actualPriceRange[1];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 shrink-0">
          <Filter className="w-4 h-4" />
          <span>{t("filters.title")}</span>
          {activeFiltersCount > 0 && (
            <span className="bg-primary text-primary-foreground text-[10px] rounded-full w-5 h-5 flex items-center justify-center shrink-0">{activeFiltersCount}</span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[80vh] rounded-t-2xl flex flex-col">
        <SheetHeader className="pb-3 border-b border-border shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2 text-base">
              <Filter className="w-4 h-4" />
              {t("filters.title")}
            </SheetTitle>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1 text-xs text-muted-foreground">
                <RotateCcw className="w-3 h-3" />
                {t("filters.clear_all")}
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-5 space-y-5">
          {/* Stops — single-choice */}
          <div className="space-y-2.5">
            <h3 className="text-sm font-semibold text-foreground">{t("filters.stops")}</h3>
            <RadioGroup value={stopsMode} onValueChange={handleStopsModeChange} className="flex flex-wrap gap-2">
              {([
                { value: "any", label: t("filters.stop_any", "Any") },
                { value: "direct", label: t("filters.stop_direct") },
                { value: "1", label: t("filters.stop_1") },
                { value: "2plus", label: t("filters.stop_2plus") },
              ] as const).map((opt) => (
                <label
                  key={opt.value}
                  htmlFor={`mobile-stop-${opt.value}`}
                  className={`px-3 py-2 rounded-full text-sm border transition-colors cursor-pointer ${
                    stopsMode === opt.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border text-foreground hover:border-primary/50"
                  }`}
                >
                  <RadioGroupItem value={opt.value} id={`mobile-stop-${opt.value}`} className="sr-only" />
                  {opt.label}
                </label>
              ))}
            </RadioGroup>
          </div>

          {/* Price range — clean layout */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">{t("filters.price_range")}</h3>
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

          {availableAirlines.length > 0 && (
            <div className="space-y-2.5">
              <h3 className="text-sm font-semibold text-foreground">{t("filters.airlines")}</h3>
              <div className="flex flex-wrap gap-2">
                {availableAirlines.map((airline) => (
                  <button key={airline} onClick={() => toggleAirline(airline)}
                    className={`px-3 py-2 rounded-full text-sm border transition-colors truncate max-w-[160px] ${airlines.includes(airline) ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-foreground hover:border-primary/50"}`}
                    title={airline}>{airline}</button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2.5">
            <h3 className="text-sm font-semibold text-foreground">{t("filters.departure_time")}</h3>
            <div className="grid grid-cols-2 gap-2">
              {DEPARTURE_TIMES.map((time) => (
                <button key={time.value} onClick={() => toggleDepartureTime(time.value)}
                  className={`px-3 py-2.5 rounded-lg text-sm border text-start transition-colors ${departureTime.includes(time.value) ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-foreground hover:border-primary/50"}`}>
                  {time.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <SheetFooter className="pt-3 border-t border-border gap-2 shrink-0">
          <SheetClose asChild>
            <Button variant="outline" className="flex-1 min-h-[44px]">{t("filters.cancel")}</Button>
          </SheetClose>
          <Button onClick={() => setOpen(false)} className="flex-1 min-h-[44px]">
            {t("filters.show_flights", { count: flightCount })}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default MobileFiltersDrawer;
