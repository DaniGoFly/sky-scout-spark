/**
 * PriceGraph — GoFlyFinder-style price trend chart
 * Dark background, purple highlights, subtle gridlines
 */

import { useState, useEffect, useMemo } from "react";
import { ChevronDown, ChevronUp, TrendingDown, Loader2, Clock } from "lucide-react";
import { fetchPriceTrend, type TrendPoint } from "@/lib/exploreApi";
import { useLocale } from "@/hooks/useLocale";
import { format, addMonths } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

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
      
      const seen = new Set<string>();
      const unique = combined.filter(p => {
        if (seen.has(p.date)) return false;
        seen.add(p.date);
        return true;
      });
      unique.sort((a, b) => a.date.localeCompare(b.date));

      setData(unique);

      const best = r1.ok && r1.points.length > 0 ? r1 : r2;
      if (best.ok) {
        setTypicalMin(best.typicalMin);
        setTypicalMax(best.typicalMax);
        setConfidence(best.confidence);
        setUpdatedAt(best.updatedAt);
      }
    }).finally(() => setIsLoading(false));
  }, [isOpen, origin, destination, currentMonth, nextMonth, currency]);

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
            <div className="space-y-3 py-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <Skeleton className="h-32 w-full rounded-lg" />
              <div className="flex justify-between">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ) : data.length < 2 ? (
            <div className="py-6 text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <TrendingDown className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">Not enough historical data</p>
              <p className="text-xs text-muted-foreground">
                Price trends will appear as more data becomes available for this route.
              </p>
            </div>
          ) : (
            <>
              {/* Stats bar */}
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                {typicalMin > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Typical: <span className="font-semibold text-foreground">{formatPrice(typicalMin)}</span>
                    {" – "}
                    <span className="font-semibold text-foreground">{formatPrice(typicalMax)}</span>
                  </div>
                )}
                <Badge variant="outline" className={cn("text-[10px]",
                  confidence === "high" ? "border-emerald-500/40 text-emerald-400" :
                  confidence === "medium" ? "border-amber-500/40 text-amber-400" :
                  "border-muted-foreground/40 text-muted-foreground"
                )}>
                  {confidence === "high" ? "High confidence" : confidence === "medium" ? "Medium confidence" : "Limited data"}
                </Badge>
              </div>

              {/* SVG Chart */}
              <div className="bg-secondary/30 rounded-lg p-2">
                <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full h-32" preserveAspectRatio="none">
                  {/* Subtle grid lines */}
                  {[0.25, 0.5, 0.75].map(frac => (
                    <line key={frac} x1={0} y1={PADDING_TOP + (SVG_H - PADDING_TOP - PADDING_BOTTOM) * frac} x2={SVG_W} y2={PADDING_TOP + (SVG_H - PADDING_TOP - PADDING_BOTTOM) * frac}
                      stroke="currentColor" className="text-border" strokeWidth={0.5} strokeDasharray="4 4" />
                  ))}

                  {/* Typical range band */}
                  {typicalBand && (
                    <rect
                      x={0}
                      y={typicalBand.y1}
                      width={SVG_W}
                      height={typicalBand.y2 - typicalBand.y1}
                      className="fill-primary/8"
                    />
                  )}

                  {/* Area under line */}
                  <path d={areaPath} className="fill-primary/10" />

                  {/* Line */}
                  <path d={linePath} fill="none" className="stroke-primary" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

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
                        <>
                          <line x1={p.x} y1={PADDING_TOP} x2={p.x} y2={SVG_H - PADDING_BOTTOM} stroke="currentColor" className="text-primary/30" strokeWidth={1} strokeDasharray="3 3" />
                          <circle cx={p.x} cy={p.y} r={5} className="fill-primary" />
                          <circle cx={p.x} cy={p.y} r={3} className="fill-card" />
                        </>
                      )}
                    </g>
                  ))}
                </svg>
              </div>

              {/* Axis labels */}
              <div className="flex justify-between text-[10px] text-muted-foreground mt-2 px-1">
                <span>{data[0]?.date && format(new Date(data[0].date + "T00:00:00"), "MMM d")}</span>
                {hoveredIdx !== null && chartPoints[hoveredIdx] && (
                  <span className="font-semibold text-primary">
                    {format(new Date(chartPoints[hoveredIdx].date + "T00:00:00"), "MMM d")}: {formatPrice(chartPoints[hoveredIdx].price)}
                  </span>
                )}
                <span>
                  {data[data.length - 1]?.date && format(new Date(data[data.length - 1].date + "T00:00:00"), "MMM d")}
                </span>
              </div>

              {/* Footer */}
              <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground px-1">
                <span>Low: <strong className="text-emerald-400">{formatPrice(minPrice)}</strong></span>
                <span>·</span>
                <span>High: <strong className="text-foreground">{formatPrice(maxPrice)}</strong></span>
                {updatedAt && (
                  <>
                    <span>·</span>
                    <span className="flex items-center gap-0.5">
                      <Clock className="w-3 h-3" />
                      {format(new Date(updatedAt), "MMM d, HH:mm")}
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
