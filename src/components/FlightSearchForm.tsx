import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRightLeft, Search, Plane, Navigation, Globe, CalendarOff, CalendarDays, ChevronDown, MapPin, Users, Plus } from "lucide-react";
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
  const [fromRadius, setFromRadius] = useState(150);
  const [toNearby, setToNearby] = useState(false);
  const [toRadius, setToRadius] = useState(150);
  const userCoordsRef = useRef<{ lat: number; lon: number } | null>(null);
  const toCenterRef = useRef<AirportSelection[]>([]);

  const [departFlexBefore, setDepartFlexBefore] = useState(0);
  const [departFlexAfter, setDepartFlexAfter] = useState(0);
  const [returnFlexBefore, setReturnFlexBefore] = useState(0);
  const [returnFlexAfter, setReturnFlexAfter] = useState(0);

  const [tripTypeOpen, setTripTypeOpen] = useState(false);

  // Modal states for segments
  const [fromModalOpen, setFromModalOpen] = useState(false);
  const [toModalOpen, setToModalOpen] = useState(false);

  useEffect(() => {
    if (aiSearchParams) {
      setDestinations([{ code: aiSearchParams.destinationCode, display: aiSearchParams.destinationName }]);
      setErrors(e => ({ ...e, to: undefined }));
      onParamsConsumed?.();
    }
  }, [aiSearchParams, onParamsConsumed]);

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

  const swapLocations = useCallback(() => {
    if (origins.length === 1 && destinations.length === 1) {
      const temp = origins[0];
      setOrigins([destinations[0]]);
      setDestinations([temp]);
    }
  }, [origins, destinations]);

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

  // Display values for segments
  const fromDisplay = origins.length > 0
    ? origins.map(o => o.code).join(", ")
    : "Select origin";

  const toDisplay = anywhere
    ? "Everywhere"
    : destinations.length > 0
      ? destinations.map(d => d.code).join(", ")
      : "Select destination";

  const departDisplay = isAnyDay
    ? "Any day"
    : departDate
      ? format(departDate, "d MMM")
      : "Select date";

  const returnDisplay = isAnyDay
    ? "Any day"
    : returnDate
      ? format(returnDate, "d MMM")
      : "Select date";

  const totalPax = travelers.adults + travelers.children + travelers.infantsSeat;
  const travelersDisplay = `${totalPax} traveller${totalPax !== 1 ? "s" : ""}, ${CABIN_LABELS[travelers.cabinClass] || "Economy"}`;

  if (tripType === "multicity") {
    return (
      <div className="w-full max-w-5xl mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <div className="relative">
            <button onClick={() => setTripTypeOpen(!tripTypeOpen)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-border/60 bg-card/80 text-sm font-medium text-foreground hover:bg-card transition-all">
              {tripTypeLabel} <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            {tripTypeOpen && (
              <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden min-w-[140px]">
                {(["roundtrip", "oneway", "multicity"] as const).map(type => (
                  <button key={type} onClick={() => { setTripType(type); setTripTypeOpen(false); }}
                    className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${tripType === type ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-secondary/60"}`}>
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

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Trip type dropdown */}
      <div className="flex items-center gap-3 mb-2">
        <div className="relative">
          <button onClick={() => setTripTypeOpen(!tripTypeOpen)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-white/5 transition-all">
            {tripTypeLabel} <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          {tripTypeOpen && (
            <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden min-w-[140px]">
              {(["roundtrip", "oneway", "multicity"] as const).map(type => (
                <button key={type} onClick={() => { setTripType(type); setTripTypeOpen(false); }}
                  className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${tripType === type ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-secondary/60"}`}>
                  {type === "roundtrip" ? t("search.roundtrip") : type === "oneway" ? t("search.oneway") : t("search.multicity")}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ═══ SEGMENTED SEARCH BAR ═══ */}
      <div className="search-bar-light bg-white rounded-2xl p-2.5 flex flex-col lg:flex-row lg:items-start gap-2.5 overflow-visible max-w-[1100px] mx-auto shadow-[0_2px_8px_rgba(0,0,0,0.06),0_0_0_1px_rgba(0,0,0,0.04)] relative z-10 pointer-events-auto">

        {/* ── FROM column ── */}
        <div className="flex-1 min-w-0 flex flex-col">
          <button
            type="button"
            onClick={() => setFromModalOpen(true)}
            className={`w-full min-w-0 text-left px-3.5 h-14 rounded-lg border transition-all cursor-pointer
              ${errors.from ? "border-destructive ring-2 ring-destructive/20" : "border-primary/30 hover:border-primary/50 focus:ring-2 focus:ring-primary/25 focus:outline-none"}
              bg-white`}
          >
            <span className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider leading-none mb-0.5 pointer-events-none">From</span>
            <div className="flex items-center gap-1.5 min-w-0 pointer-events-none">
              {origins.length > 0 ? (
                <>
                  <span className="text-sm font-medium text-foreground truncate">{origins.map(o => o.code).join(", ")}</span>
                  <span className="shrink-0 text-[11px] text-primary/70 font-medium flex items-center gap-0.5">
                    <Plus className="w-3 h-3" /> Add
                  </span>
                </>
              ) : (
                <span className="text-sm text-muted-foreground">Select origin</span>
              )}
            </div>
          </button>
          <label className="flex items-center gap-1.5 mt-1.5 ml-3.5 cursor-pointer select-none">
            <Checkbox checked={fromNearby} onCheckedChange={checked => handleFromNearbyToggle(checked === true)} className="h-3.5 w-3.5 rounded-[3px]" />
            <span className="text-[12px] text-muted-foreground/80">Add nearby airports</span>
          </label>
        </div>

        {/* Swap button */}
        <button
          type="button"
          onClick={swapLocations}
          disabled={origins.length !== 1 || destinations.length !== 1 || anywhere}
          className="hidden lg:flex shrink-0 h-14 w-7 items-center justify-center text-muted-foreground hover:text-primary disabled:opacity-30 transition-all z-10 -mx-0.5 self-start cursor-pointer"
        >
          <ArrowRightLeft className="w-3.5 h-3.5 pointer-events-none" />
        </button>

        {/* ── TO column ── */}
        <div className="flex-1 min-w-0 flex flex-col">
          <button
            type="button"
            onClick={() => !anywhere && setToModalOpen(true)}
            className={`w-full min-w-0 text-left px-3.5 h-14 rounded-lg border transition-all cursor-pointer
              ${errors.to ? "border-destructive ring-2 ring-destructive/20" : "border-primary/30 hover:border-primary/50 focus:ring-2 focus:ring-primary/25 focus:outline-none"}
              bg-white ${anywhere ? "cursor-default" : ""}`}
          >
            <span className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider leading-none mb-0.5 pointer-events-none">To</span>
            <div className="flex items-center gap-1.5 min-w-0 pointer-events-none">
              {anywhere ? (
                <span className="text-sm font-medium text-foreground flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5" /> Everywhere
                </span>
              ) : destinations.length > 0 ? (
                <>
                  <span className="text-sm font-medium text-foreground truncate">{destinations.map(d => d.code).join(", ")}</span>
                  <span className="shrink-0 text-[11px] text-primary/70 font-medium flex items-center gap-0.5">
                    <Plus className="w-3 h-3" /> Add
                  </span>
                </>
              ) : (
                <span className="text-sm text-muted-foreground">Select destination</span>
              )}
            </div>
          </button>
          {!anywhere && (
            <label className="flex items-center gap-1.5 mt-1.5 ml-3.5 cursor-pointer select-none">
              <Checkbox checked={toNearby} onCheckedChange={checked => handleToNearbyToggle(checked === true)} className="h-3.5 w-3.5 rounded-[3px]" />
              <span className="text-[12px] text-muted-foreground/80">Add nearby airports</span>
            </label>
          )}
        </div>

        {/* ── DEPART segment ── */}
        <div className="flex flex-col">
          <div className="lg:w-[130px] shrink-0 h-14 rounded-lg border border-primary/30 hover:border-primary/50 transition-all bg-white focus-within:ring-2 focus-within:ring-primary/25">
            {isAnyDay ? (
              <button type="button" onClick={() => setIsAnyDay(false)} className="w-full h-full text-left px-3.5 flex flex-col justify-center cursor-pointer focus:outline-none">
                <span className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider leading-none mb-0.5">Depart</span>
                <span className="block text-sm font-medium text-muted-foreground leading-tight">Any day</span>
              </button>
            ) : (
              <FlightDateRangePicker
                departDate={departDate} returnDate={returnDate}
                onDepartChange={handleDepartChange} onReturnChange={handleReturnChange}
                tripType={tripType as "roundtrip" | "oneway"} onTripTypeChange={handleTripTypeChange} hasError={!!errors.dates}
                bare segmentMode segmentLabel="Depart" segmentDisplay={departDisplay}
              />
            )}
          </div>
        </div>

        {/* Return segment (roundtrip only) */}
        {tripType === "roundtrip" && (
          <div className="flex flex-col">
            <div className="lg:w-[130px] shrink-0 h-14 rounded-lg border border-primary/30 hover:border-primary/50 transition-all bg-white focus-within:ring-2 focus-within:ring-primary/25">
              {isAnyDay ? (
                <button type="button" onClick={() => setIsAnyDay(false)} className="w-full h-full text-left px-3.5 flex flex-col justify-center cursor-pointer focus:outline-none">
                  <span className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider leading-none mb-0.5">Return</span>
                  <span className="block text-sm font-medium text-muted-foreground leading-tight">Any day</span>
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
          </div>
        )}

        {/* ── TRAVELERS segment ── */}
        <div className="flex flex-col">
          <div className="lg:w-[220px] shrink-0 h-14 rounded-lg border border-primary/30 hover:border-primary/50 transition-all bg-white focus-within:ring-2 focus-within:ring-primary/25">
            <TravelersPicker value={travelers} onChange={setTravelers} compact bare segmentMode />
          </div>
        </div>

        {/* Search button */}
        <Button onClick={handleSearch}
          className="shrink-0 h-14 rounded-[10px] px-7 ml-0.5 font-semibold text-base bg-primary hover:bg-primary/90 transition-all active:scale-[0.98] shadow-none self-start cursor-pointer">
          <Search className="w-5 h-5 lg:mr-0 mr-2" />
          <span className="lg:hidden">Search</span>
        </Button>
      </div>

      {/* ── Options row below bar ── */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2.5 px-1 max-w-[1100px] mx-auto">
        <label className="flex items-center gap-1.5 cursor-pointer select-none">
          <Checkbox checked={directOnly} onCheckedChange={checked => setDirectOnly(checked === true)} className="h-3.5 w-3.5 rounded-[3px]" />
          <span className="text-[13px] text-muted-foreground/80">Direct flights only</span>
        </label>

        {isAnyDay && tripType === "roundtrip" && (
          <div className="w-full lg:w-auto mt-1">
            <TripLengthSlider value={tripLength} onChange={setTripLength} />
          </div>
        )}

        {!isAnyDay && departDate && (
          <div className="mt-1">
            <FlexDateControls before={departFlexBefore} after={departFlexAfter} onBeforeChange={setDepartFlexBefore} onAfterChange={setDepartFlexAfter} />
          </div>
        )}

        <div className="flex items-center gap-3 lg:ml-auto mt-0.5">
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
        <DialogContent className="sm:max-w-md p-4">
          <h3 className="font-semibold text-foreground mb-3">Select origin</h3>
          <MultiOriginInput values={origins} onChange={(v) => { handleOriginsChange(v); }} placeholder="Country, city or airport" />
          <div className="mt-3 flex justify-end">
            <Button size="sm" onClick={() => setFromModalOpen(false)}>Done</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── TO modal ── */}
      <Dialog open={toModalOpen} onOpenChange={setToModalOpen}>
        <DialogContent className="sm:max-w-md p-4">
          <h3 className="font-semibold text-foreground mb-3">Select destination</h3>
          <MultiOriginInput values={destinations} onChange={(v) => { handleDestinationsChange(v); }} placeholder="Country, city or airport" multiLabel="Multi-Destination" />
          <div className="mt-2 flex items-center gap-2">
            <Checkbox checked={anywhere} onCheckedChange={(v) => { setAnywhere(v === true); if (v) { setDestinations([]); setToModalOpen(false); } }} className="h-3.5 w-3.5" />
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
