/**
 * PriceInsight — Google Flights-style "Price is low/typical/high" indicator
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
      color: "text-emerald-600",
      bg: "bg-emerald-500/10",
      barColor: "bg-emerald-500",
      barPosition: "left-0",
    },
    typical: {
      icon: Minus,
      label: "Prices are typical",
      color: "text-amber-600",
      bg: "bg-amber-500/10",
      barColor: "bg-amber-500",
      barPosition: "left-1/3",
    },
    high: {
      icon: TrendingUp,
      label: "Prices are high",
      color: "text-red-500",
      bg: "bg-red-500/10",
      barColor: "bg-red-500",
      barPosition: "left-2/3",
    },
  }[insight.verdict];

  const Icon = config.icon;

  return (
    <div className={cn("rounded-xl p-3 flex items-start gap-3", config.bg)}>
      <Icon className={cn("w-5 h-5 mt-0.5 shrink-0", config.color)} />
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-semibold", config.color)}>{config.label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Typical range: {formatPrice(insight.typicalMin, priceCurrency)} – {formatPrice(insight.typicalMax, priceCurrency)}
        </p>
        {/* Visual bar */}
        <div className="relative h-1.5 bg-muted rounded-full mt-2 w-full max-w-[200px]">
          <div className={cn("absolute top-0 h-1.5 w-1/3 rounded-full", config.barColor, config.barPosition)} />
        </div>
      </div>
    </div>
  );
};

export default PriceInsight;
