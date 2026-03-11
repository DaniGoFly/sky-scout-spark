/**
 * Skyscanner-style Flight Card — Production Polish
 * Responsive: vertical text-only on mobile, rich timeline on tablet+
 * Price intelligence badges, smooth animations, partner disclaimers
 * Color-coded pinned badges: Cheapest (green), Best (purple), Fastest (blue)
 */

import { memo, useState, useRef, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Heart, Plane, Loader2, ExternalLink, Flame, TrendingDown, Minus, TrendingUp, Copy } from "lucide-react";
import { format, parse } from "date-fns";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Flight, getAirlineName, getAirlineLogo, formatDuration, getStopsCount, stopsLabel as resolveStopsLabel } from "@/lib/flightNormalizer";
import type { EnrichedFlight } from "@/lib/flightEnrichment";
import type { PriceIntelligence } from "@/lib/priceIntelligence";
import { resolveDeal } from "@/lib/flightSearchApi";
import { trackFlightClick } from "@/lib/clickTracking";
import { shouldShowScarcity } from "@/lib/scarcityIndicator";
import { sanitizeDealUrl } from "@/lib/urlSanitizer";
import { isFlightSaved, toggleSavedFlight, type SearchContext } from "@/lib/savedFlights";
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
  originSource?: string;
  totalPassengers?: number;
  savedContext?: Pick<SearchContext, "sortBy" | "filters">;
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

/** Extract a formatted date label like "Sun, Apr 12" from a datetime string */
function extractDateLabel(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined;
  try {
    const normalized = raw.includes("T") ? raw : raw.replace(" ", "T");
    const dt = new Date(normalized);
    if (isNaN(dt.getTime())) return undefined;
    return format(dt, "EEE, MMM d");
  } catch {
    return undefined;
  }
}

/** Get badge color config based on label */
function getBadgeConfig(label?: string): { bg: string; text: string; border: string; restBorder: string; hoverClass: string } {
  const cheapest = {
    bg: "bg-emerald-500", text: "text-white",
    border: "border-emerald-400/50",
    restBorder: "border-emerald-400/30",
    hoverClass: "hover:border-emerald-400/70 hover:shadow-[0_10px_28px_rgba(0,0,0,0.35)] hover:-translate-y-0.5",
  };
  if (!label) return cheapest;
  const lower = label.toLowerCase();
  if (lower.includes("cheapest")) return cheapest;
  if (lower.includes("best")) return {
    bg: "bg-blue-500",
    text: "text-white",
    border: "border-blue-400/50",
    restBorder: "border-blue-400/30",
    hoverClass: "hover:border-blue-400/70 hover:shadow-[0_10px_28px_rgba(0,0,0,0.35)] hover:-translate-y-0.5",
  };
  if (lower.includes("fastest")) return {
    bg: "bg-sky-500", text: "text-white",
    border: "border-sky-400/50",
    restBorder: "border-sky-400/30",
    hoverClass: "hover:border-sky-400/70 hover:shadow-[0_10px_28px_rgba(0,0,0,0.35)] hover:-translate-y-0.5",
  };
  return cheapest;
}

/* ─── Sub-components ─── */

const AirlineHeader = memo(({
  logo, name, flightNumber, isBestValue, isMobile, bestLabel, badgeOverride,
}: {
  logo: string; name: string; flightNumber: string; isBestValue: boolean; isMobile: boolean; bestLabel: string; badgeOverride?: string;
}) => {
  const badgeColors = getBadgeConfig(badgeOverride);
  return (
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
        <Badge
          className="text-[10px] px-3 py-0.5 flex-shrink-0 font-semibold rounded-full border-0"
          style={(() => {
            const lower = (badgeOverride || "").toLowerCase();
            if (lower.includes("cheapest")) return {
              background: "#22c55e",
              color: "#ffffff",
              boxShadow: "0 4px 12px rgba(34,197,94,0.35)",
            };
            return {
              background: "#3b82f6",
              color: "#ffffff",
              boxShadow: "0 4px 12px rgba(59,130,246,0.35)",
            };
          })()}
        >{badgeOverride || bestLabel}</Badge>
      )}
    </div>
  );
});
AirlineHeader.displayName = "AirlineHeader";

/** Mobile: text-only compact leg */
const MobileLeg = memo(({
  label, origin, destination, departureTime, arrivalTime, durationMinutes, stopsCount, stopsAirports, stopsLabel, layoverMinutes, dateLabel, arrivalDateLabel,
}: {
  label: string | null; origin: string; destination: string; departureTime: string; arrivalTime: string;
  durationMinutes: number; stopsCount: number | null; stopsAirports: string[]; stopsLabel: string; layoverMinutes?: number; dateLabel?: string; arrivalDateLabel?: string;
}) => {
  const isDirect = stopsLabel === "Direct" || stopsCount === 0;
  const isUnknown = stopsLabel === "Stops unknown";
  const validAirports = isDirect ? [] : (stopsAirports ?? []).filter(s => s && s !== "undefined" && s !== "null");
  const hasLayover = !isDirect && typeof layoverMinutes === "number" && layoverMinutes > 0;
  return (
    <div className="flex flex-col gap-0.5">
      {label && <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</span>}
      <div className="flex items-baseline gap-1.5">
        <p className="text-[15px] font-bold text-foreground leading-snug">
          {safeText(origin, "---")} {safeText(departureTime)} → {safeText(destination, "---")} {safeText(arrivalTime)}
        </p>
      </div>
      {dateLabel && <p className="text-[10px] text-muted-foreground">{dateLabel}</p>}
      <p className={`text-xs font-medium ${isDirect ? "text-green-500" : isUnknown ? "text-muted-foreground" : "text-accent"}`}>
        {stopsLabel} · {formatDuration(durationMinutes)}
        {validAirports.length > 0 && <span className="text-muted-foreground font-normal"> · via {validAirports.join(", ")}</span>}
        {hasLayover && <span className="text-muted-foreground font-normal"> · Layover: {formatDuration(layoverMinutes!)}</span>}
      </p>
    </div>
  );
});
MobileLeg.displayName = "MobileLeg";

/** Desktop/tablet: timeline leg with consistent time/date/airport hierarchy */
const DesktopLeg = memo(({
  label, origin, destination, departureTime, arrivalTime, durationMinutes, stopsCount, stopsAirports, stopsLabel, layoverMinutes, dateLabel, arrivalDateLabel,
}: {
  label: string | null; origin: string; destination: string; departureTime: string; arrivalTime: string;
  durationMinutes: number; stopsCount: number | null; stopsAirports: string[]; stopsLabel: string; layoverMinutes?: number; dateLabel?: string; arrivalDateLabel?: string;
}) => {
  // isDirect: label says "Direct" AND stopsCount is 0 (or unknown/null — trust the label)
  const isDirect = stopsLabel === "Direct" || stopsCount === 0;
  const isUnknown = stopsLabel === "Stops unknown";
  // Only show via/layover when genuinely not direct
  const validAirports = isDirect ? [] : (stopsAirports ?? []).filter(s => s && s !== "undefined" && s !== "null");
  const hasLayover = !isDirect && typeof layoverMinutes === "number" && layoverMinutes > 0;
  return (
    <div className="flex flex-col gap-1">
      {label && <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">{label}</span>}
      <div className="flex items-center gap-3" style={{ minWidth: 0 }}>
        <div className="flex-shrink-0 text-start" style={{ minWidth: "60px" }}>
          <p className="text-xl font-bold text-foreground leading-tight tracking-tight">{safeText(departureTime)}</p>
          {dateLabel && <p className="text-[10px] text-muted-foreground">{dateLabel}</p>}
          <p className="text-xs font-semibold text-muted-foreground uppercase">{safeText(origin, "---")}</p>
        </div>
        <div className="flex-1 flex flex-col items-center px-2" style={{ minWidth: "80px" }}>
          {/* Duration */}
          <span className="text-[11px] text-muted-foreground font-medium mb-1 whitespace-nowrap">{formatDuration(durationMinutes)}</span>
          {/* Plane line */}
          <div className="w-full h-[2px] bg-border relative">
            <div className="absolute start-0 w-1.5 h-1.5 bg-muted-foreground rounded-full -translate-y-[2px]" />
            <Plane className="absolute start-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 text-primary rotate-90 rtl:-rotate-90" />
            <div className="absolute end-0 w-1.5 h-1.5 bg-primary rounded-full -translate-y-[2px]" />
          </div>
          {/* Stop label — no raw stopsCount ever rendered */}
          <span className={`text-[11px] mt-1 font-semibold whitespace-nowrap ${isDirect ? "text-green-500" : isUnknown ? "text-muted-foreground" : "text-accent"}`}>
            {stopsLabel}
          </span>
          {/* via airports — only for non-direct */}
          {validAirports.length > 0 && (
            <span className="text-[10px] text-muted-foreground mt-0.5 whitespace-nowrap">via {validAirports.join(", ")}</span>
          )}
          {/* Layover — only for non-direct */}
          {hasLayover && (
            <span className="text-[10px] text-muted-foreground mt-0.5 whitespace-nowrap">
              Layover: {formatDuration(layoverMinutes!)}
            </span>
          )}
        </div>
        <div className="flex-shrink-0 text-end" style={{ minWidth: "60px" }}>
          <p className="text-xl font-bold text-foreground leading-tight tracking-tight">{safeText(arrivalTime)}</p>
          {(arrivalDateLabel || dateLabel) && <p className="text-[10px] text-muted-foreground">{arrivalDateLabel || dateLabel}</p>}
          <p className="text-xs font-semibold text-muted-foreground uppercase">{safeText(destination, "---")}</p>
        </div>
      </div>
    </div>
  );
});
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

const FlightCard = memo(({ flight, isBestValue = false, badgeLabel, departDate, returnDate: returnDateProp, priceIntel, originSource, totalPassengers = 1, savedContext }: FlightCardProps) => {
  const [isSaved, setIsSaved] = useState(() => isFlightSaved(flight.id));
  const [isResolving, setIsResolving] = useState(false);
  const anchorRef = useRef<HTMLAnchorElement>(null);
  const isMobile = useIsMobile();
  const { t } = useTranslation();
  const { formatPrice, currency: localeCurrency, marketCode } = useLocale();
  const [searchParams] = useSearchParams();

  const badgeColors = getBadgeConfig(badgeLabel);

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

  /**
   * Null-safe stop label — never shows "Direct" when stop data is absent.
   * Falls back to resolveStopsLabel which handles null → "Stops unknown".
   */
  const getLocalizedStopsLabel = useCallback((count: number | null, airports: string[], durationMinutes?: number): string => {
    // null or -1 (sentinel for unknown from enrichment) → delegate to resolveStopsLabel
    if (count === null || count < 0) return resolveStopsLabel(count === null ? null : null, durationMinutes);
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

    const entries = Array.from(searchParams.entries());
    const searchParamsSnapshot = Object.fromEntries(entries);
    const depart = searchParams.get("depart") || departDate || undefined;
    const ret = searchParams.get("return") || returnDateProp || undefined;
    const derivedTripType = (searchParams.get("trip") as "oneway" | "roundtrip") || (ret ? "roundtrip" : "oneway");

    const ctx: SearchContext = {
      tripType: ret ? "roundtrip" : derivedTripType,
      departDate: depart,
      returnDate: ret ?? null,
      adults: Number(searchParams.get("adults")) || 1,
      children: Number(searchParams.get("children")) || 0,
      infants: Number(searchParams.get("infants")) || 0,
      travelClass: searchParams.get("class") || "economy",
      currency: searchParams.get("currency") || localeCurrency || undefined,
      market: searchParams.get("market") || marketCode || undefined,
      sortBy: savedContext?.sortBy,
      searchParams: searchParamsSnapshot,
      filters: savedContext?.filters,
      selection: {
        itineraryId: flight.id,
        outboundItineraryId: flight.id,
        outboundFingerprint: [flight.origin, flight.destination, flight.departureTime, flight.arrivalTime, flight.airlines?.join(","), flight.flightNumbers?.join(",")].filter(Boolean).join("|"),
        inboundFingerprint: flight.return
          ? [flight.return.origin, flight.return.destination, flight.return.departureTime, flight.return.arrivalTime, flight.return.airlines?.join(","), flight.return.flightNumbers?.join(",")].filter(Boolean).join("|")
          : undefined,
        proposalId: flight.proposalId || flight.click_id,
        searchId: flight.searchId || flight.search_id,
        resultsBase: flight.resultsBase || flight.results_base,
      },
    };

    const nowSaved = toggleSavedFlight(flight, ctx);
    setIsSaved(nowSaved);
  }, [flight, searchParams, localeCurrency, marketCode, departDate, returnDateProp, savedContext]);

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
        const safeUrl = sanitizeDealUrl(result.deal_url);
        if (safeUrl) {
          if (newTab && !newTab.closed) { newTab.location.href = safeUrl; }
          else { const a = document.createElement("a"); a.href = safeUrl; a.target = "_blank"; a.rel = "noopener noreferrer"; document.body.appendChild(a); a.click(); document.body.removeChild(a); }
        } else {
          // Malformed URL — offer to copy
          if (newTab && !newTab.closed) newTab.close();
          toast.error("Link may not be secure", {
            description: "The booking link could not be verified. You can copy it manually.",
            action: { label: "Copy link", onClick: () => { navigator.clipboard.writeText(result.deal_url || ""); toast.success("Link copied"); } },
          });
        }
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

  // ── Derive segments: outbound = segments[0], return = segments[1], multi-city = all ──
  const segments = useMemo(() => {
    const raw = (flight as any).segments;
    return Array.isArray(raw) ? raw : [];
  }, [flight]);
  const isMultiCity = segments.length > 2;
  const retSegment = !isMultiCity && segments.length >= 2 ? segments[segments.length - 1] : null;
  const hasReturn = retSegment !== null || flight.return !== undefined;

  const outboundLabel = hasReturn || isMultiCity ? (isMultiCity ? "LEG 1" : t("card.outbound")) : null;

  // ── Outbound data with unified formatting ──
  const outData = useMemo(() => {
    const rawDep = flight.departureTime || "";
    const rawArr = flight.arrivalTime || "";
    return {
      departureTime: extractHHmm(rawDep) || rawDep,
      arrivalTime: extractHHmm(rawArr) || rawArr,
      dateLabel: extractDateLabel(rawDep) || (departDate ? (() => { try { return format(parse(departDate, "yyyy-MM-dd", new Date()), "EEE, MMM d"); } catch { return undefined; } })() : undefined),
      arrivalDateLabel: extractDateLabel(rawArr),
    };
  }, [flight.departureTime, flight.arrivalTime, departDate]);

  // Multi-city: build data for all extra legs (segments[1..n])
  const extraLegs = useMemo(() => {
    if (!isMultiCity) return [];
    return segments.slice(1).map((seg: any, idx: number) => {
      const rawDep = seg.departureTime ?? seg.departure_time ?? seg.departure_at ?? seg.local_departure ?? "";
      const rawArr = seg.arrivalTime ?? seg.arrival_time ?? seg.arrival_at ?? seg.local_arrival ?? "";
      return {
        label: `LEG ${idx + 2}`,
        origin: (seg.origin ?? seg.departure ?? "").toString().toUpperCase().slice(0, 3),
        destination: (seg.destination ?? seg.arrival ?? "").toString().toUpperCase().slice(0, 3),
        departureTime: extractHHmm(rawDep),
        arrivalTime: extractHHmm(rawArr),
        durationMinutes: Number(seg.durationMinutes ?? seg.duration ?? 0),
        stopsCount: getStopsCount(seg),
        stopsAirports: seg.stopsAirports || [],
        dateLabel: extractDateLabel(rawDep),
        arrivalDateLabel: extractDateLabel(rawArr),
      };
    });
  }, [isMultiCity, segments]);

  // Return segment data — SAME formatting pipeline as outbound
  const retData = useMemo(() => {
    if (isMultiCity) return null;
    if (retSegment) {
      const rawDep = retSegment.departureTime ?? retSegment.departure_time ?? retSegment.departure_at ?? retSegment.local_departure ?? "";
      const rawArr = retSegment.arrivalTime ?? retSegment.arrival_time ?? retSegment.arrival_at ?? retSegment.local_arrival ?? "";
      const depTime = extractHHmm(rawDep);
      const arrTime = extractHHmm(rawArr);
      const origin = (retSegment.origin ?? retSegment.departure ?? "").toString().toUpperCase().slice(0, 3);
      const dest = (retSegment.destination ?? retSegment.arrival ?? "").toString().toUpperCase().slice(0, 3);
      const duration = Number(retSegment.durationMinutes ?? retSegment.duration ?? 0);
      const stops = getStopsCount(retSegment);
      const stopsAirports: string[] = retSegment.stopsAirports || [];
      const dateLabel = extractDateLabel(rawDep);
      const arrivalDateLabel = extractDateLabel(rawArr);
      return { origin, destination: dest, departureTime: depTime, arrivalTime: arrTime, durationMinutes: duration, stopsCount: stops, stopsAirports, dateLabel, arrivalDateLabel };
    }
    if (flight.return) {
      const rawDep = flight.return.departureTime || "";
      const rawArr = flight.return.arrivalTime || "";
      return {
        origin: flight.return.origin,
        destination: flight.return.destination,
        departureTime: extractHHmm(rawDep) || flight.return.departureTime,
        arrivalTime: extractHHmm(rawArr) || flight.return.arrivalTime,
        durationMinutes: flight.return.durationMinutes,
        stopsCount: getStopsCount(flight.return as any),
        stopsAirports: flight.return.stopsAirports || [],
        dateLabel: extractDateLabel(rawDep) || (returnDateProp ? (() => { try { return format(parse(returnDateProp, "yyyy-MM-dd", new Date()), "EEE, MMM d"); } catch { return undefined; } })() : undefined),
        arrivalDateLabel: extractDateLabel(rawArr),
      };
    }
    return null;
  }, [isMultiCity, retSegment, flight.return, returnDateProp]);

  // ── Stop labels: backend field is the ONLY source of truth ──
  // Use flight.stopLabel (set by enrichment from API) directly.
  // Never render raw stopsCount as a fallback.
  const resolveStopLabel = (
    apiStopLabel: unknown,
    enrichedLabel: string | undefined,
    count: number | null,
    airports: string[],
    duration?: number,
  ): string => {
    // Only accept non-empty string values — reject numbers, null, undefined, "0"
    if (typeof apiStopLabel === "string" && apiStopLabel.trim() && apiStopLabel !== "0") {
      return apiStopLabel.trim();
    }
    if (typeof enrichedLabel === "string" && enrichedLabel.trim() && enrichedLabel !== "0") {
      return enrichedLabel.trim();
    }
    return getLocalizedStopsLabel(count, airports, duration);
  };

  const outboundStops: string = resolveStopLabel(
    (flight as any).stopLabel,
    isEnriched(flight) ? flight.outboundStopLabel : undefined,
    isEnriched(flight)
      ? (flight.outboundStopsTotal < 0 ? null : flight.outboundStopsTotal)
      : getStopsCount({ stopsCount: flight.stopsCount, stopsAirports: flight.stopsAirports, segments: (flight as any).segments }),
    flight.stopsAirports || [],
    flight.durationMinutes,
  );

  const returnStops: string = retData
    ? resolveStopLabel(
        (retData as any).stopLabel ?? (flight as any).return?.stopLabel,
        isEnriched(flight) ? flight.returnStopLabel : undefined,
        isEnriched(flight)
          ? (flight.returnStopsTotal < 0 ? null : flight.returnStopsTotal)
          : getStopsCount({ stopsCount: retData.stopsCount, stopsAirports: retData.stopsAirports }),
        retData.stopsAirports || [],
        retData.durationMinutes,
      )
    : "";

  // Outbound airports & layover — use backend fields first
  const outboundStopsAirports: string[] =
    (isEnriched(flight) ? flight.outboundStopsAirports : null) ??
    flight.stopsAirports ?? [];

  const returnStopsAirports: string[] =
    (isEnriched(flight) ? flight.returnStopsAirports : null) ??
    retData?.stopsAirports ?? [];

  // Layover: backend totalLayoverMinutes > enrichment > 0
  const outboundLayoverMinutes: number =
    (flight as any).totalLayoverMinutes ??
    (isEnriched(flight) ? flight.outboundLayoverMinutes : 0) ??
    0;

  const returnLayoverMinutes: number =
    (retData as any)?.totalLayoverMinutes ??
    (isEnriched(flight) ? flight.returnLayoverMinutes : 0) ??
    0;

  // outboundStopsCount only used for filtering, never rendered directly
  const outboundStopsCount: number | null = isEnriched(flight)
    ? (flight.outboundStopsTotal < 0 ? null : flight.outboundStopsTotal)
    : flight.stopsCount;

  const apiCurrency = flight.price?.currency;

  const showScarcity = useMemo(() => shouldShowScarcity(
    airlineName, flight.origin || "", flight.destination || ""
  ), [airlineName, flight.origin, flight.destination]);

  /* ═══════ MOBILE LAYOUT — Redesigned for scanning ═══════ */
  if (isMobile) {
    return (
      <div className={`relative bg-card rounded-2xl w-full box-border transition-all duration-200 ease-out active:scale-[0.995] ${isBestValue ? `border-[1.5px] ${badgeColors.border}` : "border border-border/40"}`}
        style={{ contain: "layout style" }}>
        <a ref={anchorRef} className="hidden" target="_blank" rel="noopener noreferrer" />
        
        {/* Top row: badge + save */}
        {isBestValue && (
          <div className="px-4 pt-3 flex items-center justify-between">
            <Badge
              className="text-[10px] px-3 py-0.5 font-semibold rounded-full border-0"
              style={(() => {
                const lower = (badgeLabel || "").toLowerCase();
                if (lower.includes("cheapest")) return { background: "#22c55e", color: "#ffffff", boxShadow: "0 4px 12px rgba(34,197,94,0.25)" };
                return { background: "#3b82f6", color: "#ffffff", boxShadow: "0 4px 12px rgba(59,130,246,0.25)" };
              })()}
            >{badgeLabel || t("card.best_price", "Best Price")}</Badge>
            {saveButton}
          </div>
        )}

        <div className="p-4 pt-3 flex flex-col gap-2.5">
          {/* Airline + Price row — most important info first */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                {airlineLogo ? (
                  <img src={airlineLogo} alt={airlineName} className="w-7 h-7 object-contain" loading="lazy" width={28} height={28}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                ) : (
                  <Plane className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-foreground text-sm truncate">{airlineName || "Airline"}</p>
                {flightNumber && <p className="text-[10px] text-muted-foreground truncate">{flightNumber}</p>}
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className={`text-xl font-bold text-foreground leading-tight ${isBestValue ? "price-pulse" : ""}`}>{formatPrice(flight.price.amount, apiCurrency)}</p>
              <p className="text-[10px] text-muted-foreground">{t("card.per_person")}</p>
            </div>
          </div>

          {originSource && (
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-primary/30 bg-primary/5 w-fit">
              <Plane className="w-3 h-3 text-primary" />
              <span className="text-[10px] text-muted-foreground">{t("card.departing_from")} <span className="font-semibold text-foreground">{originSource}</span></span>
            </div>
          )}

          {/* Outbound leg */}
          <LegComponent label={outboundLabel} origin={flight.origin} destination={flight.destination} departureTime={outData.departureTime} arrivalTime={outData.arrivalTime} durationMinutes={flight.durationMinutes} stopsCount={flight.stopsCount} stopsAirports={flight.stopsAirports} stopsLabel={outboundStops} layoverMinutes={outboundLayoverMinutes} dateLabel={outData.dateLabel} />

          {/* Return leg */}
          {retData && (
            <div className="pt-1.5 border-t border-border/30">
              <LegComponent label={t("card.return")} origin={retData.origin} destination={retData.destination} departureTime={retData.departureTime} arrivalTime={retData.arrivalTime} durationMinutes={retData.durationMinutes} stopsCount={retData.stopsCount} stopsAirports={retData.stopsAirports} stopsLabel={returnStops} layoverMinutes={returnLayoverMinutes} dateLabel={retData.dateLabel} />
            </div>
          )}

          {/* Extra legs (multi-city) */}
          {extraLegs.map((leg, i) => (
            <div key={i} className="pt-1.5 border-t border-border/30">
              <LegComponent label={leg.label} origin={leg.origin} destination={leg.destination} departureTime={leg.departureTime} arrivalTime={leg.arrivalTime} durationMinutes={leg.durationMinutes} stopsCount={leg.stopsCount} stopsAirports={leg.stopsAirports} stopsLabel={getLocalizedStopsLabel(leg.stopsCount, leg.stopsAirports, leg.durationMinutes)} dateLabel={leg.dateLabel} />
            </div>
          ))}

          {/* Price details + intel */}
          {(totalPassengers > 1 || priceIntel || showScarcity) && (
            <div className="flex items-center gap-2 flex-wrap">
              {totalPassengers > 1 && (
                <span className="text-[10px] text-muted-foreground/70">
                  {formatPrice(flight.price.amount * totalPassengers, apiCurrency)} {t("card.total_for", { count: totalPassengers })}
                </span>
              )}
              {priceIntel && <PriceIntelBadge intel={priceIntel} />}
              {showScarcity && (
                <span className="text-[10px] text-amber-500 font-medium">{t("card.scarcity", "Only a few seats left at this price")}</span>
              )}
            </div>
          )}

          {/* CTA row */}
          <div className="flex items-center gap-2 pt-1">
            {!isBestValue && <div className="shrink-0">{saveButton}</div>}
            <div className="flex-1">{ctaButton}</div>
          </div>
          <p className="text-[9px] text-muted-foreground/50 text-center leading-tight -mt-1">{t("card.opens_partner", "Opens partner booking – price may change")}</p>
        </div>
      </div>
    );
  }

  /* ═══════ DESKTOP LAYOUT ═══════ */
  return (
    <div className={`relative bg-card rounded-xl group transition-all duration-200 ease-out focus-within:ring-2 focus-within:ring-primary/60 focus-within:ring-offset-0 ${isBestValue ? `border-[1.5px] ${badgeColors.border} ${badgeColors.hoverClass}` : "border border-border/50 hover:border-primary/50 hover:shadow-[0_10px_28px_rgba(0,0,0,0.18)] hover:-translate-y-0.5 active:-translate-y-0"}`}
      style={{ contain: "layout style" }}>
      {isBestValue && (
        <div className="absolute -top-3 start-5 z-10">
          <Badge
            className="px-3 py-0.5 text-[11px] gap-1 font-semibold rounded-full border-0"
            style={(() => {
              const lower = (badgeLabel || "").toLowerCase();
              if (lower.includes("cheapest")) return {
                background: "#22c55e",
                color: "#ffffff",
                boxShadow: "0 4px 12px rgba(34,197,94,0.35)",
              };
              // "Best" and default
              return {
                background: "#3b82f6",
                color: "#ffffff",
                boxShadow: "0 4px 12px rgba(59,130,246,0.35)",
              };
            })()}
          ><Flame className="w-3 h-3" />{badgeLabel || t("card.best_price", "Best Price")}</Badge>
        </div>
      )}
      <a ref={anchorRef} className="hidden" target="_blank" rel="noopener noreferrer" />
      <div className="p-4 md:p-5">
        <div className="grid gap-4 items-stretch" style={{ gridTemplateColumns: "1fr minmax(180px, 220px)" }}>
          <div className="flex flex-col gap-3 min-w-0">
            <AirlineHeader logo={airlineLogo} name={airlineName} flightNumber={flightNumber} isBestValue={false} isMobile={false} bestLabel={t("card.best")} />
            {originSource && (
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-primary/30 bg-primary/5 w-fit">
                <Plane className="w-3 h-3 text-primary" />
                <span className="text-[11px] text-muted-foreground">{t("card.departing_from")} <span className="font-semibold text-foreground">{originSource}</span></span>
              </div>
            )}
            <LegComponent label={outboundLabel} origin={flight.origin} destination={flight.destination} departureTime={outData.departureTime} arrivalTime={outData.arrivalTime} durationMinutes={flight.durationMinutes} stopsCount={flight.stopsCount} stopsAirports={flight.stopsAirports} stopsLabel={outboundStops} layoverMinutes={outboundLayoverMinutes} dateLabel={outData.dateLabel} arrivalDateLabel={outData.arrivalDateLabel} />
            {retData && (
              <div className="pt-2 border-t border-border/40">
                <LegComponent label={t("card.return")} origin={retData.origin} destination={retData.destination} departureTime={retData.departureTime} arrivalTime={retData.arrivalTime} durationMinutes={retData.durationMinutes} stopsCount={retData.stopsCount} stopsAirports={retData.stopsAirports} stopsLabel={returnStops} layoverMinutes={returnLayoverMinutes} dateLabel={retData.dateLabel} arrivalDateLabel={retData.arrivalDateLabel} />
              </div>
            )}
            {extraLegs.map((leg, i) => (
              <div key={i} className="pt-2 border-t border-border/40">
                <LegComponent label={leg.label} origin={leg.origin} destination={leg.destination} departureTime={leg.departureTime} arrivalTime={leg.arrivalTime} durationMinutes={leg.durationMinutes} stopsCount={leg.stopsCount} stopsAirports={leg.stopsAirports} stopsLabel={getLocalizedStopsLabel(leg.stopsCount, leg.stopsAirports, leg.durationMinutes)} dateLabel={leg.dateLabel} arrivalDateLabel={leg.arrivalDateLabel} />
              </div>
            ))}
          </div>
          <div className="flex flex-col justify-between border-s border-border/40 ps-4 min-w-0">
            <div className="flex flex-col items-end text-end">
              <p className={`text-2xl font-bold text-foreground whitespace-nowrap ${isBestValue ? "price-pulse" : ""}`}>{formatPrice(flight.price.amount, apiCurrency)}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{t("card.per_person")}</p>
              {totalPassengers > 1 && (
                <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                  {formatPrice(flight.price.amount * totalPassengers, apiCurrency)} {t("card.total_for", { count: totalPassengers })}
                </p>
              )}
              {priceIntel && <div className="mt-1"><PriceIntelBadge intel={priceIntel} /></div>}
              {showScarcity && (
                <p className="text-[10px] text-amber-500 font-medium mt-1">{t("card.scarcity", "Only a few seats left at this price")}</p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2 mt-3">
              <div className="flex items-center gap-2">{saveButton}{ctaButton}</div>
              <p className="text-[10px] text-muted-foreground/50 text-end leading-tight">{t("card.opens_partner_short", "Opens partner booking · Price may change")}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
FlightCard.displayName = "FlightCard";

export default FlightCard;
