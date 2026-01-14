import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Calendar, Users, Search, AlertCircle } from "lucide-react";
import { format, addDays, isBefore } from "date-fns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useHotelSearch, HotelSearchParams } from "@/hooks/useHotelSearch";
import { DateRange } from "react-day-picker";
import { useSearchParams } from "react-router-dom";
import HotelResults from "./HotelResults";

interface FormErrors {
  destination?: string;
  dates?: string;
}

interface HotelSearchHeroProps {
  onSearch?: (params: HotelSearchParams) => void;
  resultsRef?: React.RefObject<HTMLDivElement>;
}

const HotelSearchHero = ({ onSearch, resultsRef }: HotelSearchHeroProps) => {
  const [searchParams] = useSearchParams();
  const [destination, setDestination] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [guests, setGuests] = useState(2);
  const [rooms, setRooms] = useState(1);
  const [errors, setErrors] = useState<FormErrors>({});
  const [hotelSearchParams, setHotelSearchParams] = useState<HotelSearchParams | null>(null);
  const [guestPopoverOpen, setGuestPopoverOpen] = useState(false);
  
  const internalResultsRef = useRef<HTMLDivElement>(null);
  const searchFormRef = useRef<HTMLDivElement>(null);
  const destinationInputRef = useRef<HTMLInputElement>(null);
  const { hotels, isLoading, hasSearched, searchHotels } = useHotelSearch();

  const activeResultsRef = resultsRef || internalResultsRef;

  useEffect(() => {
    const city = searchParams.get("city");
    const autoSearch = searchParams.get("autoSearch");
    
    if (city) {
      setDestination(city);
      if (!dateRange?.from) {
        setDateRange({
          from: addDays(new Date(), 7),
          to: addDays(new Date(), 10),
        });
      }
      
      if (autoSearch === "true") {
        setTimeout(() => {
          handleAutoSearch(city);
        }, 100);
      }
    }
  }, [searchParams]);

  const handleAutoSearch = async (city: string) => {
    const params: HotelSearchParams = {
      destination: city,
      checkIn: format(addDays(new Date(), 7), "yyyy-MM-dd"),
      checkOut: format(addDays(new Date(), 10), "yyyy-MM-dd"),
      guests: 2,
      rooms: 1,
    };

    setHotelSearchParams(params);
    await searchHotels(params);

    setTimeout(() => {
      activeResultsRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!destination.trim()) {
      newErrors.destination = "Please enter a destination";
    }

    if (!dateRange?.from || !dateRange?.to) {
      newErrors.dates = "Please select check-in and check-out dates";
    } else if (isBefore(dateRange.to, dateRange.from)) {
      newErrors.dates = "Check-out must be after check-in";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSearch = async () => {
    if (!validateForm()) return;

    const params: HotelSearchParams = {
      destination: destination.trim(),
      checkIn: dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : "",
      checkOut: dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : "",
      guests,
      rooms,
    };

    setHotelSearchParams(params);
    await searchHotels(params);
    onSearch?.(params);

    setTimeout(() => {
      activeResultsRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  return (
    <>
      <section className="relative min-h-[500px] flex flex-col">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1920&auto=format&fit=crop&q=80"
            alt="Hotel search background"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/60" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex-1 flex flex-col justify-center py-12 px-4">
          <div className="container mx-auto">
            {/* Hero Text */}
            <div className="text-center mb-8 max-w-3xl mx-auto">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3">
                Find your perfect stay
              </h1>
              <p className="text-lg text-white/80">
                Compare hotel prices from all major booking sites
              </p>
            </div>

            {/* Search Form Container */}
            <div className="max-w-4xl mx-auto">
              <div 
                ref={searchFormRef}
                data-hotel-search-form
                className="bg-white rounded-xl shadow-2xl p-5"
              >
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  {/* Destination */}
                  <div className="md:col-span-2 relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
                    <Input
                      ref={destinationInputRef}
                      placeholder="Where are you going?"
                      className={cn("pl-10 h-12 bg-secondary/50 border-0", errors.destination && "ring-2 ring-destructive")}
                      value={destination}
                      onChange={(e) => {
                        setDestination(e.target.value);
                        if (errors.destination) setErrors((prev) => ({ ...prev, destination: undefined }));
                      }}
                    />
                    {errors.destination && (
                      <p className="text-destructive text-xs mt-1 text-left flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.destination}
                      </p>
                    )}
                  </div>

                  {/* Date Picker */}
                  <div className="relative">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          className={cn(
                            "w-full h-12 justify-start text-left font-normal pl-10 bg-secondary/50 hover:bg-secondary/70",
                            !dateRange?.from && "text-muted-foreground",
                            errors.dates && "ring-2 ring-destructive"
                          )}
                        >
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                          {dateRange?.from ? (
                            dateRange.to ? (
                              <span className="text-sm">
                                {format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d")}
                              </span>
                            ) : (
                              format(dateRange.from, "MMM d, yyyy")
                            )
                          ) : (
                            <span>Check-in - Check-out</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent 
                        className="w-auto p-0" 
                        align="start"
                        side="bottom"
                        sideOffset={8}
                      >
                        <CalendarComponent
                          mode="range"
                          selected={dateRange}
                          onSelect={(range) => {
                            setDateRange(range);
                            if (errors.dates) setErrors((prev) => ({ ...prev, dates: undefined }));
                          }}
                          numberOfMonths={2}
                          disabled={(date) => isBefore(date, new Date())}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    {errors.dates && (
                      <p className="text-destructive text-xs mt-1 text-left flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.dates}
                      </p>
                    )}
                  </div>

                  {/* Guests & Rooms */}
                  <div className="relative">
                    <Popover open={guestPopoverOpen} onOpenChange={setGuestPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          className="w-full h-12 justify-start text-left font-normal pl-10 bg-secondary/50 hover:bg-secondary/70"
                        >
                          <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                          {guests} guest{guests > 1 ? "s" : ""}, {rooms} room{rooms > 1 ? "s" : ""}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-4" align="end">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Guests</span>
                            <div className="flex items-center gap-3">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setGuests(Math.max(1, guests - 1))}
                                disabled={guests <= 1}
                              >
                                -
                              </Button>
                              <span className="w-8 text-center">{guests}</span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setGuests(Math.min(10, guests + 1))}
                                disabled={guests >= 10}
                              >
                                +
                              </Button>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Rooms</span>
                            <div className="flex items-center gap-3">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setRooms(Math.max(1, rooms - 1))}
                                disabled={rooms <= 1}
                              >
                                -
                              </Button>
                              <span className="w-8 text-center">{rooms}</span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setRooms(Math.min(5, rooms + 1))}
                                disabled={rooms >= 5}
                              >
                                +
                              </Button>
                            </div>
                          </div>
                          <Button
                            className="w-full"
                            size="sm"
                            onClick={() => setGuestPopoverOpen(false)}
                          >
                            Done
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <Button
                  className="w-full mt-4 h-12 text-base font-semibold"
                  onClick={handleSearch}
                  disabled={isLoading}
                >
                  <Search className="w-5 h-5 mr-2" />
                  {isLoading ? "Searching..." : "Search Hotels"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Results Section */}
      <div ref={internalResultsRef}>
        {(hasSearched || isLoading) && (
          <section className="px-4 py-8 bg-secondary/30">
            <div className="container mx-auto">
              <HotelResults
                hotels={hotels}
                isLoading={isLoading}
                searchParams={hotelSearchParams}
              />
            </div>
          </section>
        )}
      </div>
    </>
  );
};

export default HotelSearchHero;
