import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet, Zap, Star } from "lucide-react";
import { NormalizedFlight, getFlightStats } from "@/lib/flightNormalizer";

interface FlightSortTabsProps {
  flights: NormalizedFlight[];
  sortBy: "best" | "cheapest" | "fastest";
  onSortChange: (sort: "best" | "cheapest" | "fastest") => void;
}

const FlightSortTabs = ({ flights, sortBy, onSortChange }: FlightSortTabsProps) => {
  const stats = getFlightStats(flights);

  if (!stats) return null;

  const formatPrice = (price: number, currency: string): string => {
    const symbols: Record<string, string> = {
      EUR: "€",
      USD: "$",
      GBP: "£",
      CHF: "CHF ",
    };
    return `${symbols[currency] || ""}${price.toLocaleString()}`;
  };

  const tabs = [
    {
      key: "best" as const,
      label: "Best",
      icon: Star,
      flight: stats.best,
      sublabel: "Recommended",
    },
    {
      key: "cheapest" as const,
      label: "Cheapest",
      icon: Wallet,
      flight: stats.cheapest,
      sublabel: formatPrice(stats.cheapest.price, stats.cheapest.currency),
    },
    {
      key: "fastest" as const,
      label: "Fastest",
      icon: Zap,
      flight: stats.fastest,
      sublabel: stats.fastest.duration || "—",
    },
  ];

  return (
    <div className="mb-6">
      <Tabs value={sortBy} onValueChange={(v) => onSortChange(v as typeof sortBy)}>
        <TabsList className="grid w-full grid-cols-3 h-auto p-1 bg-muted/50">
          {tabs.map(({ key, label, icon: Icon, sublabel }) => (
            <TabsTrigger
              key={key}
              value={key}
              className="flex flex-col gap-0.5 py-3 px-2 data-[state=active]:bg-card data-[state=active]:shadow-sm"
            >
              <div className="flex items-center gap-1.5">
                <Icon className="w-4 h-4" />
                <span className="font-semibold text-sm">{label}</span>
              </div>
              <span className="text-xs text-muted-foreground">{sublabel}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
};

export default FlightSortTabs;
