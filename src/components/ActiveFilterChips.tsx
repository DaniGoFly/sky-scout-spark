import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { FilterState, StopsMode } from "./FlightFilters";
import { useLocale } from "@/hooks/useLocale";

interface ActiveFilterChipsProps {
  filters: FilterState;
  actualPriceRange: [number, number];
  onRemoveFilter: (key: keyof FilterState, value?: string) => void;
  onClearAll: () => void;
  flightsCurrency?: string;
}

const ActiveFilterChips = ({
  filters,
  actualPriceRange,
  onRemoveFilter,
  onClearAll,
  flightsCurrency,
}: ActiveFilterChipsProps) => {
  const { t } = useTranslation();
  const { formatPrice } = useLocale();
  const chips: { label: string; onRemove: () => void }[] = [];

  // Stops mode chip
  if (filters.stopsMode !== "any") {
    const stopsLabels: Record<StopsMode, string> = {
      any: "",
      direct: t("filters.stop_direct"),
      "1": t("filters.stop_1"),
      "2plus": t("filters.stop_2plus"),
    };
    chips.push({ label: stopsLabels[filters.stopsMode], onRemove: () => onRemoveFilter("stopsMode") });
  }

  filters.airlines.forEach((a) => {
    chips.push({ label: a, onRemove: () => onRemoveFilter("airlines", a) });
  });

  const priceChanged = filters.priceRange[0] !== actualPriceRange[0] || filters.priceRange[1] !== actualPriceRange[1];
  if (priceChanged) {
    chips.push({
      label: `${formatPrice(filters.priceRange[0], flightsCurrency)}–${formatPrice(filters.priceRange[1], flightsCurrency)}`,
      onRemove: () => onRemoveFilter("priceRange"),
    });
  }

  filters.departureTime.forEach((dt) => {
    const label = t(`chips.${dt}` as any);
    chips.push({ label, onRemove: () => onRemoveFilter("departureTime", dt) });
  });

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map((chip, i) => (
        <button
          key={i}
          onClick={chip.onRemove}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
        >
          {chip.label}
          <X className="w-3 h-3" />
        </button>
      ))}
      {chips.length > 1 && (
        <button onClick={onClearAll} className="text-xs text-muted-foreground hover:text-foreground underline ms-1">
          {t("chips.clear_all")}
        </button>
      )}
    </div>
  );
};

export default ActiveFilterChips;
