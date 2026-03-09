import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ArrowRightLeft, Calendar, Search, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format, parse } from "date-fns";
import AirportAutocomplete from "./AirportAutocomplete";
import MultiOriginInput, { type AirportSelection } from "./MultiOriginInput";
import TravelersPicker, { TravelersData } from "./TravelersPicker";
import { getDefaultDates } from "@/lib/dateUtils";
import { toast } from "sonner";
import { useLocale } from "@/hooks/useLocale";

interface CompactSearchBarProps {
  isSearching?: boolean;
  onForceSearch?: () => void;
}

const CompactSearchBar = ({ isSearching = false, onForceSearch }: CompactSearchBarProps) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { currency, marketCode } = useLocale();
  
  const defaultDates = getDefaultDates();
  
  const [tripType, setTripType] = useState<"roundtrip" | "oneway">(
    (searchParams.get("trip") as "roundtrip" | "oneway") || "roundtrip"
  );
  
  const fromParam = searchParams.get("from") || "";
  const fromCodes = fromParam.split(",").map(s => s.trim()).filter(Boolean);
  
  const [origins, setOrigins] = useState<AirportSelection[]>(
    fromCodes.map(code => ({ code, display: code }))
  );
  
  const toCode = searchParams.get("to")?.split(",")[0] || "";
  const [to, setTo] = useState<AirportSelection | null>(
    toCode ? { code: toCode, display: toCode } : null
  );
  
  const [departDate, setDepartDate] = useState<Date>(() => {
    const dateStr = searchParams.get("depart");
    return dateStr ? parse(dateStr, "yyyy-MM-dd", new Date()) : defaultDates.depart;
  });
  const [returnDate, setReturnDate] = useState<Date>(() => {
    const dateStr = searchParams.get("return");
    return dateStr ? parse(dateStr, "yyyy-MM-dd", new Date()) : defaultDates.return;
  });

  // Parse full traveler data from URL params
  const [travelers, setTravelers] = useState<TravelersData>(() => {
    const adults = Number(searchParams.get("adults")) || 1;
    const children = Number(searchParams.get("children")) || 0;
    const infants = Number(searchParams.get("infants")) || 0;
    const cabinRaw = searchParams.get("class") || "economy";
    const cabinClass = (["economy", "premium_economy", "business", "first"].includes(cabinRaw) ? cabinRaw : "economy") as TravelersData["cabinClass"];
    return { adults, children, infantsSeat: infants, infantsLap: 0, cabinClass };
  });

  const isInitialMount = useRef(true);

  const [departPopoverOpen, setDepartPopoverOpen] = useState(false);
  const [returnPopoverOpen, setReturnPopoverOpen] = useState(false);
  const shouldAutoJump = useRef(false);

  useEffect(() => {
    if (!departPopoverOpen && shouldAutoJump.current && tripType === "roundtrip") {
      shouldAutoJump.current = false;
      const timer = setTimeout(() => setReturnPopoverOpen(true), 150);
      return () => clearTimeout(timer);
    }
  }, [departPopoverOpen, tripType]);

  const swapLocations = () => {
    if (origins.length === 1 && to) {
      const temp = origins[0];
      setOrigins([to]);
      setTo(temp);
    }
  };

  const isValid = origins.length > 0 && to !== null;

  const buildParams = useCallback(() => {
    const totalInfants = travelers.infantsSeat + travelers.infantsLap;
    return new URLSearchParams({
      from: origins.map(o => o.code).join(","),
      to: to!.code,
      depart: format(departDate, "yyyy-MM-dd"),
      adults: travelers.adults.toString(),
      children: travelers.children.toString(),
      infants: totalInfants.toString(),
      class: travelers.cabinClass,
      trip: tripType,
      currency: currency.toUpperCase(),
      market: marketCode.toUpperCase(),
      ...(tripType === "roundtrip" ? { return: format(returnDate, "yyyy-MM-dd") } : {}),
    });
  }, [origins, to, departDate, returnDate, travelers, tripType, currency, marketCode]);

  const handleSearchNav = useCallback(() => {
    if (origins.length === 0 || !to) return;
    const params = buildParams();
    navigate(`/flights/results?${params.toString()}`);
  }, [origins, to, buildParams, navigate]);

  /**
   * Primary Search button handler.
   * - Validates fields with inline toast messages.
   * - If params are identical to current URL → calls onForceSearch() to re-run
   *   the search without a navigation (avoids no-op).
   * - If params differ → navigates (which remounts the results page).
   */
  const handleSearch = useCallback(() => {
    if (origins.length === 0) {
      toast.error("Please enter an origin airport");
      return;
    }
    if (!to) {
      toast.error("Please enter a destination airport");
      return;
    }

    const newParams = buildParams();
    const currentSearch = searchParams.toString();
    const newSearch = newParams.toString();

    if (newSearch === currentSearch) {
      // Same params — force a fresh search without navigation
      onForceSearch?.();
    } else {
      navigate(`/flights/results?${newSearch}`);
    }
  }, [origins, to, buildParams, searchParams, navigate, onForceSearch]);

  const originsKey = origins.map(o => o.code).join(",");

  return (
    <div className="bg-card border border-border rounded-2xl shadow-card p-4">
      <div className="flex flex-wrap items-center gap-3">
        {/* Trip Type */}
        <div className="flex gap-1 shrink-0">
          <button
            onClick={() => setTripType("roundtrip")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              tripType === "roundtrip"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            Round trip
          </button>
          <button
            onClick={() => setTripType("oneway")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              tripType === "oneway"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            One way
          </button>
        </div>

        {/* From — Multi-Origin */}
        <div className="flex-1 min-w-[140px] max-w-[260px]">
          <MultiOriginInput
            values={origins}
            onChange={setOrigins}
            placeholder="From"
            compact
          />
        </div>

        {/* Swap */}
        {origins.length > 1 ? (
          <div className="h-10 w-10 rounded-full flex items-center justify-center shrink-0 opacity-30 cursor-not-allowed" title="Swap isn't available in multi-origin mode">
            <ArrowRightLeft className="w-4 h-4 text-muted-foreground" />
          </div>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={swapLocations}
            className="h-10 w-10 rounded-full hover:bg-secondary shrink-0"
          >
            <ArrowRightLeft className="w-4 h-4" />
          </Button>
        )}

        {/* To */}
        <div className="flex-1 min-w-[120px] max-w-[200px]">
          <AirportAutocomplete
            value={to}
            onChange={setTo}
            placeholder="To"
            icon="to"
            compact
          />
        </div>

        {/* Depart */}
        <Popover open={departPopoverOpen} onOpenChange={setDepartPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="h-10 justify-start text-left font-normal bg-secondary/50 border-transparent rounded-lg text-sm shrink-0"
              style={{ minWidth: '100px' }}
            >
              <Calendar className="mr-2 h-4 w-4 text-muted-foreground shrink-0" />
              <span className="truncate">{format(departDate, "MMM d")}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-card" align="start">
            <CalendarComponent
              mode="single"
              selected={departDate}
              onSelect={(date) => {
                if (date) {
                  setDepartDate(date);
                  if (date > returnDate) {
                    setReturnDate(new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000));
                  }
                  if (tripType === "roundtrip") {
                    shouldAutoJump.current = true;
                  }
                  setDepartPopoverOpen(false);
                }
              }}
              disabled={(date) => date < new Date()}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>

        {/* Return */}
        {tripType === "roundtrip" && (
          <Popover open={returnPopoverOpen} onOpenChange={setReturnPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="h-10 justify-start text-left font-normal bg-secondary/50 border-transparent rounded-lg text-sm shrink-0"
                style={{ minWidth: '100px' }}
              >
                <Calendar className="mr-2 h-4 w-4 text-muted-foreground shrink-0" />
                <span className="truncate">{format(returnDate, "MMM d")}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-card" align="start">
              <CalendarComponent
                mode="single"
                selected={returnDate}
                onSelect={(date) => {
                  if (date) {
                    setReturnDate(date);
                    setReturnPopoverOpen(false);
                  }
                }}
                disabled={(date) => date < departDate}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        )}

        {/* Travelers — shared component */}
        <div className="shrink-0">
          <TravelersPicker
            value={travelers}
            onChange={setTravelers}
            compact
          />
        </div>

        {/* Search */}
        <Button
          type="button"
          onClick={handleSearch}
          disabled={isSearching}
          className="h-10 gap-2 shrink-0 min-w-[80px]"
        >
          {isSearching ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">{isSearching ? "Searching…" : "Search"}</span>
        </Button>
      </div>
    </div>
  );
};

export default CompactSearchBar;