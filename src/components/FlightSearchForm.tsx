import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRightLeft, Search, Plane, Navigation, Globe, CalendarOff, CalendarDays, ChevronDown } from "lucide-react";
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
      <div className="flex items-center gap-2 mb-3">
        <div className="relative">
          <button onClick={() => setTripTypeOpen(!tripTypeOpen)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-white/20 text-sm font-medium text-foreground hover:bg-white/10 transition-all">
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

      {/* Unified search bar */}
      <div className="flex flex-col lg:flex-row lg:items-stretch">
        {/* White bar container */}
        <div className="flex-1 flex flex-col lg:flex-row bg-white rounded-xl lg:rounded-r-none overflow-hidden shadow-lg search-bar-light">
          {/* From segment */}
          <div className="flex-1 min-w-0 relative">
            <div className="px-3 pt-2 pb-0.5">
              <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">From</span>
            </div>
            <div className="px-1 pb-2">
              <MultiOriginInput values={origins} onChange={handleOriginsChange} placeholder="Country, city or airport" bare />
            </div>
            {errors.from && <p className="text-destructive text-[10px] px-3 pb-1">{errors.from}</p>}
            {/* Swap button overlapping divider */}
            <div className="hidden lg:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10">
              <button onClick={swapLocations}
                disabled={origins.length !== 1 || destinations.length !== 1 || anywhere}
                className="h-8 w-8 rounded-full border border-gray-300 bg-white flex items-center justify-center text-gray-400 hover:text-primary hover:border-primary/40 disabled:opacity-30 transition-all">
                <ArrowRightLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="hidden lg:block w-px bg-gray-200 shrink-0" />
          <div className="lg:hidden h-px bg-gray-200" />

          {/* To segment */}
          <div className="flex-1 min-w-0">
            <div className="px-3 pt-2 pb-0.5 flex items-center justify-between">
              <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">To</span>
              <label className="flex items-center gap-1 cursor-pointer select-none">
                <Checkbox checked={anywhere} onCheckedChange={(v) => { setAnywhere(v === true); if (v) setDestinations([]); }} className="h-3 w-3 rounded-[2px] border-gray-400 data-[state=checked]:bg-primary" />
                <span className="text-[10px] text-gray-500">Anywhere</span>
              </label>
            </div>
            <div className="px-1 pb-2">
              {anywhere ? (
                <div className="h-[36px] px-2 flex items-center gap-1.5 text-xs text-primary/70">
                  <Globe className="w-3.5 h-3.5" /> Everywhere
                </div>
              ) : (
                <MultiOriginInput values={destinations} onChange={handleDestinationsChange} placeholder="Country, city or airport" multiLabel="Multi-Destination" bare />
              )}
            </div>
            {errors.to && <p className="text-destructive text-[10px] px-3 pb-1">{errors.to}</p>}
          </div>

          {/* Divider */}
          <div className="hidden lg:block w-px bg-gray-200 shrink-0" />
          <div className="lg:hidden h-px bg-gray-200" />

          {/* Depart segment */}
          <div className="lg:w-[160px] shrink-0">
            <div className="px-3 pt-2 pb-0.5">
              <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Depart</span>
            </div>
            <div className="px-1 pb-2">
              {isAnyDay ? (
                <div className="h-[36px] px-2 flex items-center text-xs text-gray-400">Any day</div>
              ) : (
                <FlightDateRangePicker
                  departDate={departDate} returnDate={returnDate}
                  onDepartChange={handleDepartChange} onReturnChange={handleReturnChange}
                  tripType={tripType as "roundtrip" | "oneway"} onTripTypeChange={handleTripTypeChange} hasError={!!errors.dates}
                  bare
                />
              )}
            </div>
          </div>

          {/* Return segment (roundtrip only) */}
          {tripType === "roundtrip" && (
            <>
              <div className="hidden lg:block w-px bg-gray-200 shrink-0" />
              <div className="lg:hidden h-px bg-gray-200" />
              <div className="lg:w-[160px] shrink-0">
                <div className="px-3 pt-2 pb-0.5">
                  <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Return</span>
                </div>
                <div className="px-2 pb-2">
                  {isAnyDay ? (
                    <div className="h-[36px] flex items-center text-xs text-gray-400">Any day</div>
                  ) : (
                    <div className="h-[36px] flex items-center text-sm text-gray-800">
                      {returnDate ? format(returnDate, "dd MMM yy") : <span className="text-gray-400 text-xs">Select date</span>}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Divider */}
          <div className="hidden lg:block w-px bg-gray-200 shrink-0" />
          <div className="lg:hidden h-px bg-gray-200" />

          {/* Travelers segment */}
          <div className="lg:w-[200px] shrink-0">
            <div className="px-3 pt-2 pb-0.5">
              <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Travelers & Class</span>
            </div>
            <div className="px-1 pb-2">
              <TravelersPicker value={travelers} onChange={setTravelers} compact bare />
            </div>
          </div>
        </div>

        {/* Search button — attached to bar */}
        <Button onClick={handleSearch}
          className="h-auto lg:rounded-l-none rounded-xl lg:rounded-r-xl px-6 font-semibold text-sm bg-primary hover:bg-primary/90 transition-all active:scale-[0.98] min-h-[56px] lg:min-h-0 mt-2 lg:mt-0">
          <Search className="w-5 h-5" />
        </Button>
      </div>

      {/* Row below: checkboxes */}
      <div className="flex flex-wrap items-start gap-x-6 gap-y-1.5 mt-3 px-1">
        <NearbyToggle enabled={fromNearby} onToggle={handleFromNearbyToggle} radius={fromRadius} onRadiusChange={setFromRadius} />
        {!anywhere && (
          <NearbyToggle enabled={toNearby} onToggle={handleToNearbyToggle} radius={toRadius} onRadiusChange={setToRadius} />
        )}

        <label className="flex items-center gap-1.5 cursor-pointer select-none mt-1.5">
          <Checkbox checked={directOnly} onCheckedChange={checked => setDirectOnly(checked === true)} className="h-3.5 w-3.5 rounded-[3px]" />
          <span className="text-[11px] text-muted-foreground">Direct flights</span>
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

        <div className="flex items-center gap-3 lg:ml-auto mt-1.5">
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
    </div>
  );
};

export default FlightSearchForm;
