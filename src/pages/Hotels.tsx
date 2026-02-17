import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ArrowRight, Search, MapPin, Calendar, Users, AlertCircle, Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState, useRef, useEffect } from "react";
import { format, addDays, isBefore } from "date-fns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useHotelSearch, HotelSearchParams } from "@/hooks/useHotelSearch";
import HotelResults from "@/components/HotelResults";
import { DateRange } from "react-day-picker";
import { useSearchParams } from "react-router-dom";
import HotelAssistant from "@/components/HotelAssistant";

const destinations = [
  {
    city: "New York",
    country: "USA",
    image: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=3840&auto=format&fit=crop&q=90",
  },
  {
    city: "London",
    country: "UK",
    image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=3840&auto=format&fit=crop&q=90",
  },
  {
    city: "Paris",
    country: "France",
    image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=3840&auto=format&fit=crop&q=90",
  },
  {
    city: "Tokyo",
    country: "Japan",
    image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=3840&auto=format&fit=crop&q=90",
  },
];

interface FormErrors {
  destination?: string;
  dates?: string;
}

const Hotels = () => {
  const [searchParams] = useSearchParams();
  const [destination, setDestination] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [guests, setGuests] = useState(2);
  const [rooms, setRooms] = useState(1);
  const [errors, setErrors] = useState<FormErrors>({});
  const [hotelSearchParams, setHotelSearchParams] = useState<HotelSearchParams | null>(null);
  const [guestPopoverOpen, setGuestPopoverOpen] = useState(false);
  
  const resultsRef = useRef<HTMLDivElement>(null);
  const searchFormRef = useRef<HTMLDivElement>(null);
  const destinationInputRef = useRef<HTMLInputElement>(null);
  const { hotels, isLoading, hasSearched, searchHotels } = useHotelSearch();

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
      resultsRef.current?.scrollIntoView({ behavior: "smooth" });
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

    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleDestinationClick = async (city: string) => {
    setDestination(city);
    if (!dateRange?.from) {
      setDateRange({
        from: addDays(new Date(), 7),
        to: addDays(new Date(), 10),
      });
    }
    
    const params: HotelSearchParams = {
      destination: city,
      checkIn: format(dateRange?.from || addDays(new Date(), 7), "yyyy-MM-dd"),
      checkOut: format(dateRange?.to || addDays(new Date(), 10), "yyyy-MM-dd"),
      guests,
      rooms,
    };

    setHotelSearchParams(params);
    await searchHotels(params);

    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col overflow-hidden">
        {/* Calm navy gradient with warm accent — no floating orbs */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(1200px circle at 50% 10%, rgba(217,119,6,0.08), transparent 60%), linear-gradient(180deg, hsl(222 47% 6%), hsl(222 40% 8%))",
          }}
        />
        {/* Subtle floating buildings — matching flights page plane positions */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <Building2 className="absolute top-[15%] left-[5%] w-6 h-6 text-amber-400/10 rotate-12" />
          <Building2 className="absolute top-[25%] right-[8%] w-8 h-8 text-amber-300/10 -rotate-6" />
          <Building2 className="absolute bottom-[30%] left-[12%] w-5 h-5 text-amber-400/10 rotate-6" />
          <Building2 className="absolute top-[60%] right-[15%] w-7 h-7 text-amber-400/10 -rotate-12" />
          <Building2 className="absolute bottom-[20%] right-[25%] w-4 h-4 text-amber-300/10 rotate-12" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex-1 flex flex-col justify-center pt-28 pb-20 px-4">
          <div className="container mx-auto max-w-5xl">
            {/* Hero Text */}
            <div className="text-center mb-14 animate-fade-in">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-5 leading-tight tracking-tight text-foreground">
                Find your perfect{" "}
                <span className="text-amber-400">stay</span>
              </h1>
              <p className="text-lg md:text-xl text-foreground/65 max-w-xl mx-auto leading-relaxed">
                Compare hotel prices from all major booking sites in seconds
              </p>
            </div>

            {/* Search Form - Matching flight search panel structure */}
            <div 
              ref={searchFormRef}
              data-hotel-search-form
              className="gradient-border bg-card rounded-xl p-6 md:p-8 w-full max-w-5xl mx-auto"
            >
              {/* Hotels context row */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4 pb-4 border-b border-border/50">
                <Building2 className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-semibold text-foreground/80">Hotels</span>
                <span className="text-muted-foreground/50">•</span>
                <span>Compare prices from all major booking sites</span>
                <span className="text-muted-foreground/50 hidden sm:inline">•</span>
                <span className="hidden sm:inline">Secure booking via verified partners</span>
              </div>
              {/* Search Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 items-end">
                {/* Destination */}
                <div className="lg:col-span-4">
                  <label className="block text-xs font-medium text-muted-foreground mb-2">Destination</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
                    <Input
                      ref={destinationInputRef}
                      placeholder="Where are you going?"
                      className={cn(
                        "pl-10 h-12 bg-secondary border-border",
                        errors.destination && "ring-2 ring-destructive"
                      )}
                      value={destination}
                      onChange={(e) => {
                        setDestination(e.target.value);
                        if (errors.destination) setErrors((prev) => ({ ...prev, destination: undefined }));
                      }}
                    />
                  </div>
                  {errors.destination && (
                    <p className="text-destructive text-xs mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.destination}
                    </p>
                  )}
                </div>

                {/* Date Picker */}
                <div className="lg:col-span-4">
                  <label className="block text-xs font-medium text-muted-foreground mb-2">Check-in / Check-out</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full h-12 justify-start text-left font-normal pl-10 bg-secondary border-border hover:bg-secondary/80",
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
                          <span>Select dates</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent 
                      className="w-auto p-0 bg-card border-border" 
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
                    <p className="text-destructive text-xs mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.dates}
                    </p>
                  )}
                </div>

                {/* Guests & Rooms */}
                <div className="lg:col-span-4">
                  <label className="block text-xs font-medium text-muted-foreground mb-2">Guests & Rooms</label>
                  <Popover open={guestPopoverOpen} onOpenChange={setGuestPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full h-12 justify-start text-left font-normal pl-10 bg-secondary border-border hover:bg-secondary/80"
                      >
                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        {guests} guest{guests > 1 ? "s" : ""}, {rooms} room{rooms > 1 ? "s" : ""}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-4 bg-card border-border" align="end">
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
                          className="w-full bg-amber-500 hover:bg-amber-400 text-white"
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
              
              {/* Search Button */}
              <div className="mt-6 flex justify-center md:justify-end">
                <Button
                  size="lg"
                  className="gap-2 px-8 bg-amber-500 hover:bg-amber-400 transition-colors text-white shadow-lg shadow-amber-500/15"
                  onClick={handleSearch}
                  disabled={isLoading}
                >
                  <Search className="w-4 h-4" />
                  {isLoading ? "Searching..." : "Search Hotels"}
                </Button>
              </div>
            </div>

            {/* AI Travel Assistant for Hotels */}
            <div className="mt-8 animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <HotelAssistant />
            </div>
          </div>
        </div>
      </section>

      {/* Results Section */}
      <div ref={resultsRef}>
        {(hasSearched || isLoading) && (
          <section className="px-4 py-12 bg-background">
            <div className="container mx-auto max-w-6xl">
              <HotelResults
                hotels={hotels}
                isLoading={isLoading}
                searchParams={hotelSearchParams}
              />
            </div>
          </section>
        )}
      </div>

      {/* Popular Destinations */}
      {!hasSearched && (
        <section className="py-24 px-4 bg-background relative overflow-hidden">
          <div className="container mx-auto max-w-6xl relative z-10">
            <div className="flex items-end justify-between mb-12">
              <div>
                <span className="text-amber-400 text-sm font-semibold uppercase tracking-widest mb-2 block">
                  Trending now
                </span>
                <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                  Popular destinations
                </h2>
              </div>
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {destinations.map((dest, index) => (
                <div
                  key={dest.city}
                  onClick={() => handleDestinationClick(dest.city)}
                  className="group relative rounded-xl overflow-hidden aspect-[3/4] cursor-pointer animate-fade-in"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <img
                    src={dest.image}
                    alt={`${dest.city}, ${dest.country}`}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                  />
                  
                  {/* Natural dark gradient — no color tint */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />
                  
                  {/* Content */}
                  <div className="absolute inset-0 p-5 flex flex-col justify-end">
                    <div className="flex items-center gap-1.5 text-white/80 text-xs mb-2">
                      <MapPin className="w-3 h-3" />
                      <span>{dest.country}</span>
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">
                      {dest.city}
                    </h3>
                    <div className="flex items-center gap-2 text-white/80 text-sm opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                      <span>Explore hotels</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
};

export default Hotels;
