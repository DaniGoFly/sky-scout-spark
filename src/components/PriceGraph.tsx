/**
 * PriceGraph — Price history chart built ONLY from real stored search data.
 * Queries flight_price_history table. No mock data, no random generation.
 */

import { useState, useEffect, useMemo } from "react";
import { ChevronDown, ChevronUp, TrendingDown, Clock } from "lucide-react";
import { useLocale } from "@/hooks/useLocale";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

interface PriceGraphProps {
  origin: string;
  destination: string;
  departDate?: string;
  returnDate?: string;
  cabinClass?: string;
  adults?: number;
}

interface HistoryRow {
  price: number;
  created_at: string;
}

const SVG_W = 700;
const SVG_H = 160;
const PAD_TOP = 24;
const PAD_BOTTOM = 8;
const PAD_LEFT = 0;
const PAD_RIGHT = 0;

const PriceGraph = ({ origin, destination, departDate, returnDate, cabinClass = "economy", adults = 1 }: PriceGraphProps) => {
  const { currency, formatPrice } = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<HistoryRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !origin || !destination) return;

    setIsLoading(true);

    let query = supabase
      .from("flight_price_history")
      .select("price, created_at")
      .eq("origin", origin.toUpperCase())
      .eq("destination", destination.toUpperCase())
      .eq("currency", currency.toLowerCase())
      .eq("cabin_class", cabinClass)
      .eq("adults", adults)
      .order("created_at", { ascending: true })
      .limit(30);

    if (departDate) query = query.eq("depart_date", departDate);
    if (returnDate) query = query.eq("return_date", returnDate);

    query.then(({ data: rows, error }) => {
      if (error) {
        console.error("[PriceGraph] query error", error);
        setData([]);
      } else {
        setData((rows || []) as HistoryRow[]);
      }
      setIsLoading(false);
    });
  }, [isOpen, origin, destination, currency, cabinClass, adults, departDate, returnDate]);

  const { linePath, areaPath, minPrice, maxPrice, chartPoints } = useMemo(() => {
    if (data.length < 3) return { linePath: "", areaPath: "", minPrice: 0, maxPrice: 0, chartPoints: [] };

    const prices = data.map(d => Number(d.price));
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;
    const usableW = SVG_W - PAD_LEFT - PAD_RIGHT;
    const usableH = SVG_H - PAD_TOP - PAD_BOTTOM;

    const points = data.map((d, i) => {
      const x = PAD_LEFT + (i / (data.length - 1)) * usableW;
      const y = PAD_TOP + usableH - ((Number(d.price) - min) / range) * usableH;
      return { x, y, price: Number(d.price), date: d.created_at };
    });

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

  // Y-axis labels
  const yLabels = useMemo(() => {
    if (data.length < 3) return [];
    const prices = data.map(d => Number(d.price));
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

  // X-axis labels from real created_at timestamps
  const xLabels = useMemo(() => {
    if (data.length < 3) return [];
    const count = Math.min(8, data.length);
    const step = Math.max(1, Math.floor((data.length - 1) / (count - 1)));
    const labels: { date: string; x: number }[] = [];
    const usableW = SVG_W - PAD_LEFT - PAD_RIGHT;
    for (let i = 0; i < data.length; i += step) {
      const x = PAD_LEFT + (i / (data.length - 1)) * usableW;
      try {
        const label = format(new Date(data[i].created_at), "MMM d");
        labels.push({ date: label, x });
      } catch {
        labels.push({ date: "—", x });
      }
    }
    return labels;
  }, [data]);

  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

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
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-40 w-full rounded-lg" />
            </div>
          ) : data.length < 3 ? (
            <div className="py-8 text-center">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <TrendingDown className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-semibold text-foreground mb-1">Not enough historical data yet</p>
              <p className="text-xs text-muted-foreground">
                Price tracking starts after multiple searches on this route.
              </p>
            </div>
          ) : (
            <>
              {/* Stats bar */}
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <div className="text-xs text-muted-foreground">
                  Range: <span className="font-bold text-foreground">{formatPrice(minPrice)}</span>
                  {" – "}
                  <span className="font-bold text-foreground">{formatPrice(maxPrice)}</span>
                </div>
                <Badge variant="outline" className="text-[10px] font-semibold border-muted-foreground/40 text-muted-foreground">
                  {data.length} data points
                </Badge>
              </div>

              {/* SVG Chart */}
              <div className="bg-secondary/20 rounded-xl p-3 relative">
                <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full" style={{ height: "clamp(120px, 20vw, 180px)" }} preserveAspectRatio="none">
                  {yLabels.map((yl, i) => (
                    <line key={i} x1={PAD_LEFT} y1={yl.y} x2={SVG_W} y2={yl.y}
                      stroke="currentColor" className="text-border/50" strokeWidth={0.5} />
                  ))}

                  <defs>
                    <linearGradient id="priceAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2F7AF8" stopOpacity="0.18" />
                      <stop offset="60%" stopColor="#2F7AF8" stopOpacity="0.05" />
                      <stop offset="100%" stopColor="#2F7AF8" stopOpacity="0.02" />
                    </linearGradient>
                  </defs>
                  <path d={areaPath} fill="url(#priceAreaGrad)" />
                  <path d={linePath} fill="none" stroke="#2F7AF8" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />

                  {chartPoints.map((p, i) => (
                    <g key={i}>
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
                          <line x1={p.x} y1={PAD_TOP} x2={p.x} y2={SVG_H - PAD_BOTTOM} stroke="rgba(255,255,255,0.15)" strokeWidth={1} strokeDasharray="3 3" />
                          <circle cx={p.x} cy={p.y} r={5} fill="#2F7AF8" />
                          <circle cx={p.x} cy={p.y} r={2.5} fill="white" />
                        </>
                      )}
                    </g>
                  ))}
                </svg>

                {hoveredIdx !== null && chartPoints[hoveredIdx] && (
                  <div className="absolute top-2 right-3 bg-card/95 backdrop-blur-sm border border-border rounded-lg px-3 py-1.5 shadow-lg">
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(chartPoints[hoveredIdx].date), "MMM d, yyyy HH:mm")}
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
                <span>Low: <strong className="text-primary">{formatPrice(minPrice)}</strong></span>
                <span className="text-border">·</span>
                <span>High: <strong className="text-foreground">{formatPrice(maxPrice)}</strong></span>
                {data.length > 0 && (
                  <>
                    <span className="text-border">·</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Last: {format(new Date(data[data.length - 1].created_at), "MMM d, HH:mm")}
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
