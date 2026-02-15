/**
 * Origin Comparison Panel
 * Shows cheapest price per origin airport when multi-origin search is active.
 * Clicking an origin filters results; click again to reset.
 */

import { useMemo, memo } from "react";
import { Plane, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { EnrichedFlight } from "@/lib/flightEnrichment";

interface OriginComparePanelProps {
  flights: EnrichedFlight[];
  origins: string[];
  selectedOrigin: string | null;
  onSelectOrigin: (origin: string | null) => void;
  formatPrice: (amount: number, currency?: string) => string;
  flightsCurrency?: string;
}

interface OriginStat {
  origin: string;
  cheapest: number;
  count: number;
  diff: number;
  isCheapest: boolean;
}

const OriginComparePanel = memo(({
  flights,
  origins,
  selectedOrigin,
  onSelectOrigin,
  formatPrice,
  flightsCurrency,
}: OriginComparePanelProps) => {
  const isMobile = useIsMobile();

  const stats = useMemo((): OriginStat[] => {
    if (origins.length <= 1) return [];

    const byOrigin = new Map<string, number[]>();
    for (const o of origins) byOrigin.set(o.toUpperCase(), []);

    for (const f of flights) {
      const src = ((f as any).origin_source || f.origin || "").toUpperCase();
      if (byOrigin.has(src)) {
        byOrigin.get(src)!.push(f.price.amount);
      }
    }

    const results: OriginStat[] = [];
    let globalMin = Infinity;

    for (const [origin, prices] of byOrigin) {
      const cheapest = prices.length > 0 ? Math.min(...prices) : Infinity;
      if (cheapest < globalMin) globalMin = cheapest;
      results.push({ origin, cheapest, count: prices.length, diff: 0, isCheapest: false });
    }

    for (const r of results) {
      r.diff = r.cheapest === Infinity ? 0 : Math.round(r.cheapest - globalMin);
      r.isCheapest = r.cheapest === globalMin && r.cheapest !== Infinity;
    }

    results.sort((a, b) => a.cheapest - b.cheapest);
    return results;
  }, [flights, origins]);

  if (stats.length <= 1) return null;

  const content = (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2">
      {stats.map((s) => {
        const isSelected = selectedOrigin === s.origin;
        const isActive = selectedOrigin === null || isSelected;
        return (
          <button
            key={s.origin}
            onClick={() => onSelectOrigin(isSelected ? null : s.origin)}
            className={`relative flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200 text-left
              ${isSelected
                ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                : s.isCheapest
                ? "border-emerald-500/40 bg-emerald-500/5 hover:border-emerald-500/60 hover:bg-emerald-500/10"
                : "border-border/60 bg-card hover:border-border hover:bg-secondary/30"
              }
              ${!isActive && !isSelected ? "opacity-50" : ""}
            `}
          >
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
              s.isCheapest ? "bg-emerald-500/20" : "bg-secondary"
            }`}>
              <span className={`text-xs font-bold ${s.isCheapest ? "text-emerald-400" : "text-muted-foreground"}`}>
                {s.origin}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className={`font-bold text-sm ${s.isCheapest ? "text-emerald-400" : "text-foreground"}`}>
                  {s.cheapest === Infinity ? "—" : formatPrice(s.cheapest, flightsCurrency)}
                </span>
                {s.isCheapest ? (
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] px-1.5 py-0">
                    Cheapest
                  </Badge>
                ) : s.diff > 0 ? (
                  <span className="text-[11px] text-muted-foreground">+{formatPrice(s.diff, flightsCurrency)}</span>
                ) : null}
              </div>
              <span className="text-[11px] text-muted-foreground">
                {s.count} {s.count === 1 ? "result" : "results"}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );

  if (isMobile) {
    return (
      <Collapsible defaultOpen={false}>
        <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-3 bg-card border border-border/60 rounded-xl mb-2">
          <div className="flex items-center gap-2">
            <Plane className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Compare departure airports</span>
            <Badge variant="secondary" className="text-[10px]">{stats.length}</Badge>
          </div>
          <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform [[data-state=open]>&]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent className="mb-3">
          {content}
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Plane className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Compare departure airports</h3>
        {selectedOrigin && (
          <button
            onClick={() => onSelectOrigin(null)}
            className="text-[11px] text-primary hover:underline ml-2"
          >
            Show all
          </button>
        )}
      </div>
      {content}
    </div>
  );
});

OriginComparePanel.displayName = "OriginComparePanel";
export default OriginComparePanel;
