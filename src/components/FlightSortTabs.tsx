import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet, Zap, Star } from "lucide-react";
import { Flight, getFlightStats, formatDuration, formatPrice } from "@/lib/flightNormalizer";

interface FlightSortTabsProps {
  flights: Flight[];
  sortBy: "best" | "cheapest" | "fastest";
  onSortChange: (sort: "best" | "cheapest" | "fastest") => void;
}

const tabs = [
  {
    key: "best" as const,
    label: "Best",
    icon: Star,
    description: "Price, duration & stops",
  },
  {
    key: "cheapest" as const,
    label: "Cheapest",
    icon: Wallet,
    description: "Lowest price",
  },
  {
    key: "fastest" as const,
    label: "Fastest",
    icon: Zap,
    description: "Shortest travel time",
  },
];

const FlightSortTabs = ({ flights, sortBy, onSortChange }: FlightSortTabsProps) => {
  const stats = getFlightStats(flights);
  if (!stats) return null;

  const sublabels: Record<string, string> = {
    best: formatPrice(stats.best.price.amount, stats.best.price.currency),
    cheapest: formatPrice(stats.cheapest.price.amount, stats.cheapest.price.currency),
    fastest: formatDuration(stats.fastest.durationMinutes) || "—",
  };

  return (
    <div className="sticky top-[120px] md:top-[130px] z-20 -mx-4 px-4 py-2 bg-background/90 backdrop-blur-sm">
      <Tabs value={sortBy} onValueChange={(v) => onSortChange(v as typeof sortBy)}>
        <TabsList className="grid w-full grid-cols-3 h-auto p-1 bg-muted/50 rounded-xl">
          {tabs.map(({ key, label, icon: Icon, description }) => (
            <TabsTrigger
              key={key}
              value={key}
              className="flex flex-col gap-0 py-2.5 px-1.5 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-md min-w-0 transition-all"
            >
              <div className="flex items-center gap-1 min-w-0">
                <Icon
                  className={`w-3.5 h-3.5 shrink-0 ${
                    sortBy === key ? "text-primary" : "text-muted-foreground"
                  }`}
                />
                <span className="font-semibold text-xs sm:text-sm truncate">{label}</span>
              </div>
              <span
                className={`text-[10px] sm:text-xs truncate max-w-full leading-tight ${
                  sortBy === key ? "text-primary font-medium" : "text-muted-foreground"
                }`}
              >
                {sublabels[key]}
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
};

export default FlightSortTabs;
