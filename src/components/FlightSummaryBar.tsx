import { useMemo } from "react";
import { Zap, Wallet, Star, TrendingDown } from "lucide-react";
import { LiveFlight } from "@/hooks/useFlightSearch";

interface FlightSummaryBarProps {
  flights: LiveFlight[];
  sortBy: "best" | "cheapest" | "fastest";
  onSortChange: (sort: "best" | "cheapest" | "fastest") => void;
}

const FlightSummaryBar = ({ flights, sortBy, onSortChange }: FlightSummaryBarProps) => {
  const stats = useMemo(() => {
    if (flights.length === 0) return null;
    
    // Find cheapest flight
    const cheapest = flights.reduce((min, f) => f.price < min.price ? f : min, flights[0]);
    
    // Find fastest flight
    const fastest = flights.reduce((min, f) => f.durationMinutes < min.durationMinutes ? f : min, flights[0]);
    
    // Find best value (lowest price * duration score)
    const best = flights.reduce((best, f) => {
      const score = f.price + f.stops * 50 + f.durationMinutes * 0.5;
      const bestScore = best.price + best.stops * 50 + best.durationMinutes * 0.5;
      return score < bestScore ? f : best;
    }, flights[0]);
    
    return { cheapest, fastest, best };
  }, [flights]);

  if (!stats) return null;

  const options = [
    {
      key: "cheapest" as const,
      label: "Cheapest",
      icon: Wallet,
      flight: stats.cheapest,
      description: "Lowest price",
    },
    {
      key: "best" as const,
      label: "Best",
      icon: Star,
      flight: stats.best,
      description: "Recommended",
    },
    {
      key: "fastest" as const,
      label: "Fastest",
      icon: Zap,
      flight: stats.fastest,
      description: stats.fastest.duration,
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-2 md:gap-4 mb-6">
      {options.map(({ key, label, icon: Icon, flight, description }) => {
        const isActive = sortBy === key;
        return (
          <button
            key={key}
            onClick={() => onSortChange(key)}
            className={`relative p-3 md:p-4 rounded-xl border-2 transition-all text-left ${
              isActive
                ? "border-primary bg-primary/5 shadow-md"
                : "border-border bg-card hover:border-primary/50 hover:bg-card/80"
            }`}
          >
            {key === "best" && (
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <TrendingDown className="w-3 h-3" />
                RECOMMENDED
              </div>
            )}
            <div className="flex items-center gap-2 mb-1">
              <Icon className={`w-4 h-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
              <span className={`font-semibold text-sm ${isActive ? "text-primary" : "text-foreground"}`}>
                {label}
              </span>
            </div>
            <div className={`text-xl md:text-2xl font-bold ${isActive ? "text-foreground" : "text-foreground"}`}>
              ${flight.price}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5 truncate">
              {description}
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default FlightSummaryBar;
