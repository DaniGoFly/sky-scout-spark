import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRightLeft, Search, Plane, Navigation, Globe, CalendarOff, CalendarDays, MapPin } from "lucide-react";
import { format, addDays } from "date-fns";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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

  // Nearby airports state
  const [fromNearby, setFromNearby] = useState(false);
  const [fromRadius, setFromRadius] = useState(150);
  const [toNearby, setToNearby] = useState(false);
  const [toRadius, setToRadius] = useState(150);
  const userCoordsRef = useRef<{ lat: number; lon: number } | null>(null);
  const toCenterRef = useRef<AirportSelection[]>([]);

  // Flex dates state
  const [departFlexBefore, setDepartFlexBefore] = useState(0);
  const [departFlexAfter, setDepartFlexAfter] = useState(0);
  const [returnFlexBefore, setReturnFlexBefore] = useState(0);
  const [returnFlexAfter, setReturnFlexAfter] = useState(0);

  // Handle AI search params
  useEffect(() => {
    if (aiSearchParams) {
      setDestinations([{ code: aiSearchParams.destinationCode, display: aiSearchParams.destinationName }]);
      setErrors(e => ({ ...e, to: undefined }));
      onParamsConsumed?.();
    }
  }, [aiSearchParams, onParamsConsumed]);

  /* ── Nearby: From ── */
  const fillNearbyOrigins = useCallback(
    (lat: number, lon: number, radius: number) => {
      const nearby = getAirportsInRadius(lat, lon, radius);
      setOrigins(nearby.slice(0, 6).map(a => ({ code: a.code, display: `${a.city} (${a.code})` })));
    }, []
  );

  const handleFromNearbyToggle = useCallback(async (enabled: boolean) => {
    setFromNearby(enabled);
    if (!enabled) return;
    if (userCoordsRef.current) {
      fillNearbyOrigins(userCoordsRef.current.lat, userCoordsRef.current.lon, fromRadius);
      return;
    }
    if (!navigator.geolocation) { toast.error("Geolocation not supported."); setFromNearby(false); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        userCoordsRef.current = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        fillNearbyOrigins(pos.coords.latitude, pos.coords.longitude, fromRadius);
      },
      () => { toast.error("Location permission denied."); setFromNearby(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [fromRadius, fillNearbyOrigins]);

  useEffect(() => {
    if (fromNearby && userCoordsRef.current) fillNearbyOrigins(userCoordsRef.current.lat, userCoordsRef.current.lon, fromRadius);
  }, [fromRadius, fromNearby, fillNearbyOrigins]);

  /* ── Nearby: To ── */
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

  /* ── Multi-city tab ── */
  if (tripType === "multicity") {
    return (
      <div className="w-full max-w-6xl mx-auto">
        <div className="flex items-center gap-1 mb-4">
          {(["roundtrip", "oneway", "multicity"] as const).map(type => (
            <button key={type} onClick={() => setTripType(type)}
              className={`px-3 py-1.5 rounded-full font-medium text-xs transition-all ${tripType === type ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"}`}>
              {type === "roundtrip" ? t("search.roundtrip") : type === "oneway" ? t("search.oneway") : t("search.multicity")}
            </button>
          ))}
        </div>
        <MultiCitySearchForm onSearch={handleMultiCitySearch} />
      </div>
    );
  }

  /* ── Main inline search form ── */
  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Row 1: Trip type pills */}
      <div className="flex items-center gap-1 mb-3">
        {(["roundtrip", "oneway", "multicity"] as const).map(type => (
          <button key={type} onClick={() => setTripType(type)}
            className={`px-3 py-1.5 rounded-full font-medium text-xs transition-all ${tripType === type ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"}`}>
            {type === "roundtrip" ? t("search.roundtrip") : type === "oneway" ? t("search.oneway") : t("search.multicity")}
          </button>
        ))}

        {/* Date mode pills */}
        <div className="ml-auto flex items-center gap-1">
          <button type="button" onClick={() => setIsAnyDay(false)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all ${!isAnyDay ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
            <CalendarDays className="w-3 h-3" /> Pick dates
          </button>
          <button type="button" onClick={() => { setIsAnyDay(true); setDepartDate(null); setReturnDate(null); }}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all ${isAnyDay ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
            <CalendarOff className="w-3 h-3" /> Any day
          </button>
        </div>
      </div>

      {/* Row 2: Main search bar — all inputs in one line */}
      <div className="flex flex-col lg:flex-row lg:items-end gap-2">
        {/* From */}
        <div className="flex-1 min-w-0">
          <label className="block text-[11px] font-medium text-muted-foreground mb-1 pl-1">From</label>
          <MultiOriginInput values={origins} onChange={handleOriginsChange} placeholder="Where from?" />
          {errors.from && <p className="text-destructive text-[10px] mt-0.5 pl-1">{errors.from}</p>}
        </div>

        {/* Swap */}
        <div className="hidden lg:flex items-center pb-0.5">
          <Button variant="ghost" size="icon" onClick={swapLocations}
            disabled={origins.length !== 1 || destinations.length !== 1 || anywhere}
            className="rounded-full h-8 w-8 text-muted-foreground hover:text-primary disabled:opacity-30">
            <ArrowRightLeft className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* To */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1 pl-1">
            <label className="text-[11px] font-medium text-muted-foreground">To</label>
            <label className="flex items-center gap-1 cursor-pointer select-none">
              <Checkbox
                checked={anywhere}
                onCheckedChange={(v) => { setAnywhere(v === true); if (v) setDestinations([]); }}
                className="h-3 w-3 rounded-[2px]"
              />
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <Globe className="w-2.5 h-2.5" /> Anywhere
              </span>
            </label>
          </div>
          {anywhere ? (
            <div className="h-[42px] px-3 bg-secondary/40 rounded-lg border border-dashed border-primary/30 flex items-center gap-2 text-xs text-primary/70">
              <Globe className="w-3.5 h-3.5" /> Everywhere
            </div>
          ) : (
            <MultiOriginInput values={destinations} onChange={handleDestinationsChange} placeholder="Where to?" multiLabel="Multi-Destination" />
          )}
          {errors.to && <p className="text-destructive text-[10px] mt-0.5 pl-1">{errors.to}</p>}
        </div>

        {/* Dates */}
        <div className="lg:w-[220px] min-w-0">
          <label className="block text-[11px] font-medium text-muted-foreground mb-1 pl-1">Dates</label>
          {isAnyDay ? (
            <div className="h-[42px] px-3 bg-secondary/40 rounded-lg border border-border/60 flex items-center gap-2 text-xs text-muted-foreground">
              <CalendarOff className="w-3.5 h-3.5 text-primary/50 shrink-0" />
              <span className="truncate">Any day · 6 months</span>
            </div>
          ) : (
            <FlightDateRangePicker
              departDate={departDate} returnDate={returnDate}
              onDepartChange={handleDepartChange} onReturnChange={handleReturnChange}
              tripType={tripType as "roundtrip" | "oneway"} onTripTypeChange={handleTripTypeChange} hasError={!!errors.dates}
            />
          )}
          {errors.dates && <p className="text-destructive text-[10px] mt-0.5 pl-1">{errors.dates}</p>}
        </div>

        {/* Travelers */}
        <div className="lg:w-[180px] min-w-0">
          <TravelersPicker value={travelers} onChange={setTravelers} compact />
        </div>

        {/* Search Button */}
        <Button onClick={handleSearch}
          className="h-[42px] px-6 rounded-lg font-semibold text-sm whitespace-nowrap bg-primary hover:bg-primary/90 transition-all active:scale-[0.98] shadow-lg shadow-primary/20">
          <Search className="w-4 h-4 mr-1.5" />
          {anywhere ? "Explore" : t("search.search_flights")}
        </Button>
      </div>

      {/* Row 3: Options row — nearby checkboxes, direct flights, location */}
      <div className="flex flex-col lg:flex-row lg:items-start gap-x-6 gap-y-1 mt-2">
        {/* From nearby */}
        <div className="flex-1 min-w-0">
          <NearbyToggle enabled={fromNearby} onToggle={handleFromNearbyToggle} radius={fromRadius} onRadiusChange={setFromRadius} />
        </div>

        {/* Spacer for swap button area */}
        <div className="hidden lg:block w-8 shrink-0" />

        {/* To nearby */}
        <div className="flex-1 min-w-0">
          {!anywhere && (
            <NearbyToggle enabled={toNearby} onToggle={handleToNearbyToggle} radius={toRadius} onRadiusChange={setToRadius} />
          )}
        </div>

        {/* Any day trip length */}
        {isAnyDay && tripType === "roundtrip" && (
          <div className="lg:w-[220px]">
            <TripLengthSlider value={tripLength} onChange={setTripLength} />
          </div>
        )}

        {/* Flex dates */}
        {!isAnyDay && departDate && (
          <div className="lg:w-[220px]">
            <FlexDateControls before={departFlexBefore} after={departFlexAfter} onBeforeChange={setDepartFlexBefore} onAfterChange={setDepartFlexAfter} />
          </div>
        )}

        {/* Right-side utilities */}
        <div className="flex items-center gap-3 mt-1 lg:mt-0 lg:ml-auto shrink-0">
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <Checkbox id="direct-only" checked={directOnly} onCheckedChange={checked => setDirectOnly(checked === true)}
              className="h-3.5 w-3.5 rounded-[3px]" />
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Plane className="w-3 h-3" /> Direct only
            </span>
          </label>

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
        </div>
      </div>
    </div>
  );
};

export default FlightSearchForm;
