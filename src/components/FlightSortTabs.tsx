import { memo } from "react";
import { useTranslation } from "react-i18next";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
      activeColor: "text-emerald-400",
      activeBg: "data-[state=active]:border-emerald-400/60 data-[state=active]:shadow-[0_0_12px_-3px_rgba(52,211,153,0.4)]",
      iconActiveClass: "text-emerald-400",
    },
    {
      key: "best" as const,
      label: t("sort.best"),
      icon: Star,
      description: t("sort.best_desc"),
      sublabel: formatPrice(stats.best.price.amount),
      activeColor: "text-violet-400",
      activeBg: "data-[state=active]:border-violet-400/60 data-[state=active]:shadow-[0_0_12px_-3px_rgba(139,92,246,0.4)]",
      iconActiveClass: "text-violet-400",
    },
    {
      key: "fastest" as const,
      label: t("sort.fastest"),
      icon: Zap,
      description: t("sort.fastest_desc"),
      sublabel: formatDuration(stats.fastest.durationMinutes) || "—",
      activeColor: "text-sky-400",
      activeBg: "data-[state=active]:border-sky-400/60 data-[state=active]:shadow-[0_0_12px_-3px_rgba(56,189,248,0.4)]",
      iconActiveClass: "text-sky-400",
    },
  ];

  return (
    <div className="w-full mt-3 mb-4">
      <Tabs value={sortBy} onValueChange={(v) => onSortChange(v as typeof sortBy)}>
        <TabsList className="grid w-full grid-cols-3 h-auto p-1 bg-muted/50 rounded-xl">
          {tabs.map(({ key, label, icon: Icon, description, sublabel, activeColor, activeBg, iconActiveClass }) => (
            <TabsTrigger
              key={key}
              value={key}
              className={`flex flex-col gap-0 py-2.5 px-1.5 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-lg min-w-0 transition-all border-2 border-transparent ${activeBg}`}
            >
              <div className="flex items-center gap-1 min-w-0">
                <Icon className={`w-3.5 h-3.5 shrink-0 ${sortBy === key ? iconActiveClass : "text-muted-foreground"}`} />
                <span className={`font-bold text-xs sm:text-sm truncate ${sortBy === key ? activeColor : ""}`}>{label}</span>
              </div>
              <span className={`text-[10px] sm:text-xs truncate max-w-full leading-tight font-semibold ${sortBy === key ? activeColor : "text-muted-foreground"}`}>
                {sublabel}
              </span>
              <span className="text-[9px] text-muted-foreground hidden sm:block truncate leading-tight mt-0.5">
                {description}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
});
FlightSortTabs.displayName = "FlightSortTabs";

export default FlightSortTabs;
