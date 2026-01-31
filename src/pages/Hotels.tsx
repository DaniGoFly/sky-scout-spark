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
    image: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=400&h=300&fit=crop",
    color: "from-cyan-500/80 to-blue-900/90",
  },
  {
    city: "London",
    country: "UK",
    image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400&h=300&fit=crop",
    color: "from-amber-500/80 to-orange-900/90",
  },
  {
    city: "Paris",
    country: "France",
    image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&h=300&fit=crop",
    color: "from-violet-500/80 to-purple-900/90",
  },
  {
    city: "Tokyo",
    country: "Japan",
    image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&h=300&fit=crop",
    color: "from-pink-500/80 to-rose-900/90",
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
        {/* Base gradient background - Warm amber/orange theme for Hotels */}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-amber-500/10" />
        
        {/* Floating orbs - Warm amber theme */}
        <div className="absolute top-20 left-[10%] w-96 h-96 bg-amber-500/20 rounded-full blur-[120px] animate-float" />
        <div className="absolute bottom-20 right-[10%] w-80 h-80 bg-orange-400/15 rounded-full blur-[100px] animate-float-delayed" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[150px]" />
        
        {/* Subtle floating buildings pattern */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <Building2 className="absolute top-[15%] left-[5%] w-6 h-6 text-amber-500/10" />
          <Building2 className="absolute top-[25%] right-[8%] w-8 h-8 text-orange-400/10" />
          <Building2 className="absolute bottom-[30%] left-[12%] w-5 h-5 text-amber-400/10" />
          <Building2 className="absolute top-[60%] right-[15%] w-7 h-7 text-amber-500/10" />
          <Building2 className="absolute bottom-[20%] right-[25%] w-4 h-4 text-orange-500/10" />
        </div>
        
        {/* Subtle noise overlay */}
        <div className="absolute inset-0 opacity-[0.015] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex-1 flex flex-col justify-center pt-24 pb-16 px-4">
          <div className="container mx-auto max-w-5xl">
            {/* Hero Text */}
            <div className="text-center mb-12 animate-fade-in">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight tracking-tight">
                <span className="text-foreground">Find your perfect</span>
                <br />
                <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">stay</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed">
                Compare hotel prices from all major booking sites in seconds
              </p>
            </div>

            {/* Search Form - Matching flight search panel structure */}
            <div 
              ref={searchFormRef}
              data-hotel-search-form
              className="gradient-border-amber bg-card rounded-2xl p-6 md:p-8 w-full max-w-5xl mx-auto"
            >
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
                          className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90 text-white"
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
                  className="gap-2 px-8 bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90 transition-opacity text-white"
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
          {/* Background accent */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-accent/5 rounded-full blur-[120px]" />
          
          <div className="container mx-auto max-w-6xl relative z-10">
            <div className="flex items-end justify-between mb-12">
              <div>
                <span className="text-accent text-sm font-semibold uppercase tracking-widest mb-2 block">
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
                  className="group relative rounded-2xl overflow-hidden aspect-[3/4] cursor-pointer animate-fade-in"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <img
                    src={dest.image}
                    alt={`${dest.city}, ${dest.country}`}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  
                  {/* Gradient overlay */}
                  <div className={`absolute inset-0 bg-gradient-to-t ${dest.color} opacity-60 group-hover:opacity-70 transition-opacity`} />
                  
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
