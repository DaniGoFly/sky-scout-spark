import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { FilterState } from "./FlightFilters";
import { useLocale } from "@/hooks/useLocale";

interface ActiveFilterChipsProps {
  filters: FilterState;
  actualPriceRange: [number, number];
  onRemoveFilter: (key: keyof FilterState, value?: string) => void;
  onClearAll: () => void;
}

const ActiveFilterChips = ({
  filters,
  actualPriceRange,
  onRemoveFilter,
  onClearAll,
}: ActiveFilterChipsProps) => {
  const { t } = useTranslation();
  const { formatPrice } = useLocale();
  const chips: { label: string; onRemove: () => void }[] = [];

  if (filters.directOnly) {
    chips.push({ label: t("chips.direct_only"), onRemove: () => onRemoveFilter("directOnly") });
  }

  filters.stops.forEach((s) => {
    const label = s === "direct" ? t("chips.direct") : s === "1stop" ? t("chips.1stop") : t("chips.2stops");
    chips.push({ label, onRemove: () => onRemoveFilter("stops", s) });
  });

  filters.airlines.forEach((a) => {
    chips.push({ label: a, onRemove: () => onRemoveFilter("airlines", a) });
  });

  const priceChanged = filters.priceRange[0] !== actualPriceRange[0] || filters.priceRange[1] !== actualPriceRange[1];
  if (priceChanged) {
    chips.push({
      label: `${formatPrice(filters.priceRange[0])}–${formatPrice(filters.priceRange[1])}`,
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
