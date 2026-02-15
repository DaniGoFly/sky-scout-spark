/**
 * PriceGraph — Google Flights-style price trend chart
 * Dark background, white line, typical range band, GoFlyFinder purple accents
 * Uses ONLY real data from the price-trend endpoint
 */

import { useState, useEffect, useMemo } from "react";
import { ChevronDown, ChevronUp, TrendingDown, Clock } from "lucide-react";
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

const SVG_W = 700;
const SVG_H = 160;
const PAD_TOP = 24;
const PAD_BOTTOM = 8;
const PAD_LEFT = 0;
const PAD_RIGHT = 0;

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
    const usableW = SVG_W - PAD_LEFT - PAD_RIGHT;
    const usableH = SVG_H - PAD_TOP - PAD_BOTTOM;

    const points = data.map((d, i) => {
      const x = PAD_LEFT + (i / (data.length - 1)) * usableW;
      const y = PAD_TOP + usableH - ((d.price - min) / range) * usableH;
      return { x, y, price: d.price, date: d.date };
    });

    // Smooth curve using cubic bezier
    let lineD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx = (prev.x + curr.x) / 2;
      lineD += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`;
    }

    const areaD = `${lineD} L ${points[points.length - 1].x} ${SVG_H} L ${points[0].x} ${SVG_H} Z`;

    return { linePath: lineD, areaPath: areaD, minPrice: min, maxPrice: max, chartPoints: points };
  }, [data]);

  const typicalBand = useMemo(() => {
    if (!data.length || !typicalMin || !typicalMax) return null;
    const prices = data.map(d => d.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;
    const usableH = SVG_H - PAD_TOP - PAD_BOTTOM;

    const y1 = PAD_TOP + usableH - ((typicalMax - min) / range) * usableH;
    const y2 = PAD_TOP + usableH - ((typicalMin - min) / range) * usableH;
    return { y1: Math.max(0, y1), y2: Math.min(SVG_H, y2) };
  }, [data, typicalMin, typicalMax]);

  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Y-axis labels
  const yLabels = useMemo(() => {
    if (!data.length) return [];
    const prices = data.map(d => d.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;
    const usableH = SVG_H - PAD_TOP - PAD_BOTTOM;
    const steps = 4;
    return Array.from({ length: steps + 1 }, (_, i) => {
      const price = min + (range * i) / steps;
      const y = PAD_TOP + usableH - (i / steps) * usableH;
      return { price, y };
    });
  }, [data]);

  // X-axis labels
  const xLabels = useMemo(() => {
    if (data.length < 2) return [];
    const count = Math.min(8, data.length);
    const step = Math.max(1, Math.floor((data.length - 1) / (count - 1)));
    const labels: { date: string; x: number }[] = [];
    const usableW = SVG_W - PAD_LEFT - PAD_RIGHT;
    for (let i = 0; i < data.length; i += step) {
      const x = PAD_LEFT + (i / (data.length - 1)) * usableW;
      const d = data[i].date;
      try {
        const daysAgo = Math.round((Date.now() - new Date(d + "T00:00:00").getTime()) / 86400000);
        const label = daysAgo <= 0 ? "Today" : daysAgo <= 1 ? "Yesterday" : `${daysAgo}d ago`;
        labels.push({ date: label, x });
      } catch {
        labels.push({ date: d, x });
      }
    }
    return labels;
  }, [data]);

  if (!origin || !destination) return null;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(o => !o)}
        className="w-full px-4 py-3.5 flex items-center justify-between text-sm font-semibold text-foreground hover:bg-secondary/40 transition-colors"
      >
        <span className="flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-primary" />
          Price history for this search
        </span>
        {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {isOpen && (
        <div className="px-4 pb-4">
          {isLoading ? (
            <div className="space-y-3 py-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <Skeleton className="h-40 w-full rounded-lg" />
              <div className="flex justify-between">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ) : data.length < 2 ? (
            <div className="py-8 text-center">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <TrendingDown className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-semibold text-foreground mb-1">Not enough historical data</p>
              <p className="text-xs text-muted-foreground">
                Price trends will appear as more data becomes available for this route.
              </p>
            </div>
          ) : (
            <>
              {/* Stats bar — Google Flights style */}
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                {typicalMin > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Typical range: <span className="font-bold text-foreground">{formatPrice(typicalMin)}</span>
                    {" – "}
                    <span className="font-bold text-foreground">{formatPrice(typicalMax)}</span>
                  </div>
                )}
                <Badge variant="outline" className={cn("text-[10px] font-semibold",
                  confidence === "high" ? "border-emerald-500/40 text-emerald-400" :
                  confidence === "medium" ? "border-amber-500/40 text-amber-400" :
                  "border-muted-foreground/40 text-muted-foreground"
                )}>
                  {confidence === "high" ? "High confidence" : confidence === "medium" ? "Medium confidence" : "Limited data"}
                </Badge>
              </div>

              {/* SVG Chart — Google Flights style: white line, dark bg, subtle grid */}
              <div className="bg-secondary/20 rounded-xl p-3 relative">
                <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full" style={{ height: "clamp(120px, 20vw, 180px)" }} preserveAspectRatio="none">
                  {/* Horizontal grid lines — subtle */}
                  {yLabels.map((yl, i) => (
                    <line key={i} x1={PAD_LEFT} y1={yl.y} x2={SVG_W} y2={yl.y}
                      stroke="currentColor" className="text-border/50" strokeWidth={0.5} />
                  ))}

                  {/* Typical range band — Google Flights uses a light shaded band */}
                  {typicalBand && (
                    <rect
                      x={PAD_LEFT}
                      y={typicalBand.y1}
                      width={SVG_W - PAD_LEFT - PAD_RIGHT}
                      height={Math.max(1, typicalBand.y2 - typicalBand.y1)}
                      fill="hsl(265 90% 65% / 0.08)"
                      stroke="hsl(265 90% 65% / 0.15)"
                      strokeWidth={0.5}
                      strokeDasharray="4 3"
                    />
                  )}

                  {/* Area fill under the line — subtle gradient */}
                  <defs>
                    <linearGradient id="priceAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(265 90% 65%)" stopOpacity="0.15" />
                      <stop offset="100%" stopColor="hsl(265 90% 65%)" stopOpacity="0.01" />
                    </linearGradient>
                  </defs>
                  <path d={areaPath} fill="url(#priceAreaGrad)" />

                  {/* Main line — white/light like Google Flights */}
                  <path d={linePath} fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />

                  {/* Hover crosshair + tooltip */}
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
                          <line x1={p.x} y1={PAD_TOP} x2={p.x} y2={SVG_H - PAD_BOTTOM} stroke="rgba(255,255,255,0.25)" strokeWidth={1} />
                          <circle cx={p.x} cy={p.y} r={6} fill="hsl(265 90% 65%)" opacity={0.3} />
                          <circle cx={p.x} cy={p.y} r={4} fill="hsl(265 90% 65%)" />
                          <circle cx={p.x} cy={p.y} r={2} fill="white" />
                        </>
                      )}
                    </g>
                  ))}
                </svg>

                {/* Hover price tooltip overlay */}
                {hoveredIdx !== null && chartPoints[hoveredIdx] && (
                  <div className="absolute top-2 right-3 bg-card/95 backdrop-blur-sm border border-border rounded-lg px-3 py-1.5 shadow-lg">
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(chartPoints[hoveredIdx].date + "T00:00:00"), "MMM d, yyyy")}
                    </p>
                    <p className="text-sm font-bold text-foreground">
                      {formatPrice(chartPoints[hoveredIdx].price)}
                    </p>
                  </div>
                )}
              </div>

              {/* X-axis labels */}
              <div className="flex justify-between text-[10px] text-muted-foreground mt-2 px-1 overflow-hidden">
                {xLabels.map((l, i) => (
                  <span key={i} className="truncate">{l.date}</span>
                ))}
              </div>

              {/* Footer stats */}
              <div className="flex items-center gap-3 mt-2.5 text-[11px] text-muted-foreground px-1 flex-wrap">
                <span>Low: <strong className="text-emerald-400">{formatPrice(minPrice)}</strong></span>
                <span className="text-border">·</span>
                <span>High: <strong className="text-foreground">{formatPrice(maxPrice)}</strong></span>
                {updatedAt && (
                  <>
                    <span className="text-border">·</span>
                    <span className="flex items-center gap-1">
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
