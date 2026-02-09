/**
 * PriceGraph — lightweight SVG bar chart for price trends
 */

import { useState, useEffect, useMemo } from "react";
import { ChevronDown, ChevronUp, TrendingDown, Loader2 } from "lucide-react";
import { fetchPriceCalendar, type PriceDay } from "@/lib/priceApi";
import { useLocale } from "@/hooks/useLocale";
import { format, addMonths } from "date-fns";
import { cn } from "@/lib/utils";

interface PriceGraphProps {
  origin: string;
  destination: string;
}

const BAR_COUNT = 30;
const SVG_W = 600;
const SVG_H = 120;
const BAR_GAP = 2;

const PriceGraph = ({ origin, destination }: PriceGraphProps) => {
  const { currency, formatPrice } = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<PriceDay[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const currentMonth = format(new Date(), "yyyy-MM");
  const nextMonth = format(addMonths(new Date(), 1), "yyyy-MM");

  useEffect(() => {
    if (!isOpen || !origin || !destination) return;

    setIsLoading(true);
    Promise.all([
      fetchPriceCalendar({ origin, destination, month: currentMonth, currency }),
      fetchPriceCalendar({ origin, destination, month: nextMonth, currency }),
    ]).then(([r1, r2]) => {
      const combined = [...(r1.ok ? r1.days : []), ...(r2.ok ? r2.days : [])];
      setData(combined.filter(d => d.price !== null).slice(0, BAR_COUNT));
    }).finally(() => setIsLoading(false));
  }, [isOpen, origin, destination, currentMonth, nextMonth, currency]);

  const { bars, minPrice, maxPrice, minDate } = useMemo(() => {
    if (!data.length) return { bars: [], minPrice: 0, maxPrice: 0, minDate: "" };

    const prices = data.map(d => d.price!);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;

    const barWidth = (SVG_W - BAR_GAP * data.length) / data.length;

    const bars = data.map((d, i) => {
      const normalized = (d.price! - min) / range;
      const height = Math.max(4, normalized * (SVG_H - 20));
      const isCheapest = d.price === min;

      return {
        x: i * (barWidth + BAR_GAP),
        y: SVG_H - height,
        width: barWidth,
        height,
        price: d.price!,
        date: d.date,
        isCheapest,
      };
    });

    const cheapest = data.reduce((a, b) => (a.price! < b.price! ? a : b));
    return { bars, minPrice: min, maxPrice: max, minDate: cheapest.date };
  }, [data]);

  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  if (!origin || !destination) return null;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(o => !o)}
        className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium text-foreground hover:bg-secondary/50 transition-colors"
      >
        <span className="flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-primary" />
          Price Trend
        </span>
        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {isOpen && (
        <div className="px-4 pb-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : bars.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No price data available</p>
          ) : (
            <>
              <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full h-28" preserveAspectRatio="none">
                {bars.map((bar, i) => (
                  <rect
                    key={bar.date}
                    x={bar.x}
                    y={bar.y}
                    width={bar.width}
                    height={bar.height}
                    rx={2}
                    className={cn(
                      "transition-colors",
                      hoveredBar === i
                        ? "fill-primary"
                        : bar.isCheapest
                        ? "fill-emerald-500"
                        : "fill-muted-foreground/20"
                    )}
                    onMouseEnter={() => setHoveredBar(i)}
                    onMouseLeave={() => setHoveredBar(null)}
                  />
                ))}
              </svg>
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>{data[0]?.date && format(new Date(data[0].date), "MMM d")}</span>
                {hoveredBar !== null && bars[hoveredBar] && (
                  <span className="font-semibold text-foreground">
                    {format(new Date(bars[hoveredBar].date), "MMM d")}: {formatPrice(bars[hoveredBar].price)}
                  </span>
                )}
                <span>{data[data.length - 1]?.date && format(new Date(data[data.length - 1].date), "MMM d")}</span>
              </div>
              <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                <span>Cheapest: <strong className="text-emerald-600">{formatPrice(minPrice)}</strong> ({minDate})</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default PriceGraph;
