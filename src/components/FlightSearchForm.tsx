import { useState, useCallback, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRightLeft, Search, Globe, CalendarOff, ChevronDown, Navigation, MapPin, Zap, Plane, Shield, CheckCircle2, Wifi, Minus, Plus, Calendar, Users } from "lucide-react";
import { format, addDays } from "date-fns";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import MultiOriginInput, { type AirportSelection } from "./MultiOriginInput";
import FlightDateRangePicker, { CalendarPanel } from "./FlightDateRangePicker";
import TravelersPicker, { TravelersData } from "./TravelersPicker";
import MultiCitySearchForm from "./MultiCitySearchForm";
import NearbyToggle from "./search/NearbyToggle";
import TripLengthSlider from "./search/TripLengthSlider";
import { getDefaultDates } from "@/lib/dateUtils";
import { requestNearestAirport } from "@/lib/nearestAirport";
import { AIRPORTS, getAirportsInRadius } from "@/lib/airports";
import { toast } from "sonner";
import type { AISearchParams } from "./FlightSearchHero";
import { useLocale } from "@/hooks/useLocale";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { OverlayPortal } from "./overlays/OverlayPortal";
import { MobileCalendarModal } from "./overlays/MobileCalendarModal";
import { trackFlightSearch } from "@/lib/metaPixel";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

function TripTypeMenu({ tripType, setTripType, label, t, whitePanel }: {
  tripType: "roundtrip" | "oneway" | "multicity";
  setTripType: (t: "roundtrip" | "oneway" | "multicity") => void;
  label: string;
  t: any;
  whitePanel?: boolean;
}) {
  const options = ["roundtrip", "oneway", "multicity"] as const;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center gap-1.5 px-4 py-1.5 rounded-full border text-sm font-medium transition-all",
            whitePanel
              ? "border-[#E5E7EB] bg-white text-[#111827] hover:border-[#111827]/30 shadow-sm"
              : "border-border/30 text-muted-foreground hover:text-foreground hover:border-border/50"
          )}
        >
          {label} <ChevronDown className={cn("w-3.5 h-3.5", whitePanel ? "text-[#6B7280]" : "text-muted-foreground")} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={8} className="min-w-[160px] bg-card border border-border rounded-xl shadow-xl overflow-hidden p-0">
        {options.map((type) => (
          <DropdownMenuItem
            key={type}
            onSelect={() => setTripType(type)}
            className={cn(
              "px-4 py-2.5 text-sm rounded-none cursor-pointer",
              tripType === type
                ? "bg-primary/15 text-primary font-medium focus:bg-primary/20"
                : "text-foreground focus:bg-secondary"
            )}
          >
            {type === "roundtrip"
              ? t("search.roundtrip")
              : type === "oneway"
                ? t("search.oneway")
                : t("search.multicity")}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface FlightSearchFormProps {
  aiSearchParams?: AISearchParams | null;
  onParamsConsumed?: () => void;
  whitePanel?: boolean;
}

export interface FlightSearchFormHandle {
  openFlexDates: () => void;
}

type TripType = "roundtrip" | "oneway" | "multicity";

const CABIN_LABELS: Record<string, string> = {
  economy: "Economy",
  premium_economy: "Premium Economy",
  business: "Business",
  first: "First",
};

const TRUST_KEYS = [
  { icon: Plane, key: "trust.airlines_count" },
  { icon: Shield, key: "trust.no_hidden_fees" },
  { icon: CheckCircle2, key: "trust.verified_partners" },
  { icon: Wifi, key: "trust.live_updates" },
];

const FlightSearchForm = forwardRef<FlightSearchFormHandle, FlightSearchFormProps>(({ aiSearchParams, onParamsConsumed, whitePanel = false }, ref) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { currency, marketCode } = useLocale();
  const isMobile = useIsMobile();

  const [tripType, setTripType] = useState<TripType>("roundtrip");
  const [origins, setOrigins] = useState<AirportSelection[]>([]);
  const [destinations, setDestinations] = useState<AirportSelection[]>([]);
  const [anywhere, setAnywhere] = useState(false);
  const [departDate, setDepartDate] = useState<Date | null>(null);
  const [returnDate, setReturnDate] = useState<Date | null>(null);
  const [isAnyDay, setIsAnyDay] = useState(false);
  const [tripLength, setTripLength] = useState<[number, number]>([7, 7]);
  const [travelers, setTravelers] = useState<TravelersData>({
    adults: 1, children: 0, infantsSeat: 0, infantsLap: 0, cabinClass: "economy",
  });
  const [directOnly, setDirectOnly] = useState(false);
  const [errors, setErrors] = useState<{ from?: string; to?: string; dates?: string }>({});

  const [fromNearby, setFromNearby] = useState(false);
  const [fromRadius, setFromRadius] = useState(200);
  const [toNearby, setToNearby] = useState(false);
  const [toRadius, setToRadius] = useState(200);
  const userCoordsRef = useRef<{ lat: number; lon: number } | null>(null);
  const toCenterRef = useRef<AirportSelection[]>([]);

  const [departFlexBefore, setDepartFlexBefore] = useState(0);
  const [departFlexAfter, setDepartFlexAfter] = useState(0);
  const [returnFlexBefore, setReturnFlexBefore] = useState(0);
  const [returnFlexAfter, setReturnFlexAfter] = useState(0);

  /* ── Calendar panel open state (lifted) ── */
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarInitialTab, setCalendarInitialTab] = useState<"specific" | "flexible" | undefined>(undefined);

  useImperativeHandle(ref, () => ({
    openFlexDates: () => {
      setIsAnyDay(false);
      setCalendarInitialTab("flexible");
      setCalendarOpen(true);
    },
  }));

  // ── AI params ──
  useEffect(() => {
    if (aiSearchParams) {
      setDestinations([{ code: aiSearchParams.destinationCode, display: aiSearchParams.destinationName }]);
      setErrors(e => ({ ...e, to: undefined }));
      onParamsConsumed?.();
    }
  }, [aiSearchParams, onParamsConsumed]);

  // ── Nearby: From ──
  const fillNearbyOrigins = useCallback((lat: number, lon: number, radius: number) => {
    const nearby = getAirportsInRadius(lat, lon, radius);
    setOrigins(nearby.slice(0, 6).map(a => ({ code: a.code, display: `${a.city} (${a.code})` })));
  }, []);

  const handleFromNearbyToggle = useCallback(async (enabled: boolean) => {
    setFromNearby(enabled);
    if (!enabled) return;

    // On mobile: use selected origin airport coords instead of GPS
    if (isMobile) {
      if (origins.length === 0) {
        toast.info(t("search.select_departure_first", "Please enter a departure airport first"));
        setFromNearby(false);
        return;
      }
      const originAirport = AIRPORTS.find(a => a.code.toUpperCase() === origins[0].code.toUpperCase());
      if (originAirport) {
        fillNearbyOrigins(originAirport.lat, originAirport.lon, fromRadius);
      } else {
        toast.info(t("search.select_departure_first", "Please enter a departure airport first"));
        setFromNearby(false);
      }
      return;
    }

    // Desktop: use GPS as before
    if (userCoordsRef.current) { fillNearbyOrigins(userCoordsRef.current.lat, userCoordsRef.current.lon, fromRadius); return; }
    if (!navigator.geolocation) { setFromNearby(false); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => { userCoordsRef.current = { lat: pos.coords.latitude, lon: pos.coords.longitude }; fillNearbyOrigins(pos.coords.latitude, pos.coords.longitude, fromRadius); },
      (err) => {
        if (import.meta.env.DEV) console.log("[GoFlyFinder] Nearby toggle geo error:", err.code, err.message);
        setFromNearby(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [fromRadius, fillNearbyOrigins, isMobile, origins, t]);

  useEffect(() => {
    if (!fromNearby) return;
    if (isMobile) {
      if (origins.length > 0) {
        const originAirport = AIRPORTS.find(a => a.code.toUpperCase() === origins[0].code.toUpperCase());
        if (originAirport) fillNearbyOrigins(originAirport.lat, originAirport.lon, fromRadius);
      }
    } else if (userCoordsRef.current) {
      fillNearbyOrigins(userCoordsRef.current.lat, userCoordsRef.current.lon, fromRadius);
    }
  }, [fromRadius, fromNearby, fillNearbyOrigins, isMobile, origins]);

  // ── Nearby: To ──
  const expandToNearby = useCallback((centers: AirportSelection[], radius: number) => {
    const expanded: AirportSelection[] = [];
    const seen = new Set<string>();
    for (const dest of centers) {
      if (!seen.has(dest.code)) { expanded.push(dest); seen.add(dest.code); }
      const airport = AIRPORTS.find(a => a.code.toUpperCase() === dest.code.toUpperCase());
      if (airport) {
        for (const a of getAirportsInRadius(airport.lat, airport.lon, radius)) {
          if (!seen.has(a.code)) { expanded.push({ code: a.code, display: `${a.city} (${a.code})` }); seen.add(a.code); }
        }
      }
    }
    setDestinations(expanded.slice(0, 6));
  }, []);

  const handleToNearbyToggle = useCallback((enabled: boolean) => {
    setToNearby(enabled);
    if (!enabled) return;
    if (destinations.length === 0) { toast.info("Select a destination first."); setToNearby(false); return; }
    toCenterRef.current = [...destinations];
    expandToNearby(destinations, toRadius);
  }, [destinations, toRadius, expandToNearby]);

  useEffect(() => {
    if (toNearby && toCenterRef.current.length > 0) expandToNearby(toCenterRef.current, toRadius);
  }, [toRadius, toNearby, expandToNearby]);

  // ── Swap ──
  const swapLocations = useCallback(() => {
    if (origins.length === 1 && destinations.length === 1) {
      const temp = origins[0];
      setOrigins([destinations[0]]);
      setDestinations([temp]);
    }
  }, [origins, destinations]);

  // ── Validation ──
  const validate = useCallback((): boolean => {
    const newErrors: { from?: string; to?: string; dates?: string } = {};
    if (origins.length === 0) newErrors.from = "Please select origin";
    if (!anywhere && destinations.length === 0) newErrors.to = "Please select destination";
    if (!isAnyDay && !departDate) newErrors.dates = "Please select departure date";
    if (!isAnyDay && tripType === "roundtrip" && !returnDate) newErrors.dates = "Please select return date";
    if (!isAnyDay && tripType === "roundtrip" && departDate && returnDate && returnDate <= departDate) newErrors.dates = "Return must be after departure";
    const totalInfants = travelers.infantsSeat + travelers.infantsLap;
    if (totalInfants > travelers.adults) newErrors.dates = "Each infant needs an adult";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [origins, destinations, anywhere, isAnyDay, tripType, returnDate, departDate, travelers]);

  // ── Search ──
  const handleSearch = useCallback(() => {
    if (!validate()) return;
    if (anywhere) { navigate(`/explore?from=${origins.map(o => o.code).join(",")}`); return; }
    const totalInfants = travelers.infantsSeat + travelers.infantsLap;
    const params = new URLSearchParams({
      trip: tripType, from: origins.map(o => o.code).join(","), to: destinations.map(d => d.code).join(","),
      adults: travelers.adults.toString(), children: travelers.children.toString(),
      infants: totalInfants.toString(), class: travelers.cabinClass,
      direct: directOnly.toString(), currency: currency.toUpperCase(), market: marketCode.toUpperCase(),
    });
    if (isAnyDay) {
      const defaultDepart = addDays(new Date(), 14);
      params.set("depart", format(defaultDepart, "yyyy-MM-dd"));
      params.set("anyday", "true");
      params.set("tripmin", tripLength[0].toString());
      params.set("tripmax", tripLength[1].toString());
      if (tripType === "roundtrip") params.set("return", format(addDays(defaultDepart, tripLength[1]), "yyyy-MM-dd"));
      params.set("dfa", "180");
      params.set("dfb", "0");
    } else {
      params.set("depart", format(departDate!, "yyyy-MM-dd"));
      if (tripType === "roundtrip" && returnDate) params.set("return", format(returnDate, "yyyy-MM-dd"));
      if (departFlexBefore > 0) params.set("dfb", departFlexBefore.toString());
      if (departFlexAfter > 0) params.set("dfa", departFlexAfter.toString());
      if (tripType === "roundtrip") {
        if (returnFlexBefore > 0) params.set("rfb", returnFlexBefore.toString());
        if (returnFlexAfter > 0) params.set("rfa", returnFlexAfter.toString());
      }
    }
    trackFlightSearch(params);
    navigate(`/flights/results?${params.toString()}`);
  }, [validate, tripType, origins, destinations, anywhere, isAnyDay, departDate, tripLength, travelers, directOnly, returnDate, navigate, currency, marketCode, departFlexBefore, departFlexAfter, returnFlexBefore, returnFlexAfter]);

  const handleOriginsChange = useCallback((vals: AirportSelection[]) => {
    setOrigins(vals);
    if (fromNearby) setFromNearby(false);
    setErrors(e => ({ ...e, from: undefined }));
  }, [fromNearby]);

  const handleDestinationsChange = useCallback((vals: AirportSelection[]) => {
    setDestinations(vals);
    if (toNearby) toCenterRef.current = vals;
    setErrors(e => ({ ...e, to: undefined }));
  }, [toNearby]);

  const handleDepartChange = useCallback((date: Date | null) => { setDepartDate(date); setErrors(e => ({ ...e, dates: undefined })); }, []);
  const handleReturnChange = useCallback((date: Date | null) => { setReturnDate(date); setErrors(e => ({ ...e, dates: undefined })); }, []);
  const handleTripTypeChange = useCallback((type: "roundtrip" | "oneway") => { setTripType(type); }, []);

  const handleOpenCalendar = useCallback(() => {
    setCalendarOpen(true);
  }, []);

  const handleCloseCalendar = useCallback(() => {
    setCalendarOpen(false);
    setCalendarInitialTab(undefined);
  }, []);

  const handleMultiCitySearch = useCallback((segments: any[], travelersData: TravelersData) => {
    const validSegments = segments.filter(seg => seg.from?.code && seg.to?.code && seg.date);
    if (validSegments.length < 2) return;
    const params = new URLSearchParams({
      trip: "multicity", adults: travelersData.adults.toString(),
      children: travelersData.children.toString(),
      infants: (travelersData.infantsSeat + travelersData.infantsLap).toString(),
      class: travelersData.cabinClass,
    });
    validSegments.forEach((seg, i) => {
      params.set(`seg${i}_from`, seg.from.code);
      params.set(`seg${i}_to`, seg.to.code);
      params.set(`seg${i}_date`, format(seg.date, "yyyy-MM-dd"));
    });
    params.set("segments", validSegments.length.toString());
    navigate(`/flights/multicity?${params.toString()}`);
  }, [navigate]);

  /* ── My location handler — must be before early return ── */
  const handleUseMyLocation = useCallback(async () => {
    const result = await requestNearestAirport();
    if (result) {
      userCoordsRef.current = { lat: result.airport.lat, lon: result.airport.lon };
      setOrigins([{ code: result.airport.code, display: `${result.airport.city} (${result.airport.code})` }]);
      setErrors(e => ({ ...e, from: undefined }));
    }
  }, []);

  const tripTypeLabel = tripType === "roundtrip" ? t("search.roundtrip") : tripType === "oneway" ? t("search.oneway") : t("search.multicity");

  // Display values
  const departDisplay = isAnyDay ? t("search.any_day") : departDate ? format(departDate, "d MMM") : t("search_form.select_date");
  const returnDisplay = isAnyDay ? t("search.any_day") : returnDate ? format(returnDate, "d MMM") : t("search_form.select_date");
  const totalPax = travelers.adults + travelers.children + travelers.infantsSeat;
  const travelersDisplay = totalPax === 1 ? t("search_form.travelers_count", { count: totalPax }) : t("search_form.travelers_count_plural", { count: totalPax });


  // ── Multi-city mode ──
  if (tripType === "multicity") {
    return (
      <div className="w-full">
        <div className="flex items-center gap-2 mb-4">
          <TripTypeMenu tripType={tripType} setTripType={setTripType} label={tripTypeLabel} t={t} whitePanel={whitePanel} />
        </div>
        <MultiCitySearchForm onSearch={handleMultiCitySearch} whitePanel={whitePanel} />
      </div>
    );
  }

  const errRing = (has?: boolean) => has ? "ring-2 ring-destructive/40" : "";

  /* ── Segment style tokens ── */
  const SEG_LABEL = whitePanel
    ? "text-[10px] font-semibold text-[#111827] uppercase tracking-[0.12em] leading-none"
    : "text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-[0.12em] leading-none";
  const SEG_VALUE = whitePanel
    ? "text-[14px] font-semibold text-[#111827] leading-[20px] whitespace-nowrap"
    : "text-[14px] font-semibold text-foreground leading-[20px] whitespace-nowrap";
  const SEG_PLACEHOLDER = whitePanel
    ? "text-[14px] font-normal text-[#4B5563] leading-[20px] whitespace-nowrap"
    : "text-[14px] font-normal text-muted-foreground/40 leading-[20px] whitespace-nowrap";


  return (
    <div className="w-full max-w-[1160px] mx-auto space-y-5 overflow-visible">
      {/* ── Trip type pill ── */}
      <div className="flex items-center justify-start gap-3">
        <TripTypeMenu tripType={tripType} setTripType={setTripType} label={tripTypeLabel} t={t} />
      </div>

      {/* ═══════════════════════════════════════════
          SIGNATURE SEARCH BAR + CALENDAR
          ═══════════════════════════════════════════ */}
      <div className="relative overflow-visible">
        {/* Search bar */}
        <div
          className={cn(
            "w-full min-w-0 max-w-full border border-border/10 bg-background/60 shadow-[0_1px_8px_rgba(0,0,0,0.08)] relative z-20 backdrop-blur-sm xl:h-[94px] overflow-visible",
            calendarOpen ? "rounded-t-2xl" : "rounded-2xl",
          )}
        >
          {/* Desktop: fixed slot grid */}
          <div className={cn(
            "hidden xl:grid h-full items-stretch overflow-visible",
            tripType === "oneway"
              ? "grid-cols-[minmax(200px,1.2fr)_40px_minmax(200px,1.2fr)_minmax(160px,0.8fr)_minmax(200px,1fr)_minmax(150px,170px)]"
              : "grid-cols-[minmax(180px,205px)_40px_minmax(180px,205px)_minmax(280px,320px)_minmax(190px,220px)_minmax(150px,170px)]"
          )}>
            {/* FROM */}
            <div className={`min-w-0 px-5 py-3 rounded-l-2xl transition-colors hover:bg-secondary/60 flex flex-col justify-center overflow-visible ${errRing(!!errors.from)}`}>
              <span className={SEG_LABEL}>{t("search.from")}</span>
              <div className="mt-1.5"><MultiOriginInput
                values={origins}
                onChange={handleOriginsChange}
                placeholder={t("search_form.placeholder_airport")}
                bare
              /></div>
            </div>

            {/* SWAP */}
            <div className="flex items-center justify-center relative z-30">
              <button
                type="button"
                onClick={swapLocations}
                disabled={origins.length !== 1 || destinations.length !== 1 || anywhere}
                className="w-[32px] h-[32px] rounded-full border border-border/40 bg-card flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/30 hover:scale-105 disabled:opacity-20 transition-all cursor-pointer shadow-sm"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* TO */}
            <div className={`min-w-0 px-5 py-3 transition-colors hover:bg-secondary/60 flex flex-col justify-center overflow-visible ${errRing(!!errors.to)}`}>
              <span className={SEG_LABEL}>{t("search.to")}</span>
              <div className="mt-1.5">{anywhere ? (
                <div className="flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-primary shrink-0" />
                  <span className={SEG_VALUE}>{t("search_form.everywhere")}</span>
                </div>
              ) : (
                <MultiOriginInput
                  values={destinations}
                  onChange={handleDestinationsChange}
                  placeholder={t("search_form.placeholder_airport")}
                  multiLabel={t("search_form.multi_destination")}
                  bare
                />
              )}</div>
            </div>

            {/* DATES SLOT (fixed width) */}
            {isAnyDay ? (
              <div className={`h-full w-full px-5 py-3 flex flex-col justify-center transition-colors hover:bg-secondary/60 border-l border-border/20 ${errRing(!!errors.dates)}`}>
                <span className={SEG_LABEL}>{t("search_form.trip_length")}</span>
                {tripType === "roundtrip" ? (
                  <TripLengthSlider value={tripLength} onChange={setTripLength} />
                ) : (
                  <span className={`${SEG_PLACEHOLDER} text-[13px]`}>{t("search_form.flexible_departure")}</span>
                )}
              </div>
            ) : (
              <div className={`h-full w-full transition-colors hover:bg-secondary/60 border-l border-border/20 ${errRing(!!errors.dates)}`}>
              {tripType === "roundtrip" ? (
                <div className="grid h-full grid-cols-2 items-stretch">
                  <div className="px-5 py-3 relative z-30 border-r border-border/20 flex flex-col justify-center">
                    <FlightDateRangePicker
                      departDate={departDate}
                      returnDate={returnDate}
                      onDepartChange={handleDepartChange}
                      onReturnChange={handleReturnChange}
                      tripType={tripType as "roundtrip" | "oneway"}
                      onTripTypeChange={handleTripTypeChange}
                      hasError={!!errors.dates}
                      bare
                      segmentMode
                      segmentLabel={t("calendar.depart")}
                      segmentDisplay={departDisplay}
                      onOpenCalendar={handleOpenCalendar}
                    />
                  </div>
                  <div className="px-5 py-3 relative z-30 flex flex-col justify-center">
                    <FlightDateRangePicker
                      departDate={departDate}
                      returnDate={returnDate}
                      onDepartChange={handleDepartChange}
                      onReturnChange={handleReturnChange}
                      tripType={tripType as "roundtrip" | "oneway"}
                      onTripTypeChange={handleTripTypeChange}
                      hasError={!!errors.dates}
                      bare
                      segmentMode
                      segmentLabel={t("calendar.return", "Return")}
                      segmentDisplay={returnDisplay}
                      onOpenCalendar={handleOpenCalendar}
                    />
                  </div>
                </div>
              ) : (
                <div className="h-full px-5 py-3 relative z-30 flex flex-col justify-center">
                  <FlightDateRangePicker
                    departDate={departDate}
                    returnDate={returnDate}
                    onDepartChange={handleDepartChange}
                    onReturnChange={handleReturnChange}
                    tripType={tripType as "roundtrip" | "oneway"}
                    onTripTypeChange={handleTripTypeChange}
                    hasError={!!errors.dates}
                    bare
                    segmentMode
                    segmentLabel={t("calendar.depart")}
                    segmentDisplay={departDisplay}
                    onOpenCalendar={handleOpenCalendar}
                  />
                </div>
              )}
              </div>
            )}

            {/* TRAVELERS */}
            <div className="w-full px-5 py-3 transition-colors hover:bg-secondary/60 border-l border-border/20 cursor-pointer flex flex-col justify-center">
              <TravelersPicker value={travelers} onChange={setTravelers} compact bare segmentMode />
            </div>

            {/* SEARCH BUTTON */}
            <button
              type="button"
              onClick={handleSearch}
              className={cn(
                "w-full flex items-center justify-center gap-2.5 px-8 bg-gradient-to-b from-primary to-[hsl(220_80%_46%)] text-primary-foreground font-semibold text-[15px] hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer",
                calendarOpen ? "rounded-tr-2xl" : "rounded-r-2xl"
              )}
            >
              <Search className="w-5 h-5" />
              <span className="hidden xl:inline">{t("search.search")}</span>
            </button>
          </div>

          {/* ═══════════════════════════════════════════
              MOBILE/TABLET: Clean stacked search card
              ═══════════════════════════════════════════ */}
          <div className="xl:hidden flex flex-col gap-0">
            <div className="rounded-2xl border border-border/20 bg-card/40 backdrop-blur-sm overflow-visible">
              {/* FROM row */}
              <div className={`departure-input-container flex items-center gap-3 px-4 min-h-[52px] ${errRing(!!errors.from)}`}>
                <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                <div className="flex-1 min-w-0">
                  <MultiOriginInput
                    values={origins}
                    onChange={handleOriginsChange}
                    placeholder={t("search_form.placeholder_airport")}
                    bare
                  />
                </div>
                {/* Swap button */}
                <div className="departure-input-actions flex items-center shrink-0">
                  <button type="button" onClick={swapLocations}
                    disabled={origins.length !== 1 || destinations.length !== 1 || anywhere}
                    className="w-9 h-9 rounded-full border border-border/30 bg-card flex items-center justify-center text-muted-foreground hover:text-primary disabled:opacity-20 transition-all shadow-sm active:scale-95"
                    aria-label="Swap"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5 rotate-90" />
                  </button>
                </div>
              </div>

              <div className="h-px bg-border/15 mx-4" />

              {/* TO row */}
              <div className={`flex items-center gap-3 px-4 min-h-[52px] ${errRing(!!errors.to)}`}>
                <MapPin className="w-4 h-4 text-muted-foreground/30 shrink-0" />
                <div className="flex-1 min-w-0 pr-10">
                  {anywhere ? (
                    <div className="flex items-center gap-1.5 min-h-[28px]">
                      <Globe className="w-4 h-4 text-primary shrink-0" />
                      <span className={SEG_VALUE}>{t("search_form.everywhere")}</span>
                    </div>
                  ) : (
                    <MultiOriginInput
                      values={destinations}
                      onChange={handleDestinationsChange}
                      placeholder={t("search_form.placeholder_destination", t("search_form.placeholder_airport"))}
                      multiLabel={t("search_form.multi_destination")}
                      bare
                    />
                  )}
                </div>
              </div>

              <div className="h-px bg-border/15 mx-4" />

              {/* DATES row */}
              {isAnyDay ? (
                <div className={`px-4 min-h-[52px] flex flex-col justify-center ${errRing(!!errors.dates)}`}>
                  <span className={SEG_LABEL}>{t("search_form.trip_length")}</span>
                  {tripType === "roundtrip" ? (
                    <TripLengthSlider value={tripLength} onChange={setTripLength} />
                  ) : (
                    <span className={`${SEG_PLACEHOLDER} text-[13px]`}>{t("search_form.flexible_departure")}</span>
                  )}
                </div>
              ) : (
                <div className={tripType === "roundtrip" ? "grid grid-cols-2" : ""}>
                  <div className={`flex items-center gap-3 px-4 min-h-[52px] cursor-pointer ${tripType === "roundtrip" ? "border-r border-border/15" : ""} ${errRing(!!errors.dates)}`}>
                    <Calendar className="w-4 h-4 text-muted-foreground/30 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <FlightDateRangePicker
                        departDate={departDate} returnDate={returnDate}
                        onDepartChange={handleDepartChange} onReturnChange={handleReturnChange}
                        tripType={tripType as "roundtrip" | "oneway"} onTripTypeChange={handleTripTypeChange} hasError={!!errors.dates}
                        bare segmentMode segmentLabel={t("calendar.depart")} segmentDisplay={departDisplay}
                        onOpenCalendar={handleOpenCalendar}
                      />
                    </div>
                  </div>
                  {tripType === "roundtrip" && (
                    <div className={`flex items-center gap-3 px-4 min-h-[52px] cursor-pointer ${errRing(!!errors.dates)}`}>
                      <div className="min-w-0 flex-1">
                        <FlightDateRangePicker
                          departDate={departDate} returnDate={returnDate}
                          onDepartChange={handleDepartChange} onReturnChange={handleReturnChange}
                          tripType={tripType} onTripTypeChange={handleTripTypeChange} hasError={!!errors.dates}
                          bare segmentMode segmentLabel={t("calendar.return", "Return")} segmentDisplay={returnDisplay}
                          onOpenCalendar={handleOpenCalendar}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="h-px bg-border/15 mx-4" />

              {/* TRAVELERS row */}
              <div className="flex items-center gap-3 px-4 min-h-[52px] cursor-pointer">
                <Users className="w-4 h-4 text-muted-foreground/30 shrink-0" />
                <div className="flex-1 min-w-0">
                  <TravelersPicker value={travelers} onChange={setTravelers} compact bare segmentMode />
                </div>
              </div>
            </div>

            {/* ── Utility options — grouped cleanly ── */}
            <div className="px-1 pt-3 pb-1 space-y-2">
              {/* Row 1: Direct flights + My location */}
              <div className="flex items-center gap-4 flex-wrap">
                <label className="flex items-center gap-2 cursor-pointer select-none min-h-[36px]">
                  <Checkbox checked={directOnly} onCheckedChange={checked => setDirectOnly(checked === true)} className="h-4 w-4 rounded-[4px] border-muted-foreground/30" />
                  <span className="text-[12px] text-muted-foreground font-medium">{t("search.direct_flights_only")}</span>
                </label>
                <button onClick={handleUseMyLocation} className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-primary transition-colors cursor-pointer font-medium min-h-[36px]">
                  <Navigation className="w-3.5 h-3.5" /> {t("search.use_location")}
                </button>
              </div>

              {/* Row 2: Nearby airports */}
              <div className="flex items-start gap-4 flex-wrap">
                <NearbyToggle enabled={fromNearby} onToggle={handleFromNearbyToggle} radius={fromRadius} onRadiusChange={setFromRadius} />
                {!anywhere && <NearbyToggle enabled={toNearby} onToggle={handleToNearbyToggle} radius={toRadius} onRadiusChange={setToRadius} />}
              </div>

              {/* Row 3: Any day + Anywhere */}
              <div className="flex items-center gap-4 flex-wrap">
                <label className="flex items-center gap-2 cursor-pointer select-none min-h-[36px]">
                  <Checkbox
                    checked={isAnyDay}
                    onCheckedChange={checked => {
                      const on = checked === true;
                      setIsAnyDay(on);
                      if (on) { setDepartFlexBefore(0); setDepartFlexAfter(0); setReturnFlexBefore(0); setReturnFlexAfter(0); setCalendarOpen(false); }
                    }}
                    className="h-4 w-4 rounded-[4px]"
                  />
                  <span className="text-[12px] text-muted-foreground font-medium flex items-center gap-1">
                    <CalendarOff className="w-3 h-3" /> {t("search.any_day", "Any day")}
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none min-h-[36px]">
                  <Checkbox checked={anywhere} onCheckedChange={(v) => { setAnywhere(v === true); if (v) { setDestinations([]); } }} className="h-4 w-4 rounded-[4px]" />
                  <span className="text-[12px] text-muted-foreground font-medium flex items-center gap-1">
                    <Globe className="w-3 h-3" /> {t("search.anywhere", "Anywhere")}
                  </span>
                </label>
              </div>
            </div>

            {/* ── Search CTA ── */}
            <div className="pt-2 pb-1">
              <button type="button" onClick={handleSearch}
                className="w-full flex items-center justify-center gap-2.5 min-h-[50px] rounded-2xl bg-primary text-primary-foreground font-semibold text-[15px] active:scale-[0.97] active:brightness-90 transition-all cursor-pointer shadow-lg shadow-primary/20">
                <Search className="w-5 h-5" />
                <span>{t("search.search_flights", t("search.search"))}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Calendar panel — portal modal on mobile, inline on desktop */}
        {calendarOpen && !isAnyDay && (
          isMobile ? (
            <MobileCalendarModal onClose={handleCloseCalendar}>
              <CalendarPanel
                departDate={departDate}
                returnDate={returnDate}
                onDepartChange={handleDepartChange}
                onReturnChange={handleReturnChange}
                tripType={tripType as "roundtrip" | "oneway"}
                onTripTypeChange={handleTripTypeChange}
                onDone={handleCloseCalendar}
                departFlexBefore={departFlexBefore}
                departFlexAfter={departFlexAfter}
                returnFlexBefore={returnFlexBefore}
                returnFlexAfter={returnFlexAfter}
                onDepartFlexBeforeChange={setDepartFlexBefore}
                onDepartFlexAfterChange={setDepartFlexAfter}
                onReturnFlexBeforeChange={setReturnFlexBefore}
                onReturnFlexAfterChange={setReturnFlexAfter}
                initialTab={calendarInitialTab}
              />
            </MobileCalendarModal>
          ) : (
            <div className="absolute left-0 right-0 top-full z-[100]">
              <CalendarPanel
                departDate={departDate}
                returnDate={returnDate}
                onDepartChange={handleDepartChange}
                onReturnChange={handleReturnChange}
                tripType={tripType as "roundtrip" | "oneway"}
                onTripTypeChange={handleTripTypeChange}
                onDone={handleCloseCalendar}
                departFlexBefore={departFlexBefore}
                departFlexAfter={departFlexAfter}
                returnFlexBefore={returnFlexBefore}
                returnFlexAfter={returnFlexAfter}
                onDepartFlexBeforeChange={setDepartFlexBefore}
                onDepartFlexAfterChange={setDepartFlexAfter}
                onReturnFlexBeforeChange={setReturnFlexBefore}
                onReturnFlexAfterChange={setReturnFlexAfter}
                initialTab={calendarInitialTab}
              />
            </div>
          )
        )}

      </div>

      {/* ═══════════════════════════════════════════
          DESKTOP OPTIONS ROW — UNCHANGED
          ═══════════════════════════════════════════ */}
      <div className="hidden xl:flex w-full min-h-[44px] items-start justify-between gap-4 px-2 pr-6">
        {/* LEFT GROUP */}
        <div className="flex items-start gap-5 min-w-0 shrink">
          <div className="w-[200px] shrink-0">
            <NearbyToggle enabled={fromNearby} onToggle={handleFromNearbyToggle} radius={fromRadius} onRadiusChange={setFromRadius} />
          </div>
          <div className="w-[200px] shrink-0">
            <NearbyToggle
              enabled={anywhere ? false : toNearby}
              onToggle={handleToNearbyToggle}
              radius={toRadius}
              onRadiusChange={setToRadius}
              disabled={anywhere}
            />
          </div>
          <div className="shrink-0 pt-[2px]">
            <label className="flex h-5 items-center gap-2 cursor-pointer select-none whitespace-nowrap">
              <Checkbox checked={directOnly} onCheckedChange={checked => setDirectOnly(checked === true)} className="h-4 w-4 rounded-[4px]" />
              <span className="text-[12px] text-muted-foreground/60 font-medium">{t("search.direct_flights_only")}</span>
            </label>
          </div>
        </div>

        {/* RIGHT GROUP — Any day, Anywhere, Use my location */}
        <div className="flex items-start gap-5 shrink-0 pt-[2px]">
          <label className="flex h-5 items-center gap-2 cursor-pointer select-none whitespace-nowrap shrink-0">
            <Checkbox checked={isAnyDay} onCheckedChange={checked => { const on = checked === true; setIsAnyDay(on); if (on) { setDepartFlexBefore(0); setDepartFlexAfter(0); setReturnFlexBefore(0); setReturnFlexAfter(0); setCalendarOpen(false); } }} className="h-4 w-4 rounded-[4px]" />
            <span className="text-[12px] text-muted-foreground/60 font-medium flex items-center gap-1">
              <CalendarOff className="w-3 h-3" /> {t("search.any_day", "Any day")}
            </span>
          </label>

          <label className="flex h-5 items-center gap-2 cursor-pointer select-none whitespace-nowrap shrink-0">
            <Checkbox checked={anywhere} onCheckedChange={(v) => { setAnywhere(v === true); if (v) { setDestinations([]); } }} className="h-4 w-4 rounded-[4px]" />
            <span className="text-[12px] text-muted-foreground/60 font-medium flex items-center gap-1">
              <Globe className="w-3 h-3 shrink-0" /> {t("search.anywhere", "Anywhere")}
            </span>
          </label>

          <button onClick={handleUseMyLocation}
            className="flex h-5 items-center gap-1.5 text-[12px] text-muted-foreground/60 hover:text-primary transition-colors cursor-pointer whitespace-nowrap shrink-0 font-medium">
            <Navigation className="w-3.5 h-3.5" /> {t("search.use_location")}
          </button>
        </div>
      </div>

      {/* ── Trust row ── */}
      <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 pt-2">
        {TRUST_KEYS.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.key} className="flex items-center gap-2">
              <Icon className="w-3.5 h-3.5 text-muted-foreground/40" />
              <span className="text-[11px] text-muted-foreground/50 font-medium tracking-wide">{t(item.key)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
});

FlightSearchForm.displayName = "FlightSearchForm";

export default FlightSearchForm;
