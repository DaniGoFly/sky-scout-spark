/**
 * Skyscanner-style Flight Card
 * Wrapped with React.memo to prevent unnecessary re-renders.
 * Responsive: vertical text-only on mobile, rich timeline on tablet+
 * Mobile-safe booking: synchronous tab open + async URL resolution
 * i18n: All labels translated, prices/dates formatted via locale context
 */

import { memo, useState, useRef, useCallback, useMemo } from "react";
import { Heart, Plane, Loader2, ExternalLink, Flame } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Flight, getAirlineName, getAirlineLogo, formatDuration } from "@/lib/flightNormalizer";
import type { EnrichedFlight } from "@/lib/flightEnrichment";
import { resolveDeal } from "@/lib/flightSearchApi";
import { trackFlightClick } from "@/lib/clickTracking";
import { shouldShowScarcity } from "@/lib/scarcityIndicator";
import { useLocale } from "@/hooks/useLocale";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

interface FlightCardProps {
  flight: Flight | EnrichedFlight;
  isBestValue?: boolean;
  badgeLabel?: string;
}

/** Type guard to check if flight has enriched stop data */
function isEnriched(f: Flight | EnrichedFlight): f is EnrichedFlight {
  return "isDirectItinerary" in f && typeof (f as EnrichedFlight).outboundStopsTotal === "number";
}

const safeText = (value: string | undefined | null, fallback = "—"): string => {
  if (!value || value === "undefined" || value === "null") return fallback;
  return value;
};

/* ─── Sub-components (pure, no state) ─── */

const AirlineHeader = memo(({
  logo, name, flightNumber, isBestValue, isMobile, bestLabel, badgeOverride,
}: {
  logo: string; name: string; flightNumber: string; isBestValue: boolean; isMobile: boolean; bestLabel: string; badgeOverride?: string;
}) => (
  <div className="flex items-center gap-3 min-w-0">
    <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
      {logo ? (
        <img src={logo} alt={name} className="w-7 h-7 md:w-8 md:h-8 object-contain" loading="lazy" width={32} height={32}
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
      ) : (
        <Plane className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
      )}
    </div>
    <div className="min-w-0 flex-1">
      <p className="font-medium text-foreground text-sm truncate">{name || "Airline"}</p>
      {flightNumber && <p className="text-xs text-muted-foreground truncate">{flightNumber}</p>}
    </div>
    {isBestValue && isMobile && (
      <Badge className="bg-primary text-primary-foreground text-[10px] px-2 py-0.5 flex-shrink-0">{badgeOverride || bestLabel}</Badge>
    )}
  </div>
));
AirlineHeader.displayName = "AirlineHeader";

/** Mobile: text-only compact leg */
const MobileLeg = memo(({
  label, origin, destination, departureTime, arrivalTime, durationMinutes, stopsCount, stopsAirports, stopsLabel,
}: {
  label: string | null; origin: string; destination: string; departureTime: string; arrivalTime: string;
  durationMinutes: number; stopsCount: number; stopsAirports: string[]; stopsLabel: string;
}) => (
  <div className="flex flex-col gap-0.5">
    {label && <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</span>}
    <p className="text-[15px] font-bold text-foreground leading-snug">
      {safeText(origin, "---")} {safeText(departureTime)} → {safeText(destination, "---")} {safeText(arrivalTime)}
    </p>
    <p className={`text-xs font-medium ${stopsCount === 0 ? "text-green-600" : "text-amber-600"}`}>
      {stopsLabel} · {formatDuration(durationMinutes)}
    </p>
  </div>
));
MobileLeg.displayName = "MobileLeg";

/** Desktop/tablet: timeline leg */
const DesktopLeg = memo(({
  label, origin, destination, departureTime, arrivalTime, durationMinutes, stopsCount, stopsAirports, stopsLabel,
}: {
  label: string | null; origin: string; destination: string; departureTime: string; arrivalTime: string;
  durationMinutes: number; stopsCount: number; stopsAirports: string[]; stopsLabel: string;
}) => (
  <div className="flex flex-col gap-1">
    {label && <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">{label}</span>}
    <div className="flex items-center gap-3" style={{ minWidth: 0 }}>
      <div className="flex-shrink-0 text-start" style={{ minWidth: "56px" }}>
        <p className="text-lg xl:text-xl font-bold text-foreground leading-tight">{safeText(departureTime)}</p>
        <p className="text-xs font-medium text-muted-foreground uppercase">{safeText(origin, "---")}</p>
      </div>
      <div className="flex-1 flex flex-col items-center px-2" style={{ minWidth: "80px" }}>
        <span className="text-[11px] text-muted-foreground font-medium mb-1 whitespace-nowrap">{formatDuration(durationMinutes)}</span>
        <div className="w-full h-[2px] bg-border relative">
          <div className="absolute start-0 w-1.5 h-1.5 bg-muted-foreground rounded-full -translate-y-[2px]" />
          <Plane className="absolute start-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 text-primary rotate-90 rtl:-rotate-90" />
          <div className="absolute end-0 w-1.5 h-1.5 bg-primary rounded-full -translate-y-[2px]" />
        </div>
        <span className={`text-[11px] mt-1 font-medium whitespace-nowrap ${stopsCount === 0 ? "text-green-600" : "text-amber-600"}`}>
          {stopsLabel}
        </span>
      </div>
      <div className="flex-shrink-0 text-end" style={{ minWidth: "56px" }}>
        <p className="text-lg xl:text-xl font-bold text-foreground leading-tight">{safeText(arrivalTime)}</p>
        <p className="text-xs font-medium text-muted-foreground uppercase">{safeText(destination, "---")}</p>
      </div>
    </div>
  </div>
));
DesktopLeg.displayName = "DesktopLeg";

/* ─── Main card ─── */

const FlightCard = memo(({ flight, isBestValue = false, badgeLabel }: FlightCardProps) => {
  const [isSaved, setIsSaved] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const anchorRef = useRef<HTMLAnchorElement>(null);
  const isMobile = useIsMobile();
  const { t } = useTranslation();
  const { formatPrice } = useLocale();

  const { proposalId, searchId, resultsBase, canResolve, airlineName, airlineLogo, flightNumber } = useMemo(() => {
    const pid = flight.proposalId || flight.click_id || "";
    const sid = flight.searchId || flight.search_id || "";
    const rb = flight.resultsBase || flight.results_base || "";
    const code = flight.airlines?.[0] || "";
    return {
      proposalId: pid, searchId: sid, resultsBase: rb,
      canResolve: Boolean(pid && sid),
      airlineName: getAirlineName(code),
      airlineLogo: getAirlineLogo(code),
      flightNumber: flight.flightNumbers?.join(", ") || "",
    };
  }, [flight]);

  const getLocalizedStopsLabel = useCallback((count: number, airports: string[]) => {
    if (count === 0) return t("card.direct");
    const validStops = (airports || []).filter(s => s && s !== "undefined" && s !== "null" && s.trim() !== "");
    if (count === 1) {
      const stopInfo = validStops.length > 0 ? ` · ${validStops[0]}` : "";
      return `${t("card.stop_1")}${stopInfo}`;
    }
    const displayedStops = validStops.slice(0, 2).join(", ");
    const extra = validStops.length > 2 ? ` +${validStops.length - 2}` : "";
    const stopInfo = displayedStops ? ` · ${displayedStops}${extra}` : "";
    return `${t("card.stops_n", { count })}${stopInfo}`;
  }, [t]);

  const handleSave = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsSaved((prev) => {
      const saved = JSON.parse(localStorage.getItem("savedFlights") || "[]");
      if (!prev) saved.push(flight.id);
      else { const idx = saved.indexOf(flight.id); if (idx > -1) saved.splice(idx, 1); }
      localStorage.setItem("savedFlights", JSON.stringify(saved));
      return !prev;
    });
  }, [flight.id]);

  const handleViewDeal = useCallback(async () => {
    if (!canResolve || isResolving) return;
    const newTab = window.open("about:blank", "_blank");
    setIsResolving(true);

    // Track click BEFORE resolving (fire-and-forget)
    trackFlightClick({
      search_id: searchId,
      proposal_id: proposalId,
      airline: airlineName,
      price: flight.price?.amount,
      currency: flight.price?.currency,
      origin: flight.origin,
      destination: flight.destination,
    });

    try {
      const result = await resolveDeal({ search_id: searchId, proposal_id: proposalId, results_base: resultsBase });
      if (result.ok && result.deal_url) {
        if (newTab && !newTab.closed) { newTab.location.href = result.deal_url; }
        else { const a = document.createElement("a"); a.href = result.deal_url; a.target = "_blank"; a.rel = "noopener noreferrer"; document.body.appendChild(a); a.click(); document.body.removeChild(a); }
      } else {
        if (newTab && !newTab.closed) newTab.close();
        toast.error(t("card.deal_error"), { description: t("card.deal_error_desc") });
      }
    } catch {
      if (newTab && !newTab.closed) newTab.close();
      toast.error(t("card.deal_error"), { description: t("card.deal_error_desc") });
    } finally { setIsResolving(false); }
  }, [canResolve, isResolving, searchId, proposalId, resultsBase, t, airlineName, flight]);

  const LegComponent = isMobile ? MobileLeg : DesktopLeg;

  const saveButton = (
    <Button variant="ghost" size="icon" onClick={handleSave}
      className={`h-9 w-9 rounded-full flex-shrink-0 ${isSaved ? "text-red-500" : "text-muted-foreground hover:text-foreground"}`}
      aria-label={isSaved ? t("card.unsave") : t("card.save")}>
      <Heart className={`w-4 h-4 ${isSaved ? "fill-current" : ""}`} />
    </Button>
  );

  const ctaButton = canResolve ? (
    <Button type="button" onClick={handleViewDeal} disabled={isResolving} size="default"
      className={`gap-1.5 font-semibold whitespace-nowrap ${isMobile ? "w-full min-h-[48px] text-base" : "px-5 min-w-[130px]"}`}>
      {isResolving ? (<><Loader2 className="w-4 h-4 animate-spin" /><span>{t("card.opening")}</span></>) : (<><span>{t("card.view_deal")}</span><ExternalLink className="w-3.5 h-3.5" /></>)}
    </Button>
  ) : (
    <TooltipProvider><Tooltip><TooltipTrigger asChild>
      <Button disabled size="default" className={`gap-1 font-semibold whitespace-nowrap opacity-50 ${isMobile ? "w-full min-h-[48px] text-base" : "px-5 min-w-[130px]"}`}>
        <span>{t("card.no_booking")}</span>
      </Button>
    </TooltipTrigger><TooltipContent><p>{t("card.deal_unavailable")}</p></TooltipContent></Tooltip></TooltipProvider>
  );

  const outboundLabel = flight.return ? t("card.outbound") : null;

  // Use enriched canonical stop values when available, otherwise fall back
  const outboundStopsCount = isEnriched(flight) ? flight.outboundStopsTotal : Math.max(0, flight.stopsCount ?? 0);
  const returnStopsCount = isEnriched(flight)
    ? flight.returnStopsTotal
    : flight.return ? Math.max(0, flight.return.stopsCount ?? 0) : 0;

  const outboundStopsAirports = isEnriched(flight) ? flight.outboundStopsAirports : flight.stopsAirports;
  const returnStopsAirports = isEnriched(flight) ? flight.returnStopsAirports : (flight.return?.stopsAirports || []);

  const outboundStops = getLocalizedStopsLabel(outboundStopsCount, outboundStopsAirports);
  const returnStops = flight.return ? getLocalizedStopsLabel(returnStopsCount, returnStopsAirports) : "";

  // DEV: warn if computed isDirectItinerary conflicts with displayed label
  if (process.env.NODE_ENV !== "production" && isEnriched(flight)) {
    if (flight.isDirectItinerary && (outboundStopsCount > 0 || returnStopsCount > 0)) {
      console.warn(`[FlightCard] isDirectItinerary=true but stops=[${outboundStopsCount}, ${returnStopsCount}]`, flight.id);
    }
    if (!flight.isDirectItinerary && outboundStopsCount === 0 && returnStopsCount === 0) {
      console.warn(`[FlightCard] isDirectItinerary=false but stops=[0, 0]`, flight.id);
    }
  }

  // Currency: use API's original currency to prevent mismatched symbols
  const apiCurrency = flight.price?.currency;

  // Scarcity: deterministic per airline+route bucket
  const showScarcity = useMemo(() => shouldShowScarcity(
    airlineName, flight.origin || "", flight.destination || ""
  ), [airlineName, flight.origin, flight.destination]);

  /* ═══════ MOBILE LAYOUT ═══════ */
  if (isMobile) {
    return (
      <div className={`relative bg-card rounded-xl border w-full box-border ${isBestValue ? "border-green-500/60 ring-2 ring-green-500/20" : "border-border"}`}
        style={{ contain: "layout style" }}>
        <a ref={anchorRef} className="hidden" target="_blank" rel="noopener noreferrer" />
        <div className="p-4 flex flex-col gap-3">
          <AirlineHeader logo={airlineLogo} name={airlineName} flightNumber={flightNumber} isBestValue={isBestValue} isMobile bestLabel={t("card.best")} badgeOverride={badgeLabel} />
          <LegComponent label={outboundLabel} origin={flight.origin} destination={flight.destination} departureTime={flight.departureTime} arrivalTime={flight.arrivalTime} durationMinutes={flight.durationMinutes} stopsCount={flight.stopsCount} stopsAirports={flight.stopsAirports} stopsLabel={outboundStops} />
          {flight.return && (
            <div className="pt-2 border-t border-border/40">
              <LegComponent label={t("card.return")} origin={flight.return.origin} destination={flight.return.destination} departureTime={flight.return.departureTime} arrivalTime={flight.return.arrivalTime} durationMinutes={flight.return.durationMinutes} stopsCount={flight.return.stopsCount} stopsAirports={flight.return.stopsAirports} stopsLabel={returnStops} />
            </div>
          )}
          <div className="flex items-center justify-between pt-2 border-t border-border/40">
            <div>
              <p className={`text-2xl font-bold text-foreground leading-tight ${isBestValue ? "price-pulse" : ""}`}>{formatPrice(flight.price.amount, apiCurrency)}</p>
              <p className="text-[11px] text-muted-foreground">{t("card.per_person")}</p>
              {showScarcity && (
                <p className="text-[10px] text-amber-500 font-medium mt-0.5">{t("card.scarcity", "Only a few seats left at this price")}</p>
              )}
            </div>
            {saveButton}
          </div>
          {isBestValue && (
            <div className="flex items-center gap-1.5 text-green-500 text-xs font-medium">
              <Flame className="w-3.5 h-3.5" />
              <span>{t("card.best_price", "Best Price")}</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground font-normal">{t("card.lowest_fare", "Lowest fare available")}</span>
            </div>
          )}
          {ctaButton}
          <p className="text-[10px] text-muted-foreground text-center leading-tight">{t("card.opens_partner")}</p>
        </div>
      </div>
    );
  }

  /* ═══════ DESKTOP LAYOUT ═══════ */
  return (
    <div className={`relative bg-card rounded-xl border hover:shadow-md hover:-translate-y-0.5 group ${isBestValue ? "border-green-500/60 ring-2 ring-green-500/20" : "border-border hover:border-primary/30"}`}
      style={{ contain: "layout style", transition: "box-shadow 0.2s ease, border-color 0.2s ease, transform 0.2s ease" }}>
      {isBestValue && (
        <div className="absolute -top-3 start-5 z-10">
          <Badge className="bg-green-600 text-white shadow-md px-3 py-0.5 text-[11px] gap-1"><Flame className="w-3 h-3" />{badgeLabel || t("card.best_price", "Best Price")}</Badge>
        </div>
      )}
      <a ref={anchorRef} className="hidden" target="_blank" rel="noopener noreferrer" />
      <div className="p-4 lg:p-5">
        <div className="grid gap-4 items-stretch" style={{ gridTemplateColumns: "1fr 220px" }}>
          <div className="flex flex-col gap-3 min-w-0">
            <AirlineHeader logo={airlineLogo} name={airlineName} flightNumber={flightNumber} isBestValue={false} isMobile={false} bestLabel={t("card.best")} />
            <LegComponent label={outboundLabel} origin={flight.origin} destination={flight.destination} departureTime={flight.departureTime} arrivalTime={flight.arrivalTime} durationMinutes={flight.durationMinutes} stopsCount={flight.stopsCount} stopsAirports={flight.stopsAirports} stopsLabel={outboundStops} />
            {flight.return && (
              <div className="pt-2 border-t border-border/40">
                <LegComponent label={t("card.return")} origin={flight.return.origin} destination={flight.return.destination} departureTime={flight.return.departureTime} arrivalTime={flight.return.arrivalTime} durationMinutes={flight.return.durationMinutes} stopsCount={flight.return.stopsCount} stopsAirports={flight.return.stopsAirports} stopsLabel={returnStops} />
              </div>
            )}
          </div>
          <div className="flex flex-col justify-between border-s border-border/40 ps-4 min-w-0">
            <div className="flex flex-col items-end text-end">
              <p className={`text-2xl font-bold text-foreground whitespace-nowrap ${isBestValue ? "price-pulse" : ""}`}>{formatPrice(flight.price.amount, apiCurrency)}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{t("card.per_person")}</p>
              {showScarcity && (
                <p className="text-[10px] text-amber-500 font-medium mt-1">{t("card.scarcity", "Only a few seats left at this price")}</p>
              )}
              {isBestValue && (
                <p className="text-[10px] text-green-500 font-medium mt-0.5">{t("card.lowest_fare", "Lowest fare available")}</p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2 mt-3">
              <div className="flex items-center gap-2">{saveButton}{ctaButton}</div>
              <p className="text-[10px] text-muted-foreground text-end leading-tight">{t("card.opens_partner_short")}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
FlightCard.displayName = "FlightCard";

export default FlightCard;
