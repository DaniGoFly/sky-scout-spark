import { useState } from "react";
import { Plane, ArrowRightLeft, Calendar, Users, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";

interface SearchFormProps {
  onSearch?: () => void;
}

const SearchForm = ({ onSearch }: SearchFormProps) => {
  const [tripType, setTripType] = useState<"roundtrip" | "oneway">("roundtrip");
  const [from, setFrom] = useState("New York (JFK)");
  const [to, setTo] = useState("London (LHR)");
  const [departDate, setDepartDate] = useState<Date>(new Date(2026, 1, 15));
  const [returnDate, setReturnDate] = useState<Date>(new Date(2026, 1, 22));
  const [passengers, setPassengers] = useState(1);

  const swapLocations = () => {
    const temp = from;
    setFrom(to);
    setTo(temp);
  };

  const handleSearch = () => {
    if (onSearch) onSearch();
  };

  return (
    <div className="bg-card rounded-2xl shadow-card p-6 md:p-8 w-full max-w-5xl mx-auto">
      {/* Trip Type Toggle */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setTripType("roundtrip")}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            tripType === "roundtrip"
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Round trip
        </button>
        <button
          onClick={() => setTripType("oneway")}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            tripType === "oneway"
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          One way
        </button>
      </div>

      {/* Search Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 items-end">
        {/* From */}
        <div className="lg:col-span-3 relative">
          <label className="block text-sm font-medium text-muted-foreground mb-2">From</label>
          <div className="relative">
            <Plane className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="pl-10 h-12 bg-secondary/50 border-0 focus:bg-card focus:ring-2 focus:ring-primary"
              placeholder="Where from?"
            />
          </div>
        </div>

        {/* Swap Button */}
        <div className="lg:col-span-1 flex justify-center">
          <Button
            variant="outline"
            size="icon"
            onClick={swapLocations}
            className="rounded-full h-12 w-12 border-2 hover:border-primary hover:text-primary"
          >
            <ArrowRightLeft className="w-4 h-4" />
          </Button>
        </div>

        {/* To */}
        <div className="lg:col-span-3">
          <label className="block text-sm font-medium text-muted-foreground mb-2">To</label>
          <div className="relative">
            <Plane className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground rotate-90" />
            <Input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="pl-10 h-12 bg-secondary/50 border-0 focus:bg-card focus:ring-2 focus:ring-primary"
              placeholder="Where to?"
            />
          </div>
        </div>

        {/* Depart Date */}
        <div className="lg:col-span-2">
          <label className="block text-sm font-medium text-muted-foreground mb-2">Depart</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full h-12 justify-start text-left font-normal bg-secondary/50 border-0 hover:bg-card"
              >
                <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                {format(departDate, "MMM d, yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={departDate}
                onSelect={(date) => date && setDepartDate(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Return Date */}
        {tripType === "roundtrip" && (
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-muted-foreground mb-2">Return</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full h-12 justify-start text-left font-normal bg-secondary/50 border-0 hover:bg-card"
                >
                  <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                  {format(returnDate, "MMM d, yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={returnDate}
                  onSelect={(date) => date && setReturnDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        )}

        {/* Passengers */}
        <div className={tripType === "oneway" ? "lg:col-span-2" : "lg:col-span-1"}>
          <label className="block text-sm font-medium text-muted-foreground mb-2">Travelers</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full h-12 justify-start text-left font-normal bg-secondary/50 border-0 hover:bg-card"
              >
                <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                {passengers}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48" align="start">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Adults</span>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPassengers(Math.max(1, passengers - 1))}
                  >
                    -
                  </Button>
                  <span className="w-6 text-center">{passengers}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPassengers(passengers + 1)}
                  >
                    +
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Search Button */}
      <div className="mt-6 flex justify-center">
        <Button variant="hero" size="xl" onClick={handleSearch} className="gap-2">
          <Search className="w-5 h-5" />
          Search Flights
        </Button>
      </div>
    </div>
  );
};

export default SearchForm;
