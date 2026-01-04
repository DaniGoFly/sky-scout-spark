import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Hotel as HotelIcon, ArrowRight, Search, MapPin, Calendar, Users, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState, useRef } from "react";
import { format, addDays, isBefore, isValid } from "date-fns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useHotelSearch, HotelSearchParams } from "@/hooks/useHotelSearch";
import HotelResults from "@/components/HotelResults";
import { DateRange } from "react-day-picker";

const destinations = [
  {
    city: "New York",
    country: "USA",
    image: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=400&h=300&fit=crop",
  },
  {
    city: "London",
    country: "UK",
    image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400&h=300&fit=crop",
  },
  {
    city: "Paris",
    country: "France",
    image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&h=300&fit=crop",
  },
  {
    city: "Tokyo",
    country: "Japan",
    image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&h=300&fit=crop",
  },
  {
    city: "Dubai",
    country: "UAE",
    image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400&h=300&fit=crop",
  },
  {
    city: "Barcelona",
    country: "Spain",
    image: "https://images.unsplash.com/photo-1583422409516-2895a77efded?w=400&h=300&fit=crop",
  },
];

interface FormErrors {
  destination?: string;
  dates?: string;
}

const Hotels = () => {
  const [destination, setDestination] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [guests, setGuests] = useState(2);
  const [rooms, setRooms] = useState(1);
  const [errors, setErrors] = useState<FormErrors>({});
  const [searchParams, setSearchParams] = useState<HotelSearchParams | null>(null);
  const [guestPopoverOpen, setGuestPopoverOpen] = useState(false);
  
  const resultsRef = useRef<HTMLDivElement>(null);
  const { hotels, isLoading, hasSearched, searchHotels } = useHotelSearch();

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

    setSearchParams(params);
    await searchHotels(params);

    // Scroll to results
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleDestinationClick = (city: string) => {
    setDestination(city);
    if (!dateRange?.from) {
      setDateRange({
        from: addDays(new Date(), 7),
        to: addDays(new Date(), 10),
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/20" />
        
        <div className="container mx-auto text-center relative z-10">
          <div className="max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6">
              <HotelIcon className="w-4 h-4" />
              <span className="text-sm font-medium">Hotel Search</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Find Your Perfect Stay
            </h1>
            
            <p className="text-muted-foreground mb-8 text-lg max-w-2xl mx-auto">
              Compare prices from top booking sites and find the best deals on hotels worldwide.
            </p>

            {/* Search Form */}
            <div className="bg-card/80 backdrop-blur-sm border border-border rounded-2xl p-6 shadow-lg max-w-3xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Destination */}
                <div className="md:col-span-2 relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
                  <Input
                    placeholder="Where are you going?"
                    className={cn("pl-10 h-12", errors.destination && "border-destructive")}
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
                        variant="outline"
                        className={cn(
                          "w-full h-12 justify-start text-left font-normal pl-10",
                          !dateRange?.from && "text-muted-foreground",
                          errors.dates && "border-destructive"
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
                    <PopoverContent className="w-auto p-0" align="start">
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
                        variant="outline"
                        className="w-full h-12 justify-start text-left font-normal pl-10"
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
                variant="hero"
                size="lg"
                className="w-full mt-4"
                onClick={handleSearch}
                disabled={isLoading}
              >
                <Search className="w-5 h-5 mr-2" />
                {isLoading ? "Searching..." : "Search Hotels"}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Results Section */}
      <div ref={resultsRef}>
        {(hasSearched || isLoading) && (
          <section className="px-4 pb-8">
            <div className="container mx-auto">
              <HotelResults
                hotels={hotels}
                isLoading={isLoading}
                searchParams={searchParams}
              />
            </div>
          </section>
        )}
      </div>

      {/* Popular Destinations - Only show if no search results */}
      {!hasSearched && (
        <section className="py-16 px-4 flex-1">
          <div className="container mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8 text-center">
              Popular Hotel Destinations
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {destinations.map((dest) => (
                <div
                  key={dest.city}
                  onClick={() => handleDestinationClick(dest.city)}
                  className="group relative rounded-2xl overflow-hidden aspect-[4/3] shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer"
                >
                  <img
                    src={dest.image}
                    alt={`${dest.city}, ${dest.country}`}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4 text-left">
                    <h3 className="text-xl font-bold text-white">{dest.city}</h3>
                    <p className="text-white/80 text-sm">{dest.country}</p>
                  </div>
                  <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <ArrowRight className="w-4 h-4 text-white" />
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
