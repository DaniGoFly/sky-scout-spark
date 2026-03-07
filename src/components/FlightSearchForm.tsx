import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRightLeft, Search, Globe, CalendarOff, CalendarDays, ChevronDown, Navigation, MapPin, Zap } from "lucide-react";
import { format, addDays } from "date-fns";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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
  const [fromModalOpen, setFromModalOpen] = useState(false);
  const [toModalOpen, setToModalOpen] = useState(false);

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
  const SEG = "flex flex-col justify-center px-4 sm:px-5 py-3 min-h-[64px] cursor-pointer transition-colors hover:bg-[hsl(222_30%_18%)] group relative";
  const SEG_LABEL = "text-[11px] font-medium text-muted-foreground uppercase tracking-wider leading-none mb-1";
  const SEG_VALUE = "text-[15px] font-semibold text-foreground leading-snug truncate";
  const SEG_PLACEHOLDER = "text-[15px] font-medium text-muted-foreground/60 leading-snug";
  const DIVIDER = "hidden lg:block w-px self-stretch bg-border/40";

  return (
    <div className="w-full">
      {/* ── Trip type pill ── */}
      <div className="flex items-center gap-3 mb-3">
        <div className="relative">
          <button onClick={() => setTripTypeOpen(!tripTypeOpen)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-border/60 text-sm font-medium text-foreground hover:border-primary/40 transition-all bg-secondary/50 backdrop-blur-sm">
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

      {/* ═══════════════════════════════════════════
          SEGMENTED SEARCH BAR — dark glass style
          ═══════════════════════════════════════════ */}
      <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-visible relative z-20">
        {/* Desktop: single horizontal row */}
        <div className="hidden lg:flex items-stretch">
          {/* FROM */}
          <button type="button" onClick={() => setFromModalOpen(true)}
            className={`${SEG} flex-1 rounded-l-2xl ${errRing(!!errors.from)}`}>
            <span className={SEG_LABEL}>{t("search.from")}</span>
            {origins.length > 0
              ? <span className={SEG_VALUE}>{origins.map(o => o.display || o.code).join(", ")}</span>
              : <span className={SEG_PLACEHOLDER}>{t("search.where_from")}</span>}
          </button>

          {/* SWAP — sits between From and To */}
          <div className="flex items-center justify-center px-0 relative z-30 shrink-0" style={{ width: '40px', margin: '0 -20px' }}>
            <button type="button" onClick={swapLocations}
              disabled={origins.length !== 1 || destinations.length !== 1 || anywhere}
              className="w-8 h-8 rounded-full border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/50 hover:scale-110 disabled:opacity-30 transition-all cursor-pointer shadow-lg"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* TO */}
          <button type="button" onClick={() => !anywhere && setToModalOpen(true)}
            className={`${SEG} flex-1 ${errRing(!!errors.to)} ${anywhere ? "cursor-default" : ""}`}>
            <span className={SEG_LABEL}>{t("search.to")}</span>
            {anywhere
              ? <span className={`${SEG_VALUE} flex items-center gap-1.5`}><Globe className="w-4 h-4 text-primary" /> Everywhere</span>
              : destinations.length > 0
                ? <span className={SEG_VALUE}>{destinations.map(d => d.display || d.code).join(", ")}</span>
                : <span className={SEG_PLACEHOLDER}>{t("search.where_to")}</span>}
          </button>

          <div className={DIVIDER} />

          {/* DEPART */}
          <div className={`${SEG} min-w-[130px] ${errRing(!!errors.dates)}`}>
            {isAnyDay ? (
              <button type="button" onClick={() => setIsAnyDay(false)} className="text-left w-full">
                <span className={SEG_LABEL}>{t("calendar.depart")}</span>
                <span className={SEG_PLACEHOLDER}>Any day</span>
              </button>
            ) : (
              <FlightDateRangePicker
                departDate={departDate} returnDate={returnDate}
                onDepartChange={handleDepartChange} onReturnChange={handleReturnChange}
                tripType={tripType as "roundtrip" | "oneway"} onTripTypeChange={handleTripTypeChange} hasError={!!errors.dates}
                bare segmentMode segmentLabel={t("calendar.depart")} segmentDisplay={departDisplay}
              />
            )}
          </div>

          {/* RETURN */}
          {tripType === "roundtrip" && (
            <>
              <div className={DIVIDER} />
              <div className={`${SEG} min-w-[130px] ${errRing(!!errors.dates)}`}>
                {isAnyDay ? (
                  <button type="button" onClick={() => setIsAnyDay(false)} className="text-left w-full">
                    <span className={SEG_LABEL}>Return</span>
                    <span className={SEG_PLACEHOLDER}>Any day</span>
                  </button>
                ) : (
                  <FlightDateRangePicker
                    departDate={departDate} returnDate={returnDate}
                    onDepartChange={handleDepartChange} onReturnChange={handleReturnChange}
                    tripType={tripType as "roundtrip" | "oneway"} onTripTypeChange={handleTripTypeChange} hasError={!!errors.dates}
                    bare segmentMode segmentLabel="Return" segmentDisplay={returnDisplay}
                  />
                )}
              </div>
            </>
          )}

          <div className={DIVIDER} />

          {/* TRAVELERS */}
          <div className={`${SEG} min-w-[120px]`}>
            <TravelersPicker value={travelers} onChange={setTravelers} compact bare segmentMode />
          </div>

          {/* SEARCH BUTTON — integrated into the bar */}
          <button type="button" onClick={handleSearch}
            className="flex items-center justify-center gap-2 px-7 min-w-[160px] rounded-r-2xl bg-gradient-to-br from-primary to-[hsl(220_85%_48%)] text-primary-foreground font-semibold text-[15px] hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
            <Search className="w-5 h-5" />
            <span>Search</span>
          </button>
        </div>

        {/* Mobile: stacked layout */}
        <div className="lg:hidden flex flex-col divide-y divide-border/30">
          {/* FROM */}
          <button type="button" onClick={() => setFromModalOpen(true)}
            className={`${SEG} rounded-t-2xl ${errRing(!!errors.from)}`}>
            <span className={SEG_LABEL}>{t("search.from")}</span>
            {origins.length > 0
              ? <span className={SEG_VALUE}>{origins.map(o => o.display || o.code).join(", ")}</span>
              : <span className={SEG_PLACEHOLDER}>{t("search.where_from")}</span>}
          </button>

          {/* Mobile swap */}
          <div className="flex justify-center -my-4 relative z-30">
            <button type="button" onClick={swapLocations}
              disabled={origins.length !== 1 || destinations.length !== 1 || anywhere}
              className="w-8 h-8 rounded-full border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-primary disabled:opacity-30 transition-all shadow-lg">
              <ArrowRightLeft className="w-3.5 h-3.5 rotate-90" />
            </button>
          </div>

          {/* TO */}
          <button type="button" onClick={() => !anywhere && setToModalOpen(true)}
            className={`${SEG} ${errRing(!!errors.to)} ${anywhere ? "cursor-default" : ""}`}>
            <span className={SEG_LABEL}>{t("search.to")}</span>
            {anywhere
              ? <span className={`${SEG_VALUE} flex items-center gap-1.5`}><Globe className="w-4 h-4 text-primary" /> Everywhere</span>
              : destinations.length > 0
                ? <span className={SEG_VALUE}>{destinations.map(d => d.display || d.code).join(", ")}</span>
                : <span className={SEG_PLACEHOLDER}>{t("search.where_to")}</span>}
          </button>

          {/* DEPART */}
          <div className={`${SEG} ${errRing(!!errors.dates)}`}>
            {isAnyDay ? (
              <button type="button" onClick={() => setIsAnyDay(false)} className="text-left w-full">
                <span className={SEG_LABEL}>{t("calendar.depart")}</span>
                <span className={SEG_PLACEHOLDER}>Any day</span>
              </button>
            ) : (
              <FlightDateRangePicker
                departDate={departDate} returnDate={returnDate}
                onDepartChange={handleDepartChange} onReturnChange={handleReturnChange}
                tripType={tripType as "roundtrip" | "oneway"} onTripTypeChange={handleTripTypeChange} hasError={!!errors.dates}
                bare segmentMode segmentLabel={t("calendar.depart")} segmentDisplay={departDisplay}
              />
            )}
          </div>

          {/* RETURN */}
          {tripType === "roundtrip" && (
            <div className={`${SEG} ${errRing(!!errors.dates)}`}>
              {isAnyDay ? (
                <button type="button" onClick={() => setIsAnyDay(false)} className="text-left w-full">
                  <span className={SEG_LABEL}>Return</span>
                  <span className={SEG_PLACEHOLDER}>Any day</span>
                </button>
              ) : (
                <FlightDateRangePicker
                  departDate={departDate} returnDate={returnDate}
                  onDepartChange={handleDepartChange} onReturnChange={handleReturnChange}
                  tripType={tripType as "roundtrip" | "oneway"} onTripTypeChange={handleTripTypeChange} hasError={!!errors.dates}
                  bare segmentMode segmentLabel="Return" segmentDisplay={returnDisplay}
                />
              )}
            </div>
          )}

          {/* TRAVELERS */}
          <div className={SEG}>
            <TravelersPicker value={travelers} onChange={setTravelers} compact bare segmentMode />
          </div>

          {/* SEARCH BUTTON — full width mobile */}
          <button type="button" onClick={handleSearch}
            className="flex items-center justify-center gap-2 px-6 py-4 rounded-b-2xl bg-gradient-to-r from-primary to-[hsl(220_85%_48%)] text-primary-foreground font-semibold text-base active:scale-[0.98] transition-all cursor-pointer">
            <Search className="w-5 h-5" />
            <span>Search Flights</span>
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          OPTIONS ROW — slim row below search bar
          ═══════════════════════════════════════════ */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-3 px-1">
        <NearbyToggle enabled={fromNearby} onToggle={handleFromNearbyToggle} radius={fromRadius} onRadiusChange={setFromRadius} />
        {!anywhere && <NearbyToggle enabled={toNearby} onToggle={handleToNearbyToggle} radius={toRadius} onRadiusChange={setToRadius} />}

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <Checkbox checked={directOnly} onCheckedChange={checked => setDirectOnly(checked === true)} className="h-4 w-4 rounded-[4px]" />
          <span className="text-[13px] text-muted-foreground/80">Direct flights only</span>
        </label>

        {isAnyDay && tripType === "roundtrip" && (
          <div className="w-full lg:w-auto">
            <TripLengthSlider value={tripLength} onChange={setTripLength} />
          </div>
        )}

        {!isAnyDay && departDate && (
          <FlexDateControls before={departFlexBefore} after={departFlexAfter} onBeforeChange={setDepartFlexBefore} onAfterChange={setDepartFlexAfter} />
        )}

        <div className="flex items-center gap-3 lg:ml-auto">
          <button onClick={async () => {
            const result = await requestNearestAirport();
            if (result) {
              userCoordsRef.current = { lat: result.airport.lat, lon: result.airport.lon };
              setOrigins([{ code: result.airport.code, display: `${result.airport.city} (${result.airport.code})` }]);
              setErrors(e => ({ ...e, from: undefined }));
            }
          }} className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors cursor-pointer">
            <Navigation className="w-3 h-3" /> My location
          </button>

          <button type="button" onClick={() => setIsAnyDay(!isAnyDay)}
            className={`flex items-center gap-1 text-[11px] transition-colors cursor-pointer ${isAnyDay ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
            {isAnyDay ? <CalendarOff className="w-3 h-3" /> : <CalendarDays className="w-3 h-3" />}
            {isAnyDay ? "Any day ✓" : "Any day"}
          </button>
        </div>
      </div>

      {/* ── FROM modal ── */}
      <Dialog open={fromModalOpen} onOpenChange={setFromModalOpen}>
        <DialogContent className="sm:max-w-md p-4" onPointerDownOutside={(e) => e.preventDefault()}>
          <h3 className="font-semibold text-foreground mb-3">Select origin</h3>
          <MultiOriginInput values={origins} onChange={(v) => { handleOriginsChange(v); }} placeholder="Country, city or airport" />
          <div className="mt-3 flex justify-end">
            <Button size="sm" onClick={() => setFromModalOpen(false)}>Done</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── TO modal ── */}
      <Dialog open={toModalOpen} onOpenChange={setToModalOpen}>
        <DialogContent className="sm:max-w-md p-4" onPointerDownOutside={(e) => e.preventDefault()}>
          <h3 className="font-semibold text-foreground mb-3">Select destination</h3>
          <MultiOriginInput values={destinations} onChange={(v) => { handleDestinationsChange(v); }} placeholder="Country, city or airport" multiLabel="Multi-Destination" />
          <div className="mt-2 flex items-center gap-2">
            <Checkbox checked={anywhere} onCheckedChange={(v) => { setAnywhere(v === true); if (v) { setDestinations([]); setToModalOpen(false); } }} className="h-4 w-4" />
            <span className="text-xs text-muted-foreground">Search everywhere</span>
          </div>
          <div className="mt-3 flex justify-end">
            <Button size="sm" onClick={() => setToModalOpen(false)}>Done</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FlightSearchForm;
