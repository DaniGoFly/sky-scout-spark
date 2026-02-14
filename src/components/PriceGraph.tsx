/**
 * PriceGraph — real price trend chart using price-trend edge function
 */

import { useState, useEffect, useMemo } from "react";
import { ChevronDown, ChevronUp, TrendingDown, Loader2, Clock } from "lucide-react";
import { fetchPriceTrend, type TrendPoint } from "@/lib/exploreApi";
import { useLocale } from "@/hooks/useLocale";
import { format, addMonths } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface PriceGraphProps {
  origin: string;
  destination: string;
}

const SVG_W = 600;
const SVG_H = 140;
const PADDING_TOP = 20;
const PADDING_BOTTOM = 4;

const PriceGraph = ({ origin, destination }: PriceGraphProps) => {
  const { currency, formatPrice } = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<TrendPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [typicalMin, setTypicalMin] = useState(0);
  const [typicalMax, setTypicalMax] = useState(0);
  const [confidence, setConfidence] = useState<"low" | "medium" | "high">("low");
  const [updatedAt, setUpdatedAt] = useState<string>("");

  const currentMonth = format(new Date(), "yyyy-MM");
  const nextMonth = format(addMonths(new Date(), 1), "yyyy-MM");

  useEffect(() => {
    if (!isOpen || !origin || !destination) return;

    setIsLoading(true);
    Promise.all([
      fetchPriceTrend({ origin, destination, month: currentMonth, currency }),
      fetchPriceTrend({ origin, destination, month: nextMonth, currency }),
    ]).then(([r1, r2]) => {
      const combined = [
        ...(r1.ok ? r1.points : []),
        ...(r2.ok ? r2.points : []),
      ].filter(p => p.price > 0);
      
      // Deduplicate by date
      const seen = new Set<string>();
      const unique = combined.filter(p => {
        if (seen.has(p.date)) return false;
        seen.add(p.date);
        return true;
      });
      unique.sort((a, b) => a.date.localeCompare(b.date));

      setData(unique);

      // Use best stats available
      const best = r1.ok && r1.points.length > 0 ? r1 : r2;
      if (best.ok) {
        setTypicalMin(best.typicalMin);
        setTypicalMax(best.typicalMax);
        setConfidence(best.confidence);
        setUpdatedAt(best.updatedAt);
      }
    }).finally(() => setIsLoading(false));
  }, [isOpen, origin, destination, currentMonth, nextMonth, currency]);

  // Build SVG line chart
  const { linePath, areaPath, minPrice, maxPrice, chartPoints } = useMemo(() => {
    if (data.length < 2) return { linePath: "", areaPath: "", minPrice: 0, maxPrice: 0, chartPoints: [] };

    const prices = data.map(d => d.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;
    const usableH = SVG_H - PADDING_TOP - PADDING_BOTTOM;

    const points = data.map((d, i) => {
      const x = (i / (data.length - 1)) * SVG_W;
      const y = PADDING_TOP + usableH - ((d.price - min) / range) * usableH;
      return { x, y, price: d.price, date: d.date };
    });

    const lineD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    const areaD = `${lineD} L ${points[points.length - 1].x} ${SVG_H} L ${points[0].x} ${SVG_H} Z`;

    return { linePath: lineD, areaPath: areaD, minPrice: min, maxPrice: max, chartPoints: points };
  }, [data]);

  // Typical range band Y coords
  const typicalBand = useMemo(() => {
    if (!data.length || !typicalMin || !typicalMax) return null;
    const prices = data.map(d => d.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;
    const usableH = SVG_H - PADDING_TOP - PADDING_BOTTOM;

    const y1 = PADDING_TOP + usableH - ((typicalMax - min) / range) * usableH;
    const y2 = PADDING_TOP + usableH - ((typicalMin - min) / range) * usableH;
    return { y1: Math.max(0, y1), y2: Math.min(SVG_H, y2) };
  }, [data, typicalMin, typicalMax]);

  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

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
          ) : data.length < 2 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              Not enough historical data yet for this route
            </p>
          ) : (
            <>
              {/* Stats bar */}
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                {typicalMin > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Typical range: <span className="font-semibold text-foreground">{formatPrice(typicalMin)}</span>
                    {" – "}
                    <span className="font-semibold text-foreground">{formatPrice(typicalMax)}</span>
                  </div>
                )}
                <Badge variant="outline" className="text-[10px]">
                  {confidence === "high" ? "High confidence" : confidence === "medium" ? "Medium confidence" : "Limited data"}
                </Badge>
              </div>

              {/* SVG Chart */}
              <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full h-32" preserveAspectRatio="none">
                {/* Typical range band */}
                {typicalBand && (
                  <rect
                    x={0}
                    y={typicalBand.y1}
                    width={SVG_W}
                    height={typicalBand.y2 - typicalBand.y1}
                    className="fill-primary/5"
                  />
                )}

                {/* Area under line */}
                <path d={areaPath} className="fill-primary/10" />

                {/* Line */}
                <path d={linePath} fill="none" className="stroke-primary" strokeWidth={2} strokeLinejoin="round" />

                {/* Hover dots + hit areas */}
                {chartPoints.map((p, i) => (
                  <g key={p.date}>
                    <rect
                      x={p.x - SVG_W / chartPoints.length / 2}
                      y={0}
                      width={SVG_W / chartPoints.length}
                      height={SVG_H}
                      fill="transparent"
                      onMouseEnter={() => setHoveredIdx(i)}
                      onMouseLeave={() => setHoveredIdx(null)}
                    />
                    {hoveredIdx === i && (
                      <circle cx={p.x} cy={p.y} r={4} className="fill-primary" />
                    )}
                  </g>
                ))}
              </svg>

              {/* Axis labels */}
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>{data[0]?.date && format(new Date(data[0].date + "T00:00:00"), "MMM d")}</span>
                {hoveredIdx !== null && chartPoints[hoveredIdx] && (
                  <span className="font-semibold text-foreground">
                    {format(new Date(chartPoints[hoveredIdx].date + "T00:00:00"), "MMM d")}: {formatPrice(chartPoints[hoveredIdx].price)}
                  </span>
                )}
                <span>
                  {data[data.length - 1]?.date && format(new Date(data[data.length - 1].date + "T00:00:00"), "MMM d")}
                </span>
              </div>

              {/* Footer */}
              <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
                <span>Min: <strong className="text-emerald-600">{formatPrice(minPrice)}</strong></span>
                <span>·</span>
                <span>Max: <strong className="text-foreground">{formatPrice(maxPrice)}</strong></span>
                {updatedAt && (
                  <>
                    <span>·</span>
                    <span className="flex items-center gap-0.5">
                      <Clock className="w-3 h-3" />
                      Updated {format(new Date(updatedAt), "MMM d, HH:mm")}
                    </span>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default PriceGraph;
