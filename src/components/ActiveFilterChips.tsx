import { X } from "lucide-react";
import { FilterState } from "./FlightFilters";

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
  const chips: { label: string; onRemove: () => void }[] = [];

  if (filters.directOnly) {
    chips.push({ label: "Direct only", onRemove: () => onRemoveFilter("directOnly") });
  }

  filters.stops.forEach((s) => {
    const label = s === "direct" ? "Direct" : s === "1stop" ? "1 Stop" : "2+ Stops";
    chips.push({ label, onRemove: () => onRemoveFilter("stops", s) });
  });

  filters.airlines.forEach((a) => {
    chips.push({ label: a, onRemove: () => onRemoveFilter("airlines", a) });
  });

  const priceChanged =
    filters.priceRange[0] !== actualPriceRange[0] ||
    filters.priceRange[1] !== actualPriceRange[1];
  if (priceChanged) {
    chips.push({
      label: `$${filters.priceRange[0]}–$${filters.priceRange[1]}`,
      onRemove: () => onRemoveFilter("priceRange"),
    });
  }

  filters.departureTime.forEach((t) => {
    const label =
      t === "morning" ? "Morning" : t === "afternoon" ? "Afternoon" : t === "evening" ? "Evening" : "Night";
    chips.push({ label, onRemove: () => onRemoveFilter("departureTime", t) });
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
        <button
          onClick={onClearAll}
          className="text-xs text-muted-foreground hover:text-foreground underline ml-1"
        >
          Clear all
        </button>
      )}
    </div>
  );
};

export default ActiveFilterChips;
