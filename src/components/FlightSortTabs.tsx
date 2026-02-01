import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet, Zap, Star } from "lucide-react";
import { NormalizedFlight, getFlightStats } from "@/lib/flightNormalizer";

interface FlightSortTabsProps {
  flights: NormalizedFlight[];
  sortBy: "best" | "cheapest" | "fastest";
  onSortChange: (sort: "best" | "cheapest" | "fastest") => void;
  fetchedAt?: number;
}

const FlightSortTabs = ({ flights, sortBy, onSortChange, fetchedAt }: FlightSortTabsProps) => {
  const stats = getFlightStats(flights, fetchedAt);

  if (!stats) return null;

  const formatPrice = (price: number, currency: string): string => {
    const symbols: Record<string, string> = {
      EUR: "€",
      USD: "$",
      GBP: "£",
      CHF: "CHF ",
    };
    return `${symbols[currency] || currency + " "}${Math.round(price).toLocaleString()}`;
  };

  const tabs = [
    {
      key: "best" as const,
      label: "Best",
      icon: Star,
      sublabel: formatPrice(stats.best.price, stats.best.currency),
      description: "Best value for money",
    },
    {
      key: "cheapest" as const,
      label: "Cheapest",
      icon: Wallet,
      sublabel: formatPrice(stats.cheapest.price, stats.cheapest.currency),
      description: "Lowest price",
    },
    {
      key: "fastest" as const,
      label: "Fastest",
      icon: Zap,
      sublabel: stats.fastest.duration || "—",
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
