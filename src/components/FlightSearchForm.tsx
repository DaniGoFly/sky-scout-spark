import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { ArrowRightLeft, Search, Globe, CalendarOff, CalendarDays, ChevronDown, Navigation, MapPin, Zap, Plane, Shield, CheckCircle2, Wifi, Minus, Plus } from "lucide-react";
import { format, addDays } from "date-fns";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import MultiOriginInput, { type AirportSelection } from "./MultiOriginInput";
import FlightDateRangePicker from "./FlightDateRangePicker";
import TravelersPicker, { TravelersData } from "./TravelersPicker";
import MultiCitySearchForm from "./MultiCitySearchForm";
import NearbyToggle from "./search/NearbyToggle";
import FlexDateControls from "./search/FlexDateControls";
import TripLengthSlider from "./search/TripLengthSlider";
import { getDefaultDates } from "@/lib/dateUtils";
import { requestNearestAirport } from "@/lib/nearestAirport";
import { AIRPORTS, getAirportsInRadius } from "@/lib/airports";
import { toast } from "sonner";
import type { AISearchParams } from "./FlightSearchHero";
import { useLocale } from "@/hooks/useLocale";

interface FlightSearchFormProps {
  aiSearchParams?: AISearchParams | null;
  onParamsConsumed?: () => void;
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

const FlightSearchForm = ({ aiSearchParams, onParamsConsumed }: FlightSearchFormProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { currency, marketCode } = useLocale();

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

  const [tripTypeOpen, setTripTypeOpen] = useState(false);

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
    if (userCoordsRef.current) { fillNearbyOrigins(userCoordsRef.current.lat, userCoordsRef.current.lon, fromRadius); return; }
    if (!navigator.geolocation) { toast.error("Geolocation not supported."); setFromNearby(false); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => { userCoordsRef.current = { lat: pos.coords.latitude, lon: pos.coords.longitude }; fillNearbyOrigins(pos.coords.latitude, pos.coords.longitude, fromRadius); },
      () => { toast.error("Location permission denied."); setFromNearby(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [fromRadius, fillNearbyOrigins]);

  useEffect(() => {
    if (fromNearby && userCoordsRef.current) fillNearbyOrigins(userCoordsRef.current.lat, userCoordsRef.current.lon, fromRadius);
  }, [fromRadius, fromNearby, fillNearbyOrigins]);

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

  const tripTypeLabel = tripType === "roundtrip" ? t("search.roundtrip") : tripType === "oneway" ? t("search.oneway") : t("search.multicity");

  // Display values
  const departDisplay = isAnyDay ? "Any day" : departDate ? format(departDate, "d MMM") : "Select date";
  const returnDisplay = isAnyDay ? "Any day" : returnDate ? format(returnDate, "d MMM") : "Select date";
  const totalPax = travelers.adults + travelers.children + travelers.infantsSeat;
  const travelersDisplay = `${totalPax} traveller${totalPax !== 1 ? "s" : ""}`;

  // ── Multi-city mode ──
  if (tripType === "multicity") {
    return (
      <div className="w-full">
        <div className="flex items-center gap-2 mb-4">
          <div className="relative">
            <button onClick={() => setTripTypeOpen(!tripTypeOpen)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-border/60 bg-secondary/60 text-sm font-medium text-foreground hover:border-primary/40 transition-all">
              {tripTypeLabel} <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            {tripTypeOpen && (
              <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden min-w-[140px]">
                {(["roundtrip", "oneway", "multicity"] as const).map(type => (
                  <button key={type} onClick={() => { setTripType(type); setTripTypeOpen(false); }}
                    className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${tripType === type ? "bg-primary/15 text-primary font-medium" : "text-foreground hover:bg-secondary"}`}>
                    {type === "roundtrip" ? t("search.roundtrip") : type === "oneway" ? t("search.oneway") : t("search.multicity")}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <MultiCitySearchForm onSearch={handleMultiCitySearch} />
      </div>
    );
  }

  const errRing = (has?: boolean) => has ? "ring-2 ring-destructive/40" : "";

  /* ── Segment style tokens ── */
  const SEG_LABEL = "text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-[0.12em] leading-none mb-1.5";
  const SEG_VALUE = "text-[15px] font-semibold text-foreground leading-snug whitespace-nowrap";
  const SEG_PLACEHOLDER = "text-[15px] font-normal text-muted-foreground/40 leading-snug whitespace-nowrap";

  return (
    <div className="w-full max-w-[1160px] mx-auto space-y-5 overflow-x-clip">
      {/* ── Trip type pill ── */}
      <div className="flex items-center justify-start gap-3">
        <div className="relative">
          <button onClick={() => setTripTypeOpen(!tripTypeOpen)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-border/30 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-border/50 transition-all">
            {tripTypeLabel} <ChevronDown className="w-3.5 h-3.5" />
          </button>
          {tripTypeOpen && (
            <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden min-w-[140px]">
              {(["roundtrip", "oneway", "multicity"] as const).map(type => (
                <button key={type} onClick={() => { setTripType(type); setTripTypeOpen(false); }}
                  className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${tripType === type ? "bg-primary/15 text-primary font-medium" : "text-foreground hover:bg-secondary"}`}>
                  {type === "roundtrip" ? t("search.roundtrip") : type === "oneway" ? t("search.oneway") : t("search.multicity")}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          SIGNATURE SEARCH BAR
          ═══════════════════════════════════════════ */}
      <div className="w-full min-w-0 max-w-full rounded-2xl border border-border/10 bg-background/60 shadow-[0_1px_8px_rgba(0,0,0,0.08)] overflow-hidden relative z-20 backdrop-blur-sm [contain:layout] lg:h-[94px]">
        {/* Desktop: fixed slot grid */}
        <div className="hidden lg:grid h-full items-stretch grid-cols-[minmax(180px,205px)_40px_minmax(180px,205px)_minmax(280px,320px)_minmax(190px,220px)_minmax(150px,170px)]">
          {/* FROM */}
          <div className={`min-w-0 px-6 py-4 rounded-l-2xl transition-colors hover:bg-secondary/60 ${errRing(!!errors.from)}`}>
            <span className={SEG_LABEL}>{t("search.from")}</span>
            <MultiOriginInput
              values={origins}
              onChange={handleOriginsChange}
              placeholder="Country, city or airport"
              bare
            />
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
          <div className={`min-w-0 px-6 py-4 transition-colors hover:bg-secondary/60 ${errRing(!!errors.to)}`}>
            <span className={SEG_LABEL}>{t("search.to")}</span>
            {anywhere ? (
              <div className="flex items-center gap-1.5 min-h-[30px]">
                <Globe className="w-4 h-4 text-primary shrink-0" />
                <span className={SEG_VALUE}>Everywhere</span>
              </div>
            ) : (
              <MultiOriginInput
                values={destinations}
                onChange={handleDestinationsChange}
                placeholder="Country, city or airport"
                multiLabel="Multi-Destination"
                bare
              />
            )}
          </div>

          {/* DATES SLOT (fixed width) */}
          {isAnyDay ? (
            <div className={`h-full w-full px-6 py-3 flex flex-col justify-center transition-colors hover:bg-secondary/60 border-l border-border/20 ${errRing(!!errors.dates)}`}>
              <span className={SEG_LABEL}>Trip length</span>
              {tripType === "roundtrip" ? (
                <TripLengthSlider value={tripLength} onChange={setTripLength} />
              ) : (
                <span className={`${SEG_PLACEHOLDER} text-[13px]`}>Flexible departure</span>
              )}
            </div>
          ) : (
            <div className={`h-full w-full transition-colors hover:bg-secondary/60 border-l border-border/20 ${errRing(!!errors.dates)}`}>
              <div className="grid h-full grid-cols-2 items-stretch">
                <div className="px-6 py-4 relative z-30 border-r border-border/20">
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
                  />
                </div>

                <div className="px-6 py-4 relative z-30">
                  {tripType === "roundtrip" ? (
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
                    />
                  ) : (
                    <div className="flex h-full flex-col justify-center">
                      <span className={SEG_LABEL}>{t("calendar.return", "Return")}</span>
                      <span className={`${SEG_PLACEHOLDER} text-[13px]`}>Flexible</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TRAVELERS */}
          <div className="w-full px-6 py-4 transition-colors hover:bg-secondary/60 border-l border-border/20 cursor-pointer">
            <TravelersPicker value={travelers} onChange={setTravelers} compact bare segmentMode />
          </div>

          {/* SEARCH BUTTON */}
          <button
            type="button"
            onClick={handleSearch}
            className="w-full flex items-center justify-center gap-2.5 px-8 rounded-r-2xl bg-gradient-to-b from-primary to-[hsl(220_80%_46%)] text-primary-foreground font-semibold text-[15px] hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Search className="w-5 h-5" />
            <span className="hidden xl:inline">{t("search.search")}</span>
          </button>
        </div>

        {/* Mobile: stacked layout */}
        <div className="lg:hidden flex flex-col">
          {/* FROM */}
          <div className={`px-5 py-4 ${errRing(!!errors.from)}`}>
            <span className={SEG_LABEL}>{t("search.from")}</span>
            <MultiOriginInput
              values={origins}
              onChange={handleOriginsChange}
              placeholder="Country, city or airport"
              bare
            />
          </div>

          {/* Mobile swap */}
          <div className="flex justify-center -my-3 relative z-30">
            <button type="button" onClick={swapLocations}
              disabled={origins.length !== 1 || destinations.length !== 1 || anywhere}
              className="w-8 h-8 rounded-full border border-border/40 bg-card flex items-center justify-center text-muted-foreground hover:text-primary disabled:opacity-20 transition-all shadow-sm">
              <ArrowRightLeft className="w-3 h-3 rotate-90" />
            </button>
          </div>

          {/* Separator */}
          <div className="h-px mx-5 bg-border/15" />

          {/* TO */}
          <div className={`px-5 py-4 ${errRing(!!errors.to)}`}>
            <span className={SEG_LABEL}>{t("search.to")}</span>
            {anywhere ? (
              <div className="flex items-center gap-1.5 min-h-[36px]">
                <Globe className="w-4 h-4 text-primary shrink-0" />
                <span className={SEG_VALUE}>Everywhere</span>
              </div>
            ) : (
              <MultiOriginInput
                values={destinations}
                onChange={handleDestinationsChange}
                placeholder="Country, city or airport"
                multiLabel="Multi-Destination"
                bare
              />
            )}
          </div>

          <div className="h-px mx-5 bg-border/15" />

          {/* DATES SECTION — mobile */}
          {isAnyDay ? (
            <div className={`px-5 py-4 ${errRing(!!errors.dates)}`}>
              <span className={SEG_LABEL}>Trip length</span>
              {tripType === "roundtrip" ? (
                <TripLengthSlider value={tripLength} onChange={setTripLength} />
              ) : (
                <span className={`${SEG_PLACEHOLDER} text-[13px]`}>Flexible departure</span>
              )}
            </div>
          ) : (
            <>
              {/* DEPART */}
              <div className={`px-5 py-4 cursor-pointer ${errRing(!!errors.dates)}`}>
                <FlightDateRangePicker
                  departDate={departDate} returnDate={returnDate}
                  onDepartChange={handleDepartChange} onReturnChange={handleReturnChange}
                  tripType={tripType as "roundtrip" | "oneway"} onTripTypeChange={handleTripTypeChange} hasError={!!errors.dates}
                  bare segmentMode segmentLabel={t("calendar.depart")} segmentDisplay={departDisplay}
                />
              </div>

              {/* RETURN */}
              {tripType === "roundtrip" && (
                <>
                  <div className="h-px mx-5 bg-border/15" />
                  <div className={`px-5 py-4 cursor-pointer ${errRing(!!errors.dates)}`}>
                    <FlightDateRangePicker
                      departDate={departDate} returnDate={returnDate}
                      onDepartChange={handleDepartChange} onReturnChange={handleReturnChange}
                      tripType={tripType as "roundtrip" | "oneway"} onTripTypeChange={handleTripTypeChange} hasError={!!errors.dates}
                      bare segmentMode segmentLabel={t("calendar.return", "Return")} segmentDisplay={returnDisplay}
                    />
                  </div>
                </>
              )}
            </>
          )}

          <div className="h-px mx-5 bg-border/15" />

          {/* TRAVELERS */}
          <div className="px-5 py-4 cursor-pointer">
            <TravelersPicker value={travelers} onChange={setTravelers} compact bare segmentMode />
          </div>

          {/* SEARCH BUTTON — full width mobile */}
          <button type="button" onClick={handleSearch}
            className="flex items-center justify-center gap-2 px-6 py-4 rounded-b-2xl bg-gradient-to-r from-primary to-[hsl(220_80%_46%)] text-primary-foreground font-semibold text-base active:scale-[0.98] transition-all cursor-pointer">
            <Search className="w-5 h-5" />
            <span>{t("search.search_flights")}</span>
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          OPTIONS ROW — clean, secondary
          ═══════════════════════════════════════════ */}
      <div className="lg:hidden flex flex-col gap-2.5 px-1">
        <NearbyToggle enabled={fromNearby} onToggle={handleFromNearbyToggle} radius={fromRadius} onRadiusChange={setFromRadius} />
        {!anywhere && <NearbyToggle enabled={toNearby} onToggle={handleToNearbyToggle} radius={toRadius} onRadiusChange={setToRadius} />}

        <label className="flex h-5 items-center gap-2 cursor-pointer select-none">
          <Checkbox checked={directOnly} onCheckedChange={checked => setDirectOnly(checked === true)} className="h-4 w-4 rounded-[4px]" />
          <span className="text-[12px] text-muted-foreground/60 font-medium whitespace-nowrap">{t("search.direct_flights_only")}</span>
        </label>

        <div className={`flex h-5 items-center gap-2 select-none whitespace-nowrap ${isAnyDay ? "opacity-40 pointer-events-none" : ""}`}>
          <Checkbox
            checked={!isAnyDay && (departFlexBefore > 0 || departFlexAfter > 0)}
            onCheckedChange={checked => {
              if (checked) {
                setDepartFlexBefore(3);
                setDepartFlexAfter(3);
                if (tripType === "roundtrip") { setReturnFlexBefore(3); setReturnFlexAfter(3); }
              } else {
                setDepartFlexBefore(0);
                setDepartFlexAfter(0);
                setReturnFlexBefore(0);
                setReturnFlexAfter(0);
              }
            }}
            disabled={isAnyDay}
            className="h-4 w-4 rounded-[4px]"
          />
          <span className="text-[12px] text-muted-foreground/60 font-medium flex items-center gap-1">
            <CalendarDays className="w-3 h-3" /> Flex dates
            {!isAnyDay && departFlexBefore > 0 && (
              <span className="text-primary font-semibold">±{departFlexBefore}d</span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-4 pt-1">
          <button onClick={async () => {
            const result = await requestNearestAirport();
            if (result) {
              userCoordsRef.current = { lat: result.airport.lat, lon: result.airport.lon };
              setOrigins([{ code: result.airport.code, display: `${result.airport.city} (${result.airport.code})` }]);
              setErrors(e => ({ ...e, from: undefined }));
            }
          }} className="flex items-center gap-1.5 text-[12px] text-muted-foreground/60 hover:text-primary transition-colors cursor-pointer whitespace-nowrap font-medium">
            <Navigation className="w-3.5 h-3.5" /> {t("search.use_location")}
          </button>

          <label className="flex items-center gap-2 cursor-pointer select-none whitespace-nowrap">
            <Checkbox
              checked={isAnyDay}
              onCheckedChange={checked => {
                const on = checked === true;
                setIsAnyDay(on);
                if (on) { setDepartFlexBefore(0); setDepartFlexAfter(0); setReturnFlexBefore(0); setReturnFlexAfter(0); }
              }}
              className="h-4 w-4 rounded-[4px]"
            />
            <span className="text-[12px] text-muted-foreground/60 font-medium flex items-center gap-1">
              <CalendarOff className="w-3 h-3" /> {t("search.any_day", "Any day")}
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer select-none whitespace-nowrap">
            <Checkbox checked={anywhere} onCheckedChange={(v) => { setAnywhere(v === true); if (v) { setDestinations([]); } }} className="h-4 w-4 rounded-[4px]" />
            <span className="text-[12px] text-muted-foreground/60 font-medium flex items-center gap-1">
              <Globe className="w-3 h-3" /> {t("search.anywhere", "Anywhere")}
            </span>
          </label>
        </div>
      </div>

      {/* ── Desktop options row ── */}
      <div className="hidden lg:flex w-full min-h-[44px] items-start justify-between gap-4 px-2 pr-4">
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

        {/* RIGHT GROUP */}
        <div className="flex items-start gap-4 shrink-0 pt-[2px]">
          {/* Flex dates — dropdown trigger only, no checkbox */}
          <Popover>
            <PopoverTrigger asChild>
              <button type="button" disabled={isAnyDay}
                className={`flex h-5 items-center gap-1 text-[12px] font-medium transition-colors cursor-pointer shrink-0 whitespace-nowrap ${isAnyDay ? "opacity-40 pointer-events-none text-muted-foreground/60" : "text-muted-foreground/60 hover:text-primary"}`}>
                <CalendarDays className="w-3 h-3" />
                <span>Flex</span>
                {!isAnyDay && (departFlexBefore > 0 || departFlexAfter > 0) && (() => {
                  const dLabel = `${departFlexBefore > 0 ? `-${departFlexBefore}` : ""}${departFlexAfter > 0 ? `+${departFlexAfter}` : ""}`;
                  const rLabel = tripType === "roundtrip" && (returnFlexBefore > 0 || returnFlexAfter > 0) ? ` R${returnFlexBefore > 0 ? `-${returnFlexBefore}` : ""}${returnFlexAfter > 0 ? `+${returnFlexAfter}` : ""}` : "";
                  return <span className="text-primary font-semibold ml-0.5">{dLabel}{rLabel}</span>;
                })()}
                <ChevronDown className="w-3 h-3 opacity-50" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[260px] p-4" align="start" side="bottom" sideOffset={8} avoidCollisions={false}>
              <p className="text-xs font-semibold text-foreground mb-3">Departure flexibility</p>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">Days before</span>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setDepartFlexBefore(Math.max(0, departFlexBefore - 1))}
                    disabled={departFlexBefore <= 0} className="w-7 h-7 rounded-md flex items-center justify-center bg-secondary hover:bg-secondary/80 text-muted-foreground disabled:opacity-30 transition-colors">
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-6 text-center text-sm font-semibold text-foreground tabular-nums">{departFlexBefore}</span>
                  <button type="button" onClick={() => setDepartFlexBefore(Math.min(10, departFlexBefore + 1))}
                    disabled={departFlexBefore >= 10} className="w-7 h-7 rounded-md flex items-center justify-center bg-secondary hover:bg-secondary/80 text-muted-foreground disabled:opacity-30 transition-colors">
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-muted-foreground">Days after</span>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setDepartFlexAfter(Math.max(0, departFlexAfter - 1))}
                    disabled={departFlexAfter <= 0} className="w-7 h-7 rounded-md flex items-center justify-center bg-secondary hover:bg-secondary/80 text-muted-foreground disabled:opacity-30 transition-colors">
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-6 text-center text-sm font-semibold text-foreground tabular-nums">{departFlexAfter}</span>
                  <button type="button" onClick={() => setDepartFlexAfter(Math.min(10, departFlexAfter + 1))}
                    disabled={departFlexAfter >= 10} className="w-7 h-7 rounded-md flex items-center justify-center bg-secondary hover:bg-secondary/80 text-muted-foreground disabled:opacity-30 transition-colors">
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
              {tripType === "roundtrip" && (
                <>
                  <div className="h-px bg-border/30 mb-3" />
                  <p className="text-xs font-semibold text-foreground mb-3">Return flexibility</p>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">Days before</span>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setReturnFlexBefore(Math.max(0, returnFlexBefore - 1))}
                        disabled={returnFlexBefore <= 0} className="w-7 h-7 rounded-md flex items-center justify-center bg-secondary hover:bg-secondary/80 text-muted-foreground disabled:opacity-30 transition-colors">
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center text-sm font-semibold text-foreground tabular-nums">{returnFlexBefore}</span>
                      <button type="button" onClick={() => setReturnFlexBefore(Math.min(10, returnFlexBefore + 1))}
                        disabled={returnFlexBefore >= 10} className="w-7 h-7 rounded-md flex items-center justify-center bg-secondary hover:bg-secondary/80 text-muted-foreground disabled:opacity-30 transition-colors">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Days after</span>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setReturnFlexAfter(Math.max(0, returnFlexAfter - 1))}
                        disabled={returnFlexAfter <= 0} className="w-7 h-7 rounded-md flex items-center justify-center bg-secondary hover:bg-secondary/80 text-muted-foreground disabled:opacity-30 transition-colors">
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center text-sm font-semibold text-foreground tabular-nums">{returnFlexAfter}</span>
                      <button type="button" onClick={() => setReturnFlexAfter(Math.min(10, returnFlexAfter + 1))}
                        disabled={returnFlexAfter >= 10} className="w-7 h-7 rounded-md flex items-center justify-center bg-secondary hover:bg-secondary/80 text-muted-foreground disabled:opacity-30 transition-colors">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </PopoverContent>
          </Popover>

          <button onClick={async () => {
              const result = await requestNearestAirport();
              if (result) { userCoordsRef.current = { lat: result.airport.lat, lon: result.airport.lon }; setOrigins([{ code: result.airport.code, display: `${result.airport.city} (${result.airport.code})` }]); setErrors(e => ({ ...e, from: undefined })); }
            }}
            className="flex h-5 items-center gap-1.5 text-[12px] text-muted-foreground/60 hover:text-primary transition-colors cursor-pointer whitespace-nowrap shrink-0 font-medium">
            <Navigation className="w-3.5 h-3.5" /> {t("search.use_location")}
          </button>

          <label className="flex h-5 items-center gap-2 cursor-pointer select-none whitespace-nowrap shrink-0">
            <Checkbox checked={isAnyDay} onCheckedChange={checked => { const on = checked === true; setIsAnyDay(on); if (on) { setDepartFlexBefore(0); setDepartFlexAfter(0); setReturnFlexBefore(0); setReturnFlexAfter(0); } }} className="h-4 w-4 rounded-[4px]" />
            <span className="text-[12px] text-muted-foreground/60 font-medium flex items-center gap-1">
              <CalendarOff className="w-3 h-3" /> {t("search.any_day", "Any day")}
            </span>
          </label>

          <label className="flex h-5 items-center gap-2 cursor-pointer select-none whitespace-nowrap shrink-0 min-w-[110px] pr-2">
            <Checkbox checked={anywhere} onCheckedChange={(v) => { setAnywhere(v === true); if (v) { setDestinations([]); } }} className="h-4 w-4 rounded-[4px]" />
            <span className="text-[12px] text-muted-foreground/60 font-medium flex items-center gap-1">
              <Globe className="w-3 h-3 shrink-0" /> {t("search.anywhere", "Anywhere")}
            </span>
          </label>
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
};

export default FlightSearchForm;
