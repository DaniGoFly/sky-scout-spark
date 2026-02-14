/**
 * Skyscanner-style Flight Card — Production Polish
 * Responsive: vertical text-only on mobile, rich timeline on tablet+
 * Price intelligence badges, smooth animations, partner disclaimers
 */

import { memo, useState, useRef, useCallback, useMemo } from "react";
import { Heart, Plane, Loader2, ExternalLink, Flame, TrendingDown, Minus, TrendingUp } from "lucide-react";
import { format, parse } from "date-fns";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Flight, getAirlineName, getAirlineLogo, formatDuration } from "@/lib/flightNormalizer";
import type { EnrichedFlight } from "@/lib/flightEnrichment";
import type { PriceIntelligence } from "@/lib/priceIntelligence";
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
  departDate?: string;
  returnDate?: string;
  priceIntel?: PriceIntelligence | null;
}

/** Type guard to check if flight has enriched stop data */
function isEnriched(f: Flight | EnrichedFlight): f is EnrichedFlight {
  return "isDirectItinerary" in f && typeof (f as EnrichedFlight).outboundStopsTotal === "number";
}

const safeText = (value: string | undefined | null, fallback = "—"): string => {
  if (!value || value === "undefined" || value === "null") return fallback;
  return value;
};

/** Extract HH:mm from "2026-04-30 17:35", "17:35", or ISO string */
function extractHHmm(raw: string | undefined | null): string {
  if (!raw) return "";
  const match = raw.match(/(\d{2}:\d{2})/);
  if (match) return match[1];
  if (import.meta.env.DEV) console.warn("Time parse failed for:", raw);
  return "";
}

/* ─── Sub-components ─── */

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
      <p className="font-bold text-foreground text-sm truncate">{name || "Airline"}</p>
      {flightNumber && <p className="text-[11px] text-muted-foreground truncate">{flightNumber}</p>}
    </div>
    {isBestValue && isMobile && (
      <Badge className="bg-green-600 text-white text-[10px] px-2 py-0.5 flex-shrink-0">{badgeOverride || bestLabel}</Badge>
    )}
  </div>
));
AirlineHeader.displayName = "AirlineHeader";

/** Mobile: text-only compact leg */
const MobileLeg = memo(({
  label, origin, destination, departureTime, arrivalTime, durationMinutes, stopsCount, stopsAirports, stopsLabel, dateLabel,
}: {
  label: string | null; origin: string; destination: string; departureTime: string; arrivalTime: string;
  durationMinutes: number; stopsCount: number; stopsAirports: string[]; stopsLabel: string; dateLabel?: string;
}) => (
  <div className="flex flex-col gap-0.5">
    {label && <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</span>}
    <div className="flex items-baseline gap-1.5">
      <p className="text-[15px] font-bold text-foreground leading-snug">
        {safeText(origin, "---")} {safeText(departureTime)} → {safeText(destination, "---")} {safeText(arrivalTime)}
      </p>
    </div>
    {dateLabel && <p className="text-[10px] text-muted-foreground">{dateLabel}</p>}
    <p className={`text-xs font-medium ${stopsCount === 0 ? "text-green-500" : "text-accent"}`}>
      {stopsLabel} · {formatDuration(durationMinutes)}
    </p>
  </div>
));
MobileLeg.displayName = "MobileLeg";

/** Desktop/tablet: timeline leg */
const DesktopLeg = memo(({
  label, origin, destination, departureTime, arrivalTime, durationMinutes, stopsCount, stopsAirports, stopsLabel, dateLabel,
}: {
  label: string | null; origin: string; destination: string; departureTime: string; arrivalTime: string;
  durationMinutes: number; stopsCount: number; stopsAirports: string[]; stopsLabel: string; dateLabel?: string;
}) => (
  <div className="flex flex-col gap-1">
    {label && <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">{label}</span>}
    <div className="flex items-center gap-3" style={{ minWidth: 0 }}>
      <div className="flex-shrink-0 text-start" style={{ minWidth: "60px" }}>
        <p className="text-xl font-bold text-foreground leading-tight tracking-tight">{safeText(departureTime)}</p>
        {dateLabel && <p className="text-[10px] text-muted-foreground">{dateLabel}</p>}
        <p className="text-xs font-semibold text-muted-foreground uppercase">{safeText(origin, "---")}</p>
      </div>
      <div className="flex-1 flex flex-col items-center px-2" style={{ minWidth: "80px" }}>
        <span className="text-[11px] text-muted-foreground font-medium mb-1 whitespace-nowrap">{formatDuration(durationMinutes)}</span>
        <div className="w-full h-[2px] bg-border relative">
          <div className="absolute start-0 w-1.5 h-1.5 bg-muted-foreground rounded-full -translate-y-[2px]" />
          <Plane className="absolute start-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 text-primary rotate-90 rtl:-rotate-90" />
          <div className="absolute end-0 w-1.5 h-1.5 bg-primary rounded-full -translate-y-[2px]" />
        </div>
        <span className={`text-[11px] mt-1 font-semibold whitespace-nowrap ${stopsCount === 0 ? "text-green-500" : "text-accent"}`}>
          {stopsLabel}
        </span>
      </div>
      <div className="flex-shrink-0 text-end" style={{ minWidth: "60px" }}>
        <p className="text-xl font-bold text-foreground leading-tight tracking-tight">{safeText(arrivalTime)}</p>
        <p className="text-xs font-semibold text-muted-foreground uppercase">{safeText(destination, "---")}</p>
      </div>
    </div>
  </div>
));
DesktopLeg.displayName = "DesktopLeg";

/** Price Intelligence Badge */
const PriceIntelBadge = memo(({ intel }: { intel: PriceIntelligence }) => {
  const Icon = intel.quality === "great" ? TrendingDown : intel.quality === "high" ? TrendingUp : Minus;
  return (
    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${intel.bgColor} ${intel.color}`}>
      <Icon className="w-3 h-3" />
      <span>{intel.label}</span>
    </div>
  );
});
PriceIntelBadge.displayName = "PriceIntelBadge";

/* ─── Main card ─── */

const FlightCard = memo(({ flight, isBestValue = false, badgeLabel, departDate, returnDate: returnDateProp, priceIntel }: FlightCardProps) => {
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

  // ── Derive segments: outbound = segments[0], return = segments[1] ──
  const segments = useMemo(() => {
    const raw = (flight as any).segments;
    return Array.isArray(raw) ? raw : [];
  }, [flight]);
  const retSegment = segments.length >= 2 ? segments[segments.length - 1] : null;
  const hasReturn = retSegment !== null || flight.return !== undefined;

  const outboundLabel = hasReturn ? t("card.outbound") : null;

  // Return segment data — prefer segments[1], fallback to enriched flight.return
  const retData = useMemo(() => {
    if (retSegment) {
      const depTime = extractHHmm(retSegment.departureTime ?? retSegment.departure_time ?? retSegment.departure_at ?? retSegment.local_departure);
      const arrTime = extractHHmm(retSegment.arrivalTime ?? retSegment.arrival_time ?? retSegment.arrival_at ?? retSegment.local_arrival);
      const origin = (retSegment.origin ?? retSegment.departure ?? "").toString().toUpperCase().slice(0, 3);
      const dest = (retSegment.destination ?? retSegment.arrival ?? "").toString().toUpperCase().slice(0, 3);
      const duration = Number(retSegment.durationMinutes ?? retSegment.duration ?? 0);
      const stops = Number(retSegment.stopsCount ?? 0);
      const stopsAirports: string[] = retSegment.stopsAirports || [];
      return { origin, destination: dest, departureTime: depTime, arrivalTime: arrTime, durationMinutes: duration, stopsCount: stops, stopsAirports };
    }
    if (flight.return) {
      return {
        origin: flight.return.origin,
        destination: flight.return.destination,
        departureTime: extractHHmm(flight.return.departureTime) || flight.return.departureTime,
        arrivalTime: extractHHmm(flight.return.arrivalTime) || flight.return.arrivalTime,
        durationMinutes: flight.return.durationMinutes,
        stopsCount: flight.return.stopsCount,
        stopsAirports: flight.return.stopsAirports || [],
      };
    }
    return null;
  }, [retSegment, flight.return]);

  const outboundDateLabel = useMemo(() => {
    if (!departDate) return undefined;
    try { return format(parse(departDate, "yyyy-MM-dd", new Date()), "EEE, MMM d"); } catch { return undefined; }
  }, [departDate]);
  const returnDateLabel = useMemo(() => {
    if (!returnDateProp) return undefined;
    try { return format(parse(returnDateProp, "yyyy-MM-dd", new Date()), "EEE, MMM d"); } catch { return undefined; }
  }, [returnDateProp]);

  const outboundStopsCount = isEnriched(flight) ? flight.outboundStopsTotal : Math.max(0, flight.stopsCount ?? 0);
  const returnStopsCount = isEnriched(flight)
    ? flight.returnStopsTotal
    : retData ? Math.max(0, retData.stopsCount ?? 0) : 0;

  const outboundStopsAirports = isEnriched(flight) ? flight.outboundStopsAirports : flight.stopsAirports;
  const returnStopsAirports = isEnriched(flight) ? flight.returnStopsAirports : (retData?.stopsAirports || []);

  const outboundStops = getLocalizedStopsLabel(outboundStopsCount, outboundStopsAirports);
  const returnStops = retData ? getLocalizedStopsLabel(returnStopsCount, returnStopsAirports) : "";

  const apiCurrency = flight.price?.currency;

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
          <LegComponent label={outboundLabel} origin={flight.origin} destination={flight.destination} departureTime={flight.departureTime} arrivalTime={flight.arrivalTime} durationMinutes={flight.durationMinutes} stopsCount={flight.stopsCount} stopsAirports={flight.stopsAirports} stopsLabel={outboundStops} dateLabel={outboundDateLabel} />
          {retData && (
            <div className="pt-2 border-t border-border/40">
              <LegComponent label={t("card.return")} origin={retData.origin} destination={retData.destination} departureTime={retData.departureTime} arrivalTime={retData.arrivalTime} durationMinutes={retData.durationMinutes} stopsCount={retData.stopsCount} stopsAirports={retData.stopsAirports} stopsLabel={returnStops} dateLabel={returnDateLabel} />
            </div>
          )}
          <div className="flex items-center justify-between pt-2 border-t border-border/40">
            <div>
              <p className={`text-2xl font-bold text-foreground leading-tight ${isBestValue ? "price-pulse" : ""}`}>{formatPrice(flight.price.amount, apiCurrency)}</p>
              <p className="text-[11px] text-muted-foreground">{t("card.per_person")}</p>
              {priceIntel && <div className="mt-1"><PriceIntelBadge intel={priceIntel} /></div>}
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
            </div>
          )}
          {ctaButton}
          <p className="text-[10px] text-muted-foreground/60 text-center leading-tight">{t("card.opens_partner", "Opens partner booking – price may change")}</p>
        </div>
      </div>
    );
  }

  /* ═══════ DESKTOP LAYOUT ═══════ */
  return (
    <div className={`relative bg-card rounded-xl border group flight-card-hover ${isBestValue ? "border-green-500/60 ring-2 ring-green-500/20" : "border-border"}`}
      style={{ contain: "layout style" }}>
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
            <LegComponent label={outboundLabel} origin={flight.origin} destination={flight.destination} departureTime={flight.departureTime} arrivalTime={flight.arrivalTime} durationMinutes={flight.durationMinutes} stopsCount={flight.stopsCount} stopsAirports={flight.stopsAirports} stopsLabel={outboundStops} dateLabel={outboundDateLabel} />
            {retData && (
              <div className="pt-2 border-t border-border/40">
                <LegComponent label={t("card.return")} origin={retData.origin} destination={retData.destination} departureTime={retData.departureTime} arrivalTime={retData.arrivalTime} durationMinutes={retData.durationMinutes} stopsCount={retData.stopsCount} stopsAirports={retData.stopsAirports} stopsLabel={returnStops} dateLabel={returnDateLabel} />
              </div>
            )}
          </div>
          <div className="flex flex-col justify-between border-s border-border/40 ps-4 min-w-0">
            <div className="flex flex-col items-end text-end">
              <p className={`text-2xl font-bold text-foreground whitespace-nowrap ${isBestValue ? "price-pulse" : ""}`}>{formatPrice(flight.price.amount, apiCurrency)}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{t("card.per_person")}</p>
              {priceIntel && <div className="mt-1"><PriceIntelBadge intel={priceIntel} /></div>}
              <p className="text-[10px] text-muted-foreground/50 mt-0.5">Compared to similar routes</p>
              {showScarcity && (
                <p className="text-[10px] text-amber-500 font-medium mt-1">{t("card.scarcity", "Only a few seats left at this price")}</p>
              )}
              {isBestValue && (
                <p className="text-[10px] text-green-500 font-medium mt-0.5">{t("card.lowest_fare", "Lowest fare available")}</p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2 mt-3">
              <div className="flex items-center gap-2">{saveButton}{ctaButton}</div>
              <p className="text-[10px] text-muted-foreground/50 text-end leading-tight">Opens partner booking – price may change</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
FlightCard.displayName = "FlightCard";

export default FlightCard;
