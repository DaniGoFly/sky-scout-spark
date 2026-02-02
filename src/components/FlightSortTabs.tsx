import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet, Zap, Star } from "lucide-react";
import { Flight, getFlightStats, formatDuration, formatPrice } from "@/lib/flightNormalizer";

interface FlightSortTabsProps {
  flights: Flight[];
  sortBy: "best" | "cheapest" | "fastest";
  onSortChange: (sort: "best" | "cheapest" | "fastest") => void;
}

const FlightSortTabs = ({ flights, sortBy, onSortChange }: FlightSortTabsProps) => {
  const stats = getFlightStats(flights);

  if (!stats) return null;

  const tabs = [
    {
      key: "best" as const,
      label: "Best",
      icon: Star,
      sublabel: formatPrice(stats.best.price.amount, stats.best.price.currency),
      description: "Best value for money",
    },
    {
      key: "cheapest" as const,
      label: "Cheapest",
      icon: Wallet,
      sublabel: formatPrice(stats.cheapest.price.amount, stats.cheapest.price.currency),
      description: "Lowest price",
    },
    {
      key: "fastest" as const,
      label: "Fastest",
      icon: Zap,
      sublabel: formatDuration(stats.fastest.durationMinutes) || "—",
      description: "Shortest flight time",
    },
  ];

  return (
    <div className="mb-4">
      <Tabs value={sortBy} onValueChange={(v) => onSortChange(v as typeof sortBy)}>
        <TabsList className="grid w-full grid-cols-3 h-auto p-1.5 bg-muted/60 rounded-xl">
          {tabs.map(({ key, label, icon: Icon, sublabel }) => (
            <TabsTrigger
              key={key}
              value={key}
              className="flex flex-col gap-0.5 py-3 px-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-md data-[state=active]:border-primary/20 min-w-0 transition-all"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <Icon className={`w-4 h-4 shrink-0 ${sortBy === key ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className="font-semibold text-sm truncate">{label}</span>
              </div>
              <span className={`text-xs truncate max-w-full ${sortBy === key ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                {sublabel}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
};

export default FlightSortTabs;
