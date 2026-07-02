import { memo } from "react";
import { useTranslation } from "react-i18next";
import { Wallet, Zap, Star } from "lucide-react";
import { Flight, getFlightStats, formatDuration } from "@/lib/flightNormalizer";
import { useLocale } from "@/hooks/useLocale";

interface FlightSortTabsProps {
  flights: Flight[];
  sortBy: "best" | "cheapest" | "fastest";
  onSortChange: (sort: "best" | "cheapest" | "fastest") => void;
}

const FlightSortTabs = memo(({ flights, sortBy, onSortChange }: FlightSortTabsProps) => {
  const { t } = useTranslation();
  const { formatPrice } = useLocale();
  const stats = getFlightStats(flights);
  if (!stats) return null;

  const tabs = [
    {
      key: "cheapest" as const,
      label: t("sort.cheapest"),
      icon: Wallet,
      description: t("sort.cheapest_desc"),
      sublabel: formatPrice(stats.cheapest.price.amount),
      activeColor: "text-primary",
      activeBg: "data-[state=active]:border-white/15",
      iconActiveClass: "text-primary",
    },
    {
      key: "best" as const,
      label: t("sort.best"),
      icon: Star,
      description: t("sort.best_desc"),
      sublabel: formatPrice(stats.best.price.amount),
      activeColor: "text-primary",
      activeBg: "data-[state=active]:border-white/15",
      iconActiveClass: "text-primary",
    },
    {
      key: "fastest" as const,
      label: t("sort.fastest"),
      icon: Zap,
      description: t("sort.fastest_desc"),
      sublabel: formatDuration(stats.fastest.durationMinutes) || "—",
      activeColor: "text-primary",
      activeBg: "data-[state=active]:border-white/15",
      iconActiveClass: "text-primary",
    },
  ];

  return (
    <div className="w-full mt-5 mb-4">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {tabs.map(({ key, label, icon: Icon, description, sublabel, activeColor, iconActiveClass }) => {
          const isActive = sortBy === key;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={isActive}
              onClick={() => onSortChange(key)}
              className={`flex flex-col gap-0 py-2.5 sm:py-2.5 px-2.5 sm:px-3 rounded-[14px] min-w-0 transition-all border text-left ${
                isActive
                  ? "bg-primary/[0.12] border-white/[0.15]"
                  : "bg-transparent border-white/[0.06] hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex items-center gap-1 min-w-0">
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? iconActiveClass : "text-muted-foreground"}`} />
                <span className={`font-bold text-[11px] sm:text-sm truncate ${isActive ? activeColor : "text-foreground/75"}`}>{label}</span>
              </div>
              <span className={`text-[10px] sm:text-xs truncate max-w-full leading-tight font-semibold ${isActive ? activeColor : "text-muted-foreground"}`}>
                {sublabel}
              </span>
              <span className="text-[9px] text-muted-foreground hidden sm:block truncate leading-tight mt-0.5">
                {description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
});
FlightSortTabs.displayName = "FlightSortTabs";

export default FlightSortTabs;
