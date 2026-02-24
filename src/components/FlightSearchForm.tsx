import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRightLeft, Search, Plane, Navigation, Globe, CalendarOff, CalendarDays } from "lucide-react";
import { format, addDays } from "date-fns";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  
  const defaultDates = useMemo(() => getDefaultDates(), []);
  
  const [tripType, setTripType] = useState<TripType>("roundtrip");
  const [origins, setOrigins] = useState<AirportSelection[]>([]);
  const [destinations, setDestinations] = useState<AirportSelection[]>([]);
  const [anywhere, setAnywhere] = useState(false);
  const [departDate, setDepartDate] = useState<Date | null>(null);
  const [returnDate, setReturnDate] = useState<Date | null>(null);
  const [isAnyDay, setIsAnyDay] = useState(true);
  const [tripLength, setTripLength] = useState<[number, number]>([7, 7]);
  const [travelers, setTravelers] = useState<TravelersData>({
    adults: 1,
    children: 0,
    infantsSeat: 0,
    infantsLap: 0,
    cabinClass: "economy",
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
      setDestinations([{
        code: aiSearchParams.destinationCode,
        display: aiSearchParams.destinationName,
      }]);
      setErrors(e => ({ ...e, to: undefined }));
      onParamsConsumed?.();
    }
  }, [aiSearchParams, onParamsConsumed]);

  // Nearby: From
  const fillNearbyOrigins = useCallback(
    (lat: number, lon: number, radius: number) => {
      const nearby = getAirportsInRadius(lat, lon, radius);
      setOrigins(nearby.slice(0, 6).map((a) => ({ code: a.code, display: `${a.city} (${a.code})` })));
    },
    []
  );

  const handleFromNearbyToggle = useCallback(
    async (enabled: boolean) => {
      setFromNearby(enabled);
      if (!enabled) return;
      if (userCoordsRef.current) {
        fillNearbyOrigins(userCoordsRef.current.lat, userCoordsRef.current.lon, fromRadius);
        return;
      }
      if (!navigator.geolocation) {
        toast.error("Geolocation not supported by your browser.");
        setFromNearby(false);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          userCoordsRef.current = { lat: pos.coords.latitude, lon: pos.coords.longitude };
          fillNearbyOrigins(pos.coords.latitude, pos.coords.longitude, fromRadius);
        },
        () => {
          toast.error("Location permission denied — please type an airport.");
          setFromNearby(false);
        },
        { enableHighAccuracy: false, timeout: 8000 }
      );
    },
    [fromRadius, fillNearbyOrigins]
  );

  useEffect(() => {
    if (fromNearby && userCoordsRef.current) {
      fillNearbyOrigins(userCoordsRef.current.lat, userCoordsRef.current.lon, fromRadius);
    }
  }, [fromRadius, fromNearby, fillNearbyOrigins]);

  // Nearby: To
  const expandToNearby = useCallback(
    (centers: AirportSelection[], radius: number) => {
      const expanded: AirportSelection[] = [];
      const seen = new Set<string>();
      for (const dest of centers) {
        if (!seen.has(dest.code)) { expanded.push(dest); seen.add(dest.code); }
        const airport = AIRPORTS.find((a) => a.code.toUpperCase() === dest.code.toUpperCase());
        if (airport) {
          for (const a of getAirportsInRadius(airport.lat, airport.lon, radius)) {
            if (!seen.has(a.code)) {
              expanded.push({ code: a.code, display: `${a.city} (${a.code})` });
              seen.add(a.code);
            }
          }
        }
      }
      setDestinations(expanded.slice(0, 6));
    },
    []
  );

  const handleToNearbyToggle = useCallback(
    (enabled: boolean) => {
      setToNearby(enabled);
      if (!enabled) return;
      if (destinations.length === 0) {
        toast.info("Select a destination first, then enable nearby airports.");
        setToNearby(false);
        return;
      }
      toCenterRef.current = [...destinations];
      expandToNearby(destinations, toRadius);
    },
    [destinations, toRadius, expandToNearby]
  );

  useEffect(() => {
    if (toNearby && toCenterRef.current.length > 0) {
      expandToNearby(toCenterRef.current, toRadius);
    }
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
    if (!isAnyDay && tripType === "roundtrip" && departDate && returnDate && returnDate <= departDate) {
      newErrors.dates = "Return date must be after departure";
    }
    const totalInfants = travelers.infantsSeat + travelers.infantsLap;
    if (totalInfants > travelers.adults) newErrors.dates = "Each infant needs an adult";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [origins, destinations, anywhere, isAnyDay, tripType, returnDate, departDate, travelers]);

  const handleSearch = useCallback(() => {
    if (!validate()) return;

    if (anywhere) {
      navigate(`/explore?from=${origins.map((o) => o.code).join(",")}`);
      return;
    }

    const totalInfants = travelers.infantsSeat + travelers.infantsLap;
    const originCodes = origins.map(o => o.code).join(",");
    const destCodes = destinations.map(d => d.code).join(",");

    const params = new URLSearchParams({
      trip: tripType,
      from: originCodes,
      to: destCodes,
      adults: travelers.adults.toString(),
      children: travelers.children.toString(),
      infants: totalInfants.toString(),
      class: travelers.cabinClass,
      direct: directOnly.toString(),
      currency: currency.toUpperCase(),
      market: marketCode.toUpperCase(),
    });

    if (isAnyDay) {
      // Any day mode: generate a depart date ~14 days out and pass trip length
      const defaultDepart = addDays(new Date(), 14);
      params.set("depart", format(defaultDepart, "yyyy-MM-dd"));
      params.set("anyday", "true");
      params.set("tripmin", tripLength[0].toString());
      params.set("tripmax", tripLength[1].toString());
      if (tripType === "roundtrip") {
        params.set("return", format(addDays(defaultDepart, tripLength[1]), "yyyy-MM-dd"));
      }
      // Large flex window to cover next 6 months worth of dates
      params.set("dfa", "180");
      params.set("dfb", "0");
    } else {
      params.set("depart", format(departDate!, "yyyy-MM-dd"));
      if (tripType === "roundtrip" && returnDate) {
        params.set("return", format(returnDate, "yyyy-MM-dd"));
      }
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

  const handleDepartChange = useCallback((date: Date | null) => {
    setDepartDate(date);
    setErrors(e => ({ ...e, dates: undefined }));
  }, []);

  const handleReturnChange = useCallback((date: Date | null) => {
    setReturnDate(date);
    setErrors(e => ({ ...e, dates: undefined }));
  }, []);

  const handleTripTypeChange = useCallback((type: "roundtrip" | "oneway") => {
    setTripType(type);
  }, []);

  const handleMultiCitySearch = useCallback((segments: any[], travelersData: TravelersData) => {
    const validSegments = segments.filter(
      (seg) => seg.from?.code && seg.to?.code && seg.date
    );
    if (validSegments.length < 2) return;

    const params = new URLSearchParams({
      trip: "multicity",
      adults: travelersData.adults.toString(),
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

  // Multi-city mode — same outer card as other tabs
  if (tripType === "multicity") {
    return (
    <div className="gradient-border bg-card rounded-xl p-6 sm:p-7 md:p-8 w-full max-w-5xl mx-auto">
        {/* Flights context row */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4 pb-4 border-b border-border/50">
          <Plane className="w-3.5 h-3.5 text-primary" />
          <span className="font-semibold text-foreground/80">Flights</span>
          <span className="text-muted-foreground/50">•</span>
          <span>Compare airline & agency prices</span>
          <span className="text-muted-foreground/50 hidden sm:inline">•</span>
          <span className="hidden sm:inline">Secure booking via verified partners</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mb-5 sm:mb-6">
          {(["roundtrip", "oneway", "multicity"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setTripType(type)}
              className={`min-w-0 px-2 sm:px-4 py-2.5 rounded-lg font-medium text-xs sm:text-sm transition-all duration-200 truncate ${
                tripType === type
                  ? "bg-primary text-white"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {type === "roundtrip" ? t("search.roundtrip") : type === "oneway" ? t("search.oneway") : t("search.multicity")}
            </button>
          ))}
        </div>
        <MultiCitySearchForm onSearch={handleMultiCitySearch} />
      </div>
    );
  }

  return (
    <div className="gradient-border bg-card rounded-xl p-6 sm:p-7 md:p-8 w-full max-w-5xl mx-auto">
      {/* Flights context row */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4 pb-4 border-b border-border/50">
        <Plane className="w-3.5 h-3.5 text-primary" />
        <span className="font-semibold text-foreground/80">Flights</span>
        <span className="text-muted-foreground/50">•</span>
        <span>Compare airline & agency prices</span>
        <span className="text-muted-foreground/50 hidden sm:inline">•</span>
        <span className="hidden sm:inline">Secure booking via verified partners</span>
      </div>
      {/* Trip Type Toggle */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mb-5 sm:mb-6">
        {(["roundtrip", "oneway", "multicity"] as const).map((type) => (
          <button
            key={type}
            onClick={() => setTripType(type)}
            className={`min-w-0 px-2 sm:px-4 py-2.5 rounded-lg font-medium text-xs sm:text-sm transition-all duration-200 truncate ${
              tripType === type
                ? "bg-primary text-white"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {type === "roundtrip" ? t("search.roundtrip") : type === "oneway" ? t("search.oneway") : t("search.multicity")}
          </button>
        ))}
      </div>

      {/* Search Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5 items-end">
        {/* From — Multi-Origin */}
        <div className="lg:col-span-3 relative min-w-0">
          <label className="block text-xs font-medium text-muted-foreground mb-2">{t("search.from")}</label>
          <MultiOriginInput
            values={origins}
            onChange={handleOriginsChange}
            placeholder="Where from?"
          />
          {errors.from && <p className="text-destructive text-xs mt-1 truncate">{errors.from}</p>}
          <NearbyToggle
            enabled={fromNearby}
            onToggle={handleFromNearbyToggle}
            radius={fromRadius}
            onRadiusChange={setFromRadius}
          />
        </div>

        {/* Swap Button */}
        <div className="hidden lg:flex lg:col-span-1 justify-center">
          {origins.length > 1 || anywhere ? (
            <div className="rounded-full h-10 w-10 border-2 border-dashed border-border/30 flex items-center justify-center shrink-0 opacity-30 cursor-not-allowed" title="Swap isn't available in multi-origin mode">
              <ArrowRightLeft className="w-4 h-4 text-muted-foreground" />
            </div>
          ) : (
            <Button
              variant="outline"
              size="icon"
              onClick={swapLocations}
              className="rounded-full h-10 w-10 border-2 border-dashed border-border hover:border-primary hover:text-primary transition-all bg-background shrink-0"
            >
              <ArrowRightLeft className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* To */}
        <div className="lg:col-span-3 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-medium text-muted-foreground">{t("search.to")}</label>
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <Switch
                checked={anywhere}
                onCheckedChange={(v) => {
                  setAnywhere(v);
                  if (v) setDestinations([]);
                }}
                className="scale-[0.6] origin-right"
              />
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Globe className="w-3 h-3" /> Anywhere
              </span>
            </label>
          </div>
          {anywhere ? (
            <div className="min-h-[52px] px-3 py-3 bg-secondary/50 rounded-xl border-2 border-dashed border-primary/30 flex items-center gap-2 text-sm text-primary/70">
              <Globe className="w-4 h-4" />
              Searching everywhere
            </div>
          ) : (
            <>
              <MultiOriginInput
                values={destinations}
                onChange={handleDestinationsChange}
                placeholder="Where to?"
                multiLabel="Multi-Destination"
              />
              <NearbyToggle
                enabled={toNearby}
                onToggle={handleToNearbyToggle}
                radius={toRadius}
                onRadiusChange={setToRadius}
              />
            </>
          )}
          {errors.to && <p className="text-destructive text-xs mt-1 truncate">{errors.to}</p>}
        </div>

        {/* Date Range Picker */}
        <div className="lg:col-span-3 min-w-0">
          {/* Any Day / Pick Dates toggle */}
          <div className="flex items-center gap-1.5 mb-2">
            <button
              type="button"
              onClick={() => { setIsAnyDay(true); setDepartDate(null); setReturnDate(null); }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                isAnyDay
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              <CalendarOff className="w-3 h-3" />
              Any day
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAnyDay(false);
                if (!departDate) {
                  const defaults = getDefaultDates();
                  setDepartDate(defaults.depart);
                  setReturnDate(defaults.return);
                }
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                !isAnyDay
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              <CalendarDays className="w-3 h-3" />
              Pick dates
            </button>
          </div>

          {isAnyDay ? (
            <div className="space-y-2">
              <div className="min-h-[56px] px-3 py-3 bg-secondary/50 rounded-xl border-2 border-dashed border-primary/20 flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarOff className="w-4 h-4 text-primary/50 shrink-0" />
                <span>Any day • Next 6 months</span>
              </div>
              {tripType === "roundtrip" && (
                <TripLengthSlider
                  value={tripLength}
                  onChange={setTripLength}
                />
              )}
            </div>
          ) : (
            <>
              <FlightDateRangePicker
                departDate={departDate}
                returnDate={returnDate}
                onDepartChange={handleDepartChange}
                onReturnChange={handleReturnChange}
                tripType={tripType as "roundtrip" | "oneway"}
                onTripTypeChange={handleTripTypeChange}
                hasError={!!errors.dates}
              />
              <FlexDateControls
                before={departFlexBefore}
                after={departFlexAfter}
                onBeforeChange={setDepartFlexBefore}
                onAfterChange={setDepartFlexAfter}
              />
              {tripType === "roundtrip" && (
                <div className="mt-1">
                  <span className="text-[10px] text-muted-foreground">Return flex:</span>
                  <FlexDateControls
                    before={returnFlexBefore}
                    after={returnFlexAfter}
                    onBeforeChange={setReturnFlexBefore}
                    onAfterChange={setReturnFlexAfter}
                  />
                </div>
              )}
            </>
          )}
          {errors.dates && <p className="text-destructive text-xs mt-1 truncate">{errors.dates}</p>}
        </div>

        {/* Travelers Picker */}
        <div className="lg:col-span-2 min-w-0">
          <TravelersPicker
            value={travelers}
            onChange={setTravelers}
          />
        </div>
      </div>

      {/* Options Row */}
      <div className="mt-5 sm:mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Checkbox
            id="direct-only"
            checked={directOnly}
            onCheckedChange={(checked) => setDirectOnly(checked === true)}
            className="border-muted-foreground data-[state=checked]:bg-primary data-[state=checked]:border-primary"
          />
          <Label 
            htmlFor="direct-only" 
            className="text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors flex items-center gap-1"
          >
            <Plane className="w-3 h-3" />
            {t("search.direct_flights_only")}
          </Label>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={async () => {
              const result = await requestNearestAirport();
              if (result) {
                setOrigins([{ code: result.airport.code, display: `${result.airport.city} (${result.airport.code})` }]);
                setErrors(e => ({ ...e, from: undefined }));
              }
            }}
            className="gap-2 min-h-[44px] h-[52px] sm:h-12 px-5 rounded-lg font-semibold text-sm w-full sm:w-auto whitespace-nowrap shrink-0 border-border hover:border-primary/40 hover:bg-secondary/80 transition-all"
          >
            <Navigation className="w-4 h-4" />
            {t("search.use_location", "Use my location")}
          </Button>
          <Button 
            onClick={handleSearch}
            className="gap-2 min-h-[44px] h-[52px] sm:h-12 px-6 sm:px-8 rounded-lg font-semibold text-sm sm:text-base min-w-[180px] w-full sm:w-auto bg-primary hover:bg-[hsl(217,91%,63%)] transition-all active:scale-[0.98] shadow-lg shadow-primary/15"
          >
            <Search className="w-4 h-4" />
            {anywhere ? "Explore Destinations" : t("search.search_flights")}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FlightSearchForm;
