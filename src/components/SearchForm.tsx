import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRightLeft, Calendar, Users, Search, Globe } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import MultiOriginInput, { type AirportSelection } from "./MultiOriginInput";
import NearbyToggle from "./search/NearbyToggle";
import FlexDateControls from "./search/FlexDateControls";
import { getDefaultDates } from "@/lib/dateUtils";
import { AIRPORTS, getAirportsInRadius } from "@/lib/airports";

const SearchForm = () => {
  const navigate = useNavigate();
  const [tripType, setTripType] = useState<"roundtrip" | "oneway">("roundtrip");
  const [anywhere, setAnywhere] = useState(false);

  // Airports
  const [origins, setOrigins] = useState<AirportSelection[]>([]);
  const [destinations, setDestinations] = useState<AirportSelection[]>([]);

  // Nearby
  const [fromNearby, setFromNearby] = useState(false);
  const [fromRadius, setFromRadius] = useState(150);
  const [toNearby, setToNearby] = useState(false);
  const [toRadius, setToRadius] = useState(150);
  const userCoordsRef = useRef<{ lat: number; lon: number } | null>(null);
  const toCenterRef = useRef<AirportSelection[]>([]);

  // Dates
  const [departDate, setDepartDate] = useState<Date>(() => getDefaultDates().depart);
  const [returnDate, setReturnDate] = useState<Date>(() => getDefaultDates().return);
  const [departFlexBefore, setDepartFlexBefore] = useState(0);
  const [departFlexAfter, setDepartFlexAfter] = useState(0);
  const [returnFlexBefore, setReturnFlexBefore] = useState(0);
  const [returnFlexAfter, setReturnFlexAfter] = useState(0);

  // Travelers
  const [passengers, setPassengers] = useState(1);

  // Dialog states
  const [departOpen, setDepartOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [passengersOpen, setPassengersOpen] = useState(false);
  const shouldAutoJump = useRef(false);

  /* ── Nearby: From ── */
  const fillNearbyOrigins = useCallback(
    (lat: number, lon: number, radius: number) => {
      const nearby = getAirportsInRadius(lat, lon, radius);
      setOrigins(
        nearby.slice(0, 6).map((a) => ({ code: a.code, display: `${a.city} (${a.code})` }))
      );
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

  /* ── Nearby: To ── */
  const expandToNearby = useCallback(
    (centers: AirportSelection[], radius: number) => {
      const expanded: AirportSelection[] = [];
      const seen = new Set<string>();
      for (const dest of centers) {
        if (!seen.has(dest.code)) {
          expanded.push(dest);
          seen.add(dest.code);
        }
        const airport = AIRPORTS.find((a) => a.code.toUpperCase() === dest.code.toUpperCase());
        if (airport) {
          const nearby = getAirportsInRadius(airport.lat, airport.lon, radius);
          for (const a of nearby) {
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

  /* ── Swap ── */
  const swapLocations = () => {
    if (origins.length === 1 && destinations.length === 1) {
      const temp = origins[0];
      setOrigins([destinations[0]]);
      setDestinations([temp]);
    }
  };

  /* ── Validation ── */
  const isValid = origins.length > 0 && (anywhere || destinations.length > 0);

  /* ── Search ── */
  const handleSearch = () => {
    if (!isValid) return;

    if (anywhere) {
      navigate(`/explore?from=${origins.map((o) => o.code).join(",")}`);
      return;
    }

    const searchParams = new URLSearchParams({
      from: origins.map((o) => o.code).join(","),
      to: destinations.map((d) => d.code).join(","),
      depart: format(departDate, "yyyy-MM-dd"),
      adults: passengers.toString(),
      trip: tripType,
    });

    if (tripType === "roundtrip") {
      searchParams.set("return", format(returnDate, "yyyy-MM-dd"));
    }
    if (departFlexBefore > 0) searchParams.set("dfb", departFlexBefore.toString());
    if (departFlexAfter > 0) searchParams.set("dfa", departFlexAfter.toString());
    if (tripType === "roundtrip") {
      if (returnFlexBefore > 0) searchParams.set("rfb", returnFlexBefore.toString());
      if (returnFlexAfter > 0) searchParams.set("rfa", returnFlexAfter.toString());
    }

    navigate(`/search?${searchParams.toString()}`);
  };

  /* ── Auto-jump depart → return ── */
  useEffect(() => {
    if (!departOpen && shouldAutoJump.current && tripType === "roundtrip") {
      shouldAutoJump.current = false;
      const timer = setTimeout(() => setReturnOpen(true), 150);
      return () => clearTimeout(timer);
    }
  }, [departOpen, tripType]);

  return (
    <div className="bg-card rounded-2xl shadow-lg p-4 md:p-6 w-full max-w-5xl mx-auto">
      {/* Trip Type + Anywhere */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setTripType("roundtrip")}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
            tripType === "roundtrip"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"
          }`}
        >
          Round trip
        </button>
        <button
          onClick={() => setTripType("oneway")}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
            tripType === "oneway"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"
          }`}
        >
          One way
        </button>
        <div className="ml-auto flex items-center gap-2">
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <Switch
              checked={anywhere}
              onCheckedChange={(v) => {
                setAnywhere(v);
                if (v) setDestinations([]);
              }}
              className="scale-[0.7]"
            />
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Globe className="w-3 h-3" /> Anywhere
            </span>
          </label>
        </div>
      </div>

      {/* Search Fields Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3 items-start">
        {/* From */}
        <div className="lg:col-span-3">
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">From</label>
          <MultiOriginInput
            values={origins}
            onChange={(v) => {
              setOrigins(v);
              if (fromNearby) setFromNearby(false);
            }}
            placeholder="Where from?"
          />
          <NearbyToggle
            enabled={fromNearby}
            onToggle={handleFromNearbyToggle}
            radius={fromRadius}
            onRadiusChange={setFromRadius}
          />
        </div>

        {/* Swap */}
        <div className="lg:col-span-1 flex justify-center items-center pt-6">
          <Button
            variant="outline"
            size="icon"
            onClick={swapLocations}
            disabled={origins.length !== 1 || destinations.length !== 1 || anywhere}
            className="rounded-full h-12 w-12 border-2 border-dashed hover:border-primary hover:text-primary hover:bg-primary/5 transition-all duration-200 disabled:opacity-30"
          >
            <ArrowRightLeft className="w-4 h-4" />
          </Button>
        </div>

        {/* To */}
        <div className="lg:col-span-3">
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">To</label>
          {anywhere ? (
            <div className="min-h-[52px] px-3 py-3 bg-secondary/50 rounded-xl border-2 border-dashed border-primary/30 flex items-center gap-2 text-sm text-primary/70">
              <Globe className="w-4 h-4" />
              Searching everywhere
            </div>
          ) : (
            <>
              <MultiOriginInput
                values={destinations}
                onChange={(v) => {
                  setDestinations(v);
                  if (toNearby) toCenterRef.current = v;
                }}
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
        </div>

        {/* Depart Date */}
        <div className="lg:col-span-2">
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Depart</label>
          <Button
            variant="outline"
            onClick={() => setDepartOpen(true)}
            className="w-full h-12 justify-start text-left font-normal bg-secondary/50 border-0 rounded-lg hover:bg-secondary transition-all"
          >
            <Calendar className="mr-2 h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="truncate">{format(departDate, "MMM d, yyyy")}</span>
          </Button>
          <FlexDateControls
            before={departFlexBefore}
            after={departFlexAfter}
            onBeforeChange={setDepartFlexBefore}
            onAfterChange={setDepartFlexAfter}
          />
          <Dialog open={departOpen} onOpenChange={setDepartOpen}>
            <DialogContent className="sm:max-w-fit p-0 gap-0">
              <DialogHeader className="p-4 pb-0">
                <DialogTitle>Select departure date</DialogTitle>
              </DialogHeader>
              <div className="p-4">
                <CalendarComponent
                  mode="single"
                  selected={departDate}
                  onSelect={(date) => {
                    if (date) {
                      setDepartDate(date);
                      if (date > returnDate)
                        setReturnDate(new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000));
                      if (tripType === "roundtrip") shouldAutoJump.current = true;
                      setDepartOpen(false);
                    }
                  }}
                  disabled={(date) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return date < today;
                  }}
                  initialFocus
                  className="pointer-events-auto"
                  numberOfMonths={2}
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Return Date */}
        {tripType === "roundtrip" && (
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Return</label>
            <Button
              variant="outline"
              onClick={() => setReturnOpen(true)}
              className="w-full h-12 justify-start text-left font-normal bg-secondary/50 border-0 rounded-lg hover:bg-secondary transition-all"
            >
              <Calendar className="mr-2 h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="truncate">{format(returnDate, "MMM d, yyyy")}</span>
            </Button>
            <FlexDateControls
              before={returnFlexBefore}
              after={returnFlexAfter}
              onBeforeChange={setReturnFlexBefore}
              onAfterChange={setReturnFlexAfter}
            />
            <Dialog open={returnOpen} onOpenChange={setReturnOpen}>
              <DialogContent className="sm:max-w-fit p-0 gap-0">
                <DialogHeader className="p-4 pb-0">
                  <DialogTitle>Select return date</DialogTitle>
                </DialogHeader>
                <div className="p-4">
                  <CalendarComponent
                    mode="single"
                    selected={returnDate}
                    onSelect={(date) => {
                      if (date) {
                        setReturnDate(date);
                        setReturnOpen(false);
                      }
                    }}
                    disabled={(date) => {
                      const minDate = new Date(departDate);
                      minDate.setHours(0, 0, 0, 0);
                      return date < minDate;
                    }}
                    initialFocus
                    className="pointer-events-auto"
                    numberOfMonths={2}
                  />
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* Passengers */}
        <div className={tripType === "oneway" ? "lg:col-span-2" : "lg:col-span-1"}>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Travelers</label>
          <Popover open={passengersOpen} onOpenChange={setPassengersOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full h-12 justify-start text-left font-normal bg-secondary/50 border-0 rounded-lg hover:bg-secondary transition-all"
              >
                <Users className="mr-2 h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span>{passengers}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56" align="end" side="bottom" sideOffset={8}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Adults</span>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 rounded-lg p-0"
                    onClick={() => setPassengers(Math.max(1, passengers - 1))}
                    disabled={passengers <= 1}
                  >
                    -
                  </Button>
                  <span className="w-6 text-center font-medium">{passengers}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 rounded-lg p-0"
                    onClick={() => setPassengers(Math.min(9, passengers + 1))}
                    disabled={passengers >= 9}
                  >
                    +
                  </Button>
                </div>
              </div>
              <Button className="w-full mt-4" size="sm" onClick={() => setPassengersOpen(false)}>
                Done
              </Button>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Search Button */}
      <div className="mt-6 flex justify-center">
        <Button
          size="lg"
          onClick={handleSearch}
          disabled={!isValid}
          className="h-12 px-8 text-base font-semibold"
        >
          <Search className="w-5 h-5 mr-2" />
          {anywhere ? "Explore Destinations" : "Search Flights"}
        </Button>
      </div>
    </div>
  );
};

export default SearchForm;
