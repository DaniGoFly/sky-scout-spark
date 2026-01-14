import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRightLeft, Calendar, Users, Search, X } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AirportAutocomplete from "./AirportAutocomplete";
import { getDefaultDates } from "@/lib/dateUtils";

interface AirportSelection {
  code: string;
  display: string;
}

const SearchForm = () => {
  const navigate = useNavigate();
  const [tripType, setTripType] = useState<"roundtrip" | "oneway">("roundtrip");
  const [from, setFrom] = useState<AirportSelection | null>(null);
  const [to, setTo] = useState<AirportSelection | null>(null);
  
  // Dynamic default dates using centralized utility (today + 30 / today + 37)
  const [departDate, setDepartDate] = useState<Date>(() => getDefaultDates().depart);
  const [returnDate, setReturnDate] = useState<Date>(() => getDefaultDates().return);
  const [passengers, setPassengers] = useState(1);
  
  // Control popover open states
  const [departOpen, setDepartOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [passengersOpen, setPassengersOpen] = useState(false);

  const swapLocations = () => {
    const temp = from;
    setFrom(to);
    setTo(temp);
  };

  const isValid = from !== null && to !== null;

  const handleSearch = () => {
    if (!isValid) return;

    const AFFILIATE_MARKER = "694224";
    
    // Format dates as DDMM for Aviasales URL
    const departFormatted = format(departDate, "ddMM");
    
    let urlPath = `${from.code}${departFormatted}${to.code}`;
    
    // Add return date for roundtrip
    if (tripType === "roundtrip") {
      const returnFormatted = format(returnDate, "ddMM");
      urlPath += returnFormatted;
    }
    
    // Add passengers
    urlPath += passengers;
    
    // Build Aviasales URL and redirect directly
    const aviasalesUrl = `https://www.aviasales.com/search/${urlPath}?marker=${AFFILIATE_MARKER}`;
    window.open(aviasalesUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="bg-card rounded-2xl shadow-lg p-4 md:p-6 w-full max-w-5xl mx-auto">
      {/* Trip Type Toggle */}
      <div className="flex gap-2 mb-6">
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
      </div>

      {/* Search Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
        {/* From */}
        <div className="lg:col-span-3 relative">
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">From</label>
          <AirportAutocomplete
            value={from}
            onChange={setFrom}
            placeholder="Where from?"
            icon="from"
          />
        </div>

        {/* Swap Button */}
        <div className="lg:col-span-1 flex justify-center">
          <Button
            variant="outline"
            size="icon"
            onClick={swapLocations}
            className="rounded-full h-12 w-12 border-2 border-dashed hover:border-primary hover:text-primary hover:bg-primary/5 transition-all duration-200"
          >
            <ArrowRightLeft className="w-4 h-4" />
          </Button>
        </div>

        {/* To */}
        <div className="lg:col-span-3">
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">To</label>
          <AirportAutocomplete
            value={to}
            onChange={setTo}
            placeholder="Where to?"
            icon="to"
          />
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
                      if (date > returnDate) {
                        setReturnDate(new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000));
                      }
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
            <PopoverContent 
              className="w-56" 
              align="end"
              side="bottom"
              sideOffset={8}
            >
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
              <Button 
                className="w-full mt-4" 
                size="sm"
                onClick={() => setPassengersOpen(false)}
              >
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
          Search Flights
        </Button>
      </div>
    </div>
  );
};

export default SearchForm;
