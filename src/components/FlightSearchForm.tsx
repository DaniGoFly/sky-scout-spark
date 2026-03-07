import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRightLeft, Search, Globe, CalendarOff, CalendarDays, ChevronDown, Navigation, Plus } from "lucide-react";
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

/* ── Design tokens for the card-based layout ── */
const INPUT_BOX =
  "h-[52px] rounded-xl border border-primary/15 bg-white text-[hsl(222_40%_10%)] cursor-pointer focus:outline-none transition-all hover:border-primary/30 flex flex-col justify-center";
const INPUT_INNER = "w-full text-left px-4 flex flex-col justify-center";
const LABEL = "text-[11px] font-semibold text-[hsl(220_8%_50%)] leading-none uppercase tracking-wide";
const VALUE_ROW = "flex items-center gap-1.5 min-w-0 mt-0.5";
const VAL_TEXT = "text-[14px] leading-[18px] font-medium text-[hsl(222_40%_15%)] truncate";
const PLACEHOLDER_TEXT = "text-[14px] leading-[18px] font-medium text-[hsl(220_10%_62%)]";

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
              className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-primary/20 bg-white text-sm font-medium text-[hsl(222_40%_15%)] hover:border-primary/40 transition-all">
              {tripTypeLabel} <ChevronDown className="w-3.5 h-3.5 text-[hsl(220_10%_55%)]" />
            </button>
            {tripTypeOpen && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-[hsl(220_13%_91%)] rounded-xl shadow-xl z-50 overflow-hidden min-w-[140px]">
                {(["roundtrip", "oneway", "multicity"] as const).map(type => (
                  <button key={type} onClick={() => { setTripType(type); setTripTypeOpen(false); }}
                    className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${tripType === type ? "bg-primary/10 text-primary font-medium" : "text-[hsl(222_40%_15%)] hover:bg-[hsl(220_14%_96%)]"}`}>
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

  const errRing = (has?: boolean) => has ? "ring-2 ring-destructive/30" : "";

  return (
    <div className="w-full">
      {/* ── Trip type pill ── */}
      <div className="flex items-center gap-3 mb-3">
        <div className="relative">
          <button onClick={() => setTripTypeOpen(!tripTypeOpen)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-primary/20 text-sm font-medium text-[hsl(222_40%_15%)] hover:border-primary/40 transition-all bg-white/90">
            {tripTypeLabel} <ChevronDown className="w-3.5 h-3.5 text-[hsl(220_10%_55%)]" />
          </button>
          {tripTypeOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-[hsl(220_13%_91%)] rounded-xl shadow-xl z-50 overflow-hidden min-w-[140px]">
              {(["roundtrip", "oneway", "multicity"] as const).map(type => (
                <button key={type} onClick={() => { setTripType(type); setTripTypeOpen(false); }}
                  className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${tripType === type ? "bg-primary/10 text-primary font-medium" : "text-[hsl(222_40%_15%)] hover:bg-[hsl(220_14%_96%)]"}`}>
                  {type === "roundtrip" ? t("search.roundtrip") : type === "oneway" ? t("search.oneway") : t("search.multicity")}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          SEARCH CARD — 3-row structured layout
          ═══════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.12)] p-5 sm:p-6 relative z-20">

        {/* ROW 1 — From / Swap / To */}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-center">
          {/* FROM */}
          <button type="button" onClick={() => setFromModalOpen(true)}
            className={`${INPUT_BOX} ${errRing(!!errors.from)} w-full`}>
            <div className={INPUT_INNER}>
              <span className={LABEL}>{t("search.from")}</span>
              <div className={VALUE_ROW}>
                {origins.length > 0
                  ? <span className={VAL_TEXT}>{origins.map(o => o.display || o.code).join(", ")}</span>
                  : <span className={PLACEHOLDER_TEXT}>{t("search.where_from")}</span>}
              </div>
            </div>
          </button>

          {/* SWAP — centered in gap */}
          <div className="hidden sm:flex items-center justify-center">
            <button type="button" onClick={swapLocations}
              disabled={origins.length !== 1 || destinations.length !== 1 || anywhere}
              className="w-9 h-9 rounded-full border border-primary/20 bg-white flex items-center justify-center text-[hsl(220_10%_55%)] hover:text-primary hover:border-primary/40 hover:shadow-md disabled:opacity-30 transition-all cursor-pointer"
            >
              <ArrowRightLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile swap */}
          <div className="flex sm:hidden justify-center -my-1">
            <button type="button" onClick={swapLocations}
              disabled={origins.length !== 1 || destinations.length !== 1 || anywhere}
              className="w-8 h-8 rounded-full border border-primary/20 bg-white flex items-center justify-center text-[hsl(220_10%_55%)] hover:text-primary disabled:opacity-30 transition-all">
              <ArrowRightLeft className="w-3.5 h-3.5 rotate-90" />
            </button>
          </div>

          {/* TO */}
          <button type="button" onClick={() => !anywhere && setToModalOpen(true)}
            className={`${INPUT_BOX} ${errRing(!!errors.to)} w-full ${anywhere ? "cursor-default" : ""}`}>
            <div className={INPUT_INNER}>
              <span className={LABEL}>{t("search.to")}</span>
              <div className={VALUE_ROW}>
                {anywhere
                  ? <span className={`${VAL_TEXT} flex items-center gap-1`}><Globe className="w-3.5 h-3.5" /> Everywhere</span>
                  : destinations.length > 0
                    ? <span className={VAL_TEXT}>{destinations.map(d => d.display || d.code).join(", ")}</span>
                    : <span className={PLACEHOLDER_TEXT}>{t("search.where_to")}</span>}
              </div>
            </div>
          </button>
        </div>

        {/* ROW 2 — Depart / Return / Travelers */}
        <div className={`grid gap-3 mt-3 ${tripType === "roundtrip" ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2"}`}>
          {/* DEPART */}
          <div className={`${INPUT_BOX} ${errRing(!!errors.dates)}`}>
            {isAnyDay ? (
              <button type="button" onClick={() => setIsAnyDay(false)} className={INPUT_INNER}>
                <span className={LABEL}>{t("calendar.depart")}</span>
                <div className={VALUE_ROW}><span className={PLACEHOLDER_TEXT}>Any day</span></div>
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
            <div className={`${INPUT_BOX} ${errRing(!!errors.dates)}`}>
              {isAnyDay ? (
                <button type="button" onClick={() => setIsAnyDay(false)} className={INPUT_INNER}>
                  <span className={LABEL}>Return</span>
                  <div className={VALUE_ROW}><span className={PLACEHOLDER_TEXT}>Any day</span></div>
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
          <div className={INPUT_BOX}>
            <TravelersPicker value={travelers} onChange={setTravelers} compact bare segmentMode />
          </div>
        </div>

        {/* ROW 3 — Search button */}
        <div className="mt-4 flex justify-center">
          <Button onClick={handleSearch}
            className="h-[52px] w-full sm:w-[260px] rounded-xl px-8 font-semibold text-base bg-gradient-to-r from-primary to-[hsl(220_85%_52%)] hover:from-primary/90 hover:to-[hsl(220_85%_48%)] text-white transition-all active:scale-[0.98] shadow-[0_4px_16px_hsl(var(--primary)/0.35)] hover:shadow-[0_6px_20px_hsl(var(--primary)/0.45)] cursor-pointer">
            <Search className="w-5 h-5 mr-2" />
            <span>Search Flights</span>
          </Button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          OPTIONS ROW — below the card
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
