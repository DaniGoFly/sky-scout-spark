/**
 * Origin Comparison Panel — Premium polish
 */

import { useMemo, memo } from "react";
import { Plane, ChevronDown, TrendingDown, LayoutList, LayoutGrid } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { EnrichedFlight } from "@/lib/flightEnrichment";

export type OriginViewMode = "all" | "by-origin";

interface OriginComparePanelProps {
  flights: EnrichedFlight[];
  origins: string[];
  selectedOrigin: string | null;
  onSelectOrigin: (origin: string | null) => void;
  formatPrice: (amount: number, currency?: string) => string;
  flightsCurrency?: string;
  viewMode: OriginViewMode;
  onViewModeChange: (mode: OriginViewMode) => void;
}

interface OriginStat {
  origin: string;
  cheapest: number;
  count: number;
  diff: number;
  isCheapest: boolean;
}

const OriginComparePanel = memo(({
  flights, origins, selectedOrigin, onSelectOrigin,
  formatPrice, flightsCurrency, viewMode, onViewModeChange,
}: OriginComparePanelProps) => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();

  const stats = useMemo((): OriginStat[] => {
    if (origins.length <= 1) return [];
    const byOrigin = new Map<string, number[]>();
    for (const o of origins) byOrigin.set(o.toUpperCase(), []);
    for (const f of flights) {
      const src = ((f as any).origin_source || f.origin || "").toUpperCase();
      if (byOrigin.has(src)) byOrigin.get(src)!.push(f.price.amount);
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

  const maxSavings = useMemo(() => {
    if (stats.length < 2) return 0;
    const valid = stats.filter((s) => s.cheapest !== Infinity);
    if (valid.length < 2) return 0;
    return valid[valid.length - 1].cheapest - valid[0].cheapest;
  }, [stats]);

  if (stats.length <= 1) return null;

  const cheapestOrigin = stats.find((s) => s.isCheapest);

  const viewToggle = (
    <div className="flex bg-secondary/60 rounded-lg p-0.5 border border-border/40">
      <button
        onClick={() => onViewModeChange("all")}
        className={`flex items-center gap-1 h-7 px-3 text-[11px] font-medium rounded-md transition-all duration-150 ${
          viewMode === "all"
            ? "bg-card text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <LayoutGrid className="w-3 h-3" />
        {t("compare.all_origins")}
      </button>
      <button
        onClick={() => onViewModeChange("by-origin")}
        className={`flex items-center gap-1 h-7 px-3 text-[11px] font-medium rounded-md transition-all duration-150 ${
          viewMode === "by-origin"
            ? "bg-card text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <LayoutList className="w-3 h-3" />
        {t("compare.by_origin")}
      </button>
    </div>
  );

  const originCards = (
    <div className={`flex gap-2 ${isMobile ? "overflow-x-auto snap-x snap-mandatory pb-1 -mx-1 px-1 scrollbar-none" : "flex-wrap"}`}>
      {stats.map((s) => {
        const isSelected = selectedOrigin === s.origin;
        const isActive = selectedOrigin === null || isSelected;
        return (
          <button
            key={s.origin}
            onClick={() => onSelectOrigin(isSelected ? null : s.origin)}
            className={`relative flex flex-col items-center gap-1 rounded-xl border transition-all duration-200 text-center
              ${isMobile ? "min-w-[100px] snap-start px-3 py-2.5" : "min-w-[110px] px-4 py-3"}
              ${isSelected
                ? "border-primary bg-primary/10 ring-1 ring-primary/30 shadow-sm"
                : s.isCheapest
                ? "border-emerald-500/40 bg-emerald-500/5 hover:border-emerald-500/60 hover:bg-emerald-500/10 hover:shadow-[0_0_12px_-4px_rgba(52,211,153,0.3)]"
                : "border-border/60 bg-card hover:border-border hover:bg-secondary/30 hover:shadow-sm"
              }
              ${!isActive && !isSelected ? "opacity-40" : ""}
            `}
          >
            <span className={`text-sm font-bold tracking-wide ${
              s.isCheapest ? "text-emerald-400" : "text-foreground"
            }`}>
              {s.origin}
            </span>
            <span className={`text-sm font-semibold ${s.isCheapest ? "text-emerald-400" : "text-foreground"}`}>
              {s.cheapest === Infinity ? "—" : formatPrice(s.cheapest, flightsCurrency)}
            </span>
            {s.isCheapest ? (
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[9px] px-1.5 py-0">
                {t("compare.cheapest")}
              </Badge>
            ) : s.diff > 0 ? (
              <span className="text-[10px] text-muted-foreground">+{formatPrice(s.diff, flightsCurrency)}</span>
            ) : null}
            <span className="text-[10px] text-muted-foreground">
              {s.count} {s.count === 1 ? t("compare.result") : t("compare.results")}
            </span>
          </button>
        );
      })}
    </div>
  );

  if (isMobile) {
    return (
      <Collapsible defaultOpen>
        <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-3 bg-card border border-border/60 rounded-xl mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <Plane className="w-4 h-4 text-primary shrink-0" />
            <span className="text-sm font-semibold text-foreground truncate">{t("compare.title")}</span>
            <Badge variant="secondary" className="text-[10px] shrink-0">{stats.length}</Badge>
            {maxSavings > 0 && (
              <span className="text-[10px] text-emerald-400 font-medium truncate">
                {t("compare.save", { amount: formatPrice(maxSavings, flightsCurrency) })}
              </span>
            )}
          </div>
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 transition-transform [[data-state=open]>&]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent className="mb-3 space-y-2.5 px-1">
          <div className="flex justify-between items-center">
            {viewToggle}
            {selectedOrigin && (
              <button onClick={() => onSelectOrigin(null)} className="text-[11px] text-primary hover:underline">
                {t("compare.show_all")}
              </button>
            )}
          </div>
          {originCards}
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    <div className="mb-4 p-4 bg-card/60 border border-border/60 rounded-xl backdrop-blur-sm">
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <Plane className="w-4 h-4 text-primary shrink-0" />
          <h3 className="text-sm font-semibold text-foreground">{t("compare.compare_departure")}</h3>
          {cheapestOrigin && (
            <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] px-2 py-0 gap-1">
              <TrendingDown className="w-3 h-3" />
              {cheapestOrigin.origin} {t("compare.cheapest").toLowerCase()}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3">
          {maxSavings > 0 && (
            <span className="text-xs text-emerald-400 font-medium whitespace-nowrap">
              {t("compare.save_up_to", { amount: formatPrice(maxSavings, flightsCurrency) })}
            </span>
          )}
          {selectedOrigin && (
            <button onClick={() => onSelectOrigin(null)} className="text-[11px] text-primary hover:underline">
              {t("compare.show_all")}
            </button>
          )}
          {viewToggle}
        </div>
      </div>
      {originCards}
    </div>
  );
});

OriginComparePanel.displayName = "OriginComparePanel";
export default OriginComparePanel;
