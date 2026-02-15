import { useState, useCallback, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRightLeft, Search, Plane, Navigation } from "lucide-react";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import AirportAutocomplete from "./AirportAutocomplete";
import MultiOriginInput, { type AirportSelection } from "./MultiOriginInput";
import FlightDateRangePicker from "./FlightDateRangePicker";
import TravelersPicker, { TravelersData } from "./TravelersPicker";
import MultiCitySearchForm from "./MultiCitySearchForm";
import { getDefaultDates } from "@/lib/dateUtils";
import { AIRPORTS, calculateDistance } from "@/lib/airports";
import type { AISearchParams } from "./FlightSearchHero";

interface FlightSearchFormProps {
  aiSearchParams?: AISearchParams | null;
  onParamsConsumed?: () => void;
}

type TripType = "roundtrip" | "oneway" | "multicity";

const FlightSearchForm = ({ aiSearchParams, onParamsConsumed }: FlightSearchFormProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const defaultDates = useMemo(() => getDefaultDates(), []);
  
  const [tripType, setTripType] = useState<TripType>("roundtrip");
  const [origins, setOrigins] = useState<AirportSelection[]>([]);
  const [to, setTo] = useState<AirportSelection | null>(null);
  const [departDate, setDepartDate] = useState<Date | null>(defaultDates.depart);
  const [returnDate, setReturnDate] = useState<Date | null>(defaultDates.return);
  const [travelers, setTravelers] = useState<TravelersData>({
    adults: 1,
    children: 0,
    infantsSeat: 0,
    infantsLap: 0,
    cabinClass: "economy",
  });
  const [directOnly, setDirectOnly] = useState(false);
  const [errors, setErrors] = useState<{ from?: string; to?: string; dates?: string }>({});
  

  // Handle AI search params
  useEffect(() => {
    if (aiSearchParams) {
      setTo({
        code: aiSearchParams.destinationCode,
        display: aiSearchParams.destinationName,
      });
      setErrors(e => ({ ...e, to: undefined }));
      onParamsConsumed?.();
      onParamsConsumed?.();
    }
  }, [aiSearchParams, onParamsConsumed]);

  const swapLocations = useCallback(() => {
    if (origins.length === 1 && to) {
      const temp = origins[0];
      setOrigins([to]);
      setTo(temp);
    }
  }, [origins, to]);

  const validate = useCallback((): boolean => {
    const newErrors: { from?: string; to?: string; dates?: string } = {};
    
    if (origins.length === 0) newErrors.from = "Please select origin";
    if (!to) newErrors.to = "Please select destination";
    if (!departDate) newErrors.dates = "Please select departure date";
    if (tripType === "roundtrip" && !returnDate) newErrors.dates = "Please select return date";
    if (tripType === "roundtrip" && departDate && returnDate && returnDate <= departDate) {
      newErrors.dates = "Return date must be after departure";
    }
    const totalInfants = travelers.infantsSeat + travelers.infantsLap;
    if (totalInfants > travelers.adults) newErrors.dates = "Each infant needs an adult";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [origins, to, tripType, returnDate, departDate, travelers]);

  const handleSearch = useCallback(() => {
    if (!validate()) return;

    const totalInfants = travelers.infantsSeat + travelers.infantsLap;
    const originCodes = origins.map(o => o.code).join(",");

    const params = new URLSearchParams({
      trip: tripType,
      from: originCodes,
      to: to!.code,
      depart: format(departDate!, "yyyy-MM-dd"),
      adults: travelers.adults.toString(),
      children: travelers.children.toString(),
      infants: totalInfants.toString(),
      class: travelers.cabinClass,
      direct: directOnly.toString(),
    });

    if (tripType === "roundtrip" && returnDate) {
      params.set("return", format(returnDate, "yyyy-MM-dd"));
    }

    navigate(`/flights/results?${params.toString()}`);
  }, [validate, tripType, origins, to, departDate, travelers, directOnly, returnDate, navigate]);

  const handleOriginsChange = useCallback((vals: AirportSelection[]) => {
    setOrigins(vals);
    setErrors(e => ({ ...e, from: undefined }));
  }, []);

  const handleToChange = useCallback((val: AirportSelection | null) => {
    setTo(val);
    setErrors(e => ({ ...e, to: undefined }));
  }, []);

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
      <div className="gradient-border bg-card rounded-2xl p-4 sm:p-6 md:p-8 w-full max-w-5xl mx-auto">
        <div className="flex gap-1.5 sm:gap-2 mb-4 sm:mb-5 overflow-x-auto">
          {(["roundtrip", "oneway", "multicity"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setTripType(type)}
              className={`px-3 sm:px-4 py-2 rounded-lg font-medium text-xs sm:text-sm transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                tripType === type
                  ? "bg-gradient-to-r from-primary to-accent text-white"
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
    <div className="gradient-border bg-card rounded-2xl p-4 sm:p-6 md:p-8 w-full max-w-5xl mx-auto">
      {/* Trip Type Toggle */}
      <div className="flex gap-1.5 sm:gap-2 mb-4 sm:mb-5 overflow-x-auto">
        {(["roundtrip", "oneway", "multicity"] as const).map((type) => (
          <button
            key={type}
            onClick={() => setTripType(type)}
            className={`px-3 sm:px-4 py-2 rounded-lg font-medium text-xs sm:text-sm transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
              tripType === type
                ? "bg-gradient-to-r from-primary to-accent text-white"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {type === "roundtrip" ? t("search.roundtrip") : type === "oneway" ? t("search.oneway") : t("search.multicity")}
          </button>
        ))}
      </div>

      {/* Search Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 items-end">
        {/* From — Multi-Origin */}
        <div className="lg:col-span-3 relative min-w-0">
          <label className="block text-xs font-medium text-muted-foreground mb-2">{t("search.from")}</label>
          <MultiOriginInput
            values={origins}
            onChange={handleOriginsChange}
            placeholder="Where from?"
          />
          {errors.from && <p className="text-destructive text-xs mt-1 truncate">{errors.from}</p>}
          {origins.length > 1 && (
            <p className="text-xs text-accent mt-1">Compare multiple departure airports at once</p>
          )}
        </div>

        {/* Swap Button */}
        <div className="hidden lg:flex lg:col-span-1 justify-center">
          {origins.length > 1 ? (
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
          <label className="block text-xs font-medium text-muted-foreground mb-2">{t("search.to")}</label>
          <AirportAutocomplete
            value={to}
            onChange={handleToChange}
            placeholder="Where to?"
            icon="to"
            hasError={!!errors.to}
          />
          {errors.to && <p className="text-destructive text-xs mt-1 truncate">{errors.to}</p>}
        </div>

        {/* Date Range Picker */}
        <div className="lg:col-span-3 min-w-0">
          <FlightDateRangePicker
            departDate={departDate}
            returnDate={returnDate}
            onDepartChange={handleDepartChange}
            onReturnChange={handleReturnChange}
            tripType={tripType as "roundtrip" | "oneway"}
            onTripTypeChange={handleTripTypeChange}
            hasError={!!errors.dates}
          />
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
      <div className="mt-4 sm:mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
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

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (!navigator.geolocation) return;
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  let nearest = null as any;
                  let minDist = Infinity;
                  for (const a of AIRPORTS) {
                    const d = calculateDistance(pos.coords.latitude, pos.coords.longitude, a.lat, a.lon);
                    if (d < minDist) { minDist = d; nearest = a; }
                  }
                  if (nearest) {
                    setOrigins([{ code: nearest.code, display: `${nearest.city} (${nearest.code})` }]);
                    setErrors(e => ({ ...e, from: undefined }));
                  }
                },
                () => { /* permission denied — silent */ }
              );
            }}
            className="gap-1.5 h-11 sm:h-auto"
          >
            <Navigation className="w-3.5 h-3.5" />
            {t("search.use_location", "Use my location")}
          </Button>
          <Button 
            size="lg" 
            onClick={handleSearch}
            className="gap-2 px-8 h-12 sm:h-auto bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity active:scale-[0.98]"
          >
            <Search className="w-4 h-4" />
            {t("search.search_flights")}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FlightSearchForm;
