/**
 * PriceInsight — Google Flights-style "Price is low/typical/high" indicator
 * GoFlyFinder dark theme with purple accents
 */

import { useMemo } from "react";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { computePriceInsight } from "@/lib/priceApi";
import { useLocale } from "@/hooks/useLocale";
import { cn } from "@/lib/utils";

interface PriceInsightProps {
  origin: string;
  destination: string;
  currentPrice: number;
  priceCurrency?: string;
}

const PriceInsight = ({ origin, destination, currentPrice, priceCurrency }: PriceInsightProps) => {
  const { currency, formatPrice } = useLocale();

  const insight = useMemo(() =>
    computePriceInsight(origin, destination, currentPrice, priceCurrency || currency),
    [origin, destination, currentPrice, priceCurrency, currency]
  );

  if (!insight) return null;

  const config = {
    low: {
      icon: TrendingDown,
      label: "Prices are low",
      sublabel: "Now is a good time to book",
      color: "text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/20",
      dotColor: "bg-emerald-500",
      dotPosition: "left-[15%]",
    },
    typical: {
      icon: Minus,
      label: "Prices are typical",
      sublabel: "Fairly standard for this route",
      color: "text-amber-400",
      bg: "bg-amber-500/10 border-amber-500/20",
      dotColor: "bg-amber-500",
      dotPosition: "left-[50%]",
    },
    high: {
      icon: TrendingUp,
      label: "Prices are high",
      sublabel: "Consider flexible dates",
      color: "text-red-400",
      bg: "bg-red-500/10 border-red-500/20",
      dotColor: "bg-red-500",
      dotPosition: "left-[85%]",
    },
  }[insight.verdict];

  const Icon = config.icon;

  return (
    <div className={cn("rounded-xl p-4 border flex items-start gap-3", config.bg)}>
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", config.bg)}>
        <Icon className={cn("w-5 h-5", config.color)} />
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-bold", config.color)}>{config.label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{config.sublabel}</p>
        <div className="flex items-center gap-3 mt-2">
          <p className="text-[11px] text-muted-foreground shrink-0">
            {formatPrice(insight.typicalMin, priceCurrency)} – {formatPrice(insight.typicalMax, priceCurrency)}
          </p>
          {/* Range bar with dot indicator */}
          <div className="relative h-2 bg-muted rounded-full flex-1 max-w-[180px]">
            {/* Gradient bar: green → yellow → red */}
            <div className="absolute inset-0 rounded-full overflow-hidden">
              <div className="w-full h-full bg-gradient-to-r from-emerald-500/40 via-amber-500/40 to-red-500/40" />
            </div>
            {/* Current price dot */}
            <div className={cn("absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full border-2 border-card shadow-sm", config.dotColor, config.dotPosition)} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PriceInsight;
