import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet, Zap, Star, Info } from "lucide-react";
import { NormalizedFlight, getFlightStats } from "@/lib/flightNormalizer";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
    return `${symbols[currency] || ""}${Math.round(price).toLocaleString()}`;
  };

  const tabs = [
    {
      key: "best" as const,
      label: "Best",
      icon: Star,
      sublabel: formatPrice(stats.best.price, stats.best.currency),
      tooltip: "Weighted score based on price, duration, and number of stops. Best balance of value and convenience.",
    },
    {
      key: "cheapest" as const,
      label: "Cheapest",
      icon: Wallet,
      sublabel: formatPrice(stats.cheapest.price, stats.cheapest.currency),
      tooltip: "Sorted by lowest price per person.",
    },
    {
      key: "fastest" as const,
      label: "Fastest",
      icon: Zap,
      sublabel: stats.fastest.duration || "—",
      tooltip: "Sorted by shortest total flight duration.",
    },
  ];

  return (
    <TooltipProvider>
      <div className="mb-4">
        <Tabs value={sortBy} onValueChange={(v) => onSortChange(v as typeof sortBy)}>
          <TabsList className="grid w-full grid-cols-3 h-auto p-1 bg-muted/50">
            {tabs.map(({ key, label, icon: Icon, sublabel, tooltip }) => (
              <Tooltip key={key}>
                <TooltipTrigger asChild>
                  <TabsTrigger
                    value={key}
                    className="flex flex-col gap-0.5 py-3 px-2 data-[state=active]:bg-card data-[state=active]:shadow-sm min-w-0 overflow-hidden"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="font-semibold text-sm truncate">{label}</span>
                      {key === "best" && (
                        <Info className="w-3 h-3 text-muted-foreground shrink-0" />
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground truncate max-w-full">{sublabel}</span>
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p className="text-sm">{tooltip}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </TabsList>
        </Tabs>
      </div>
    </TooltipProvider>
  );
};

export default FlightSortTabs;
