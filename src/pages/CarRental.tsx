import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Car, MapPin, Calendar, Search, Check, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { format, addDays, isBefore } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const carTypes = [
  { name: "Economy", price: "From $25/day", image: "🚗", description: "Fuel efficient, perfect for city driving" },
  { name: "Compact", price: "From $35/day", image: "🚙", description: "Comfortable for small groups" },
  { name: "SUV", price: "From $55/day", image: "🚐", description: "Great for families and adventures" },
  { name: "Luxury", price: "From $95/day", image: "🏎️", description: "Premium experience with style" },
];

interface CarResult {
  id: string;
  name: string;
  type: string;
  image: string;
  pricePerDay: number;
  features: string[];
  provider: string;
}

const mockCarResults: CarResult[] = [
  { id: "1", name: "Toyota Corolla", type: "Economy", image: "🚗", pricePerDay: 25, features: ["Automatic", "AC", "5 Seats", "2 Bags"], provider: "Hertz" },
  { id: "2", name: "Honda Civic", type: "Compact", image: "🚙", pricePerDay: 35, features: ["Automatic", "AC", "5 Seats", "3 Bags"], provider: "Avis" },
  { id: "3", name: "Ford Explorer", type: "SUV", image: "🚐", pricePerDay: 55, features: ["Automatic", "AC", "7 Seats", "4 Bags"], provider: "Enterprise" },
  { id: "4", name: "BMW 5 Series", type: "Luxury", image: "🏎️", pricePerDay: 95, features: ["Automatic", "AC", "5 Seats", "3 Bags", "Premium Sound"], provider: "National" },
  { id: "5", name: "Nissan Altima", type: "Compact", image: "🚙", pricePerDay: 32, features: ["Automatic", "AC", "5 Seats", "2 Bags"], provider: "Budget" },
  { id: "6", name: "Jeep Wrangler", type: "SUV", image: "🚐", pricePerDay: 65, features: ["4WD", "AC", "5 Seats", "2 Bags", "Convertible"], provider: "Hertz" },
];

const CarRental = () => {
  const [searchParams] = useSearchParams();
  const [pickupLocation, setPickupLocation] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [results, setResults] = useState<CarResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const location = searchParams.get("location");
    if (location) {
      setPickupLocation(location);
    }
  }, [searchParams]);

  const handleSearch = async () => {
    if (!pickupLocation.trim()) {
      toast.error("Please enter a pickup location");
      return;
    }

    setIsLoading(true);
    setHasSearched(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    let filtered = [...mockCarResults];
    if (selectedType) {
      filtered = filtered.filter(car => car.type === selectedType);
    }

    setResults(filtered);
    setIsLoading(false);
  };

  const handleCarTypeClick = (typeName: string) => {
    setSelectedType(selectedType === typeName ? null : typeName);
  };

  const handleBookCar = (car: CarResult) => {
    toast.success(`Booking ${car.name} from ${car.provider}. You'll be redirected to complete your reservation.`);
  };

  const calculateTotalDays = () => {
    if (!dateRange?.from || !dateRange?.to) return 1;
    const diff = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 1;
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
              <Car className="w-4 h-4" />
              <span className="text-sm font-medium">Car Rental</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Find Your Perfect Ride
            </h1>
            
            <p className="text-muted-foreground mb-8 text-lg max-w-2xl mx-auto">
              Compare car rental prices from top providers and hit the road with confidence.
            </p>

            {/* Search Form */}
            <div className="bg-card/80 backdrop-blur-sm border border-border rounded-2xl p-6 shadow-lg max-w-3xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
                  <Input
                    placeholder="Pick-up location"
                    className="pl-10 h-12"
                    value={pickupLocation}
                    onChange={(e) => setPickupLocation(e.target.value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full h-12 justify-start text-left font-normal pl-10",
                          !dateRange?.from && "text-muted-foreground"
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
                          <span>Pick-up - Drop-off dates</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="range"
                        selected={dateRange}
                        onSelect={setDateRange}
                        numberOfMonths={2}
                        disabled={(date) => isBefore(date, new Date())}
                        initialFocus
                        className="pointer-events-auto"
                      />
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
                {isLoading ? "Searching..." : "Search Cars"}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Car Types Filter */}
      <section className="py-8 px-4">
        <div className="container mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8 text-center">
            {hasSearched ? "Filter by Car Type" : "Popular Car Types"}
          </h2>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {carTypes.map((car) => (
              <div
                key={car.name}
                onClick={() => handleCarTypeClick(car.name)}
                className={cn(
                  "bg-card border rounded-2xl p-6 text-center hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer",
                  selectedType === car.name 
                    ? "border-primary bg-primary/5" 
                    : "border-border"
                )}
              >
                <div className="text-5xl mb-4">{car.image}</div>
                <h3 className="text-lg font-semibold text-foreground mb-1">{car.name}</h3>
                <p className="text-sm text-muted-foreground mb-2">{car.price}</p>
                <p className="text-xs text-muted-foreground">{car.description}</p>
                {selectedType === car.name && (
                  <div className="mt-3 inline-flex items-center gap-1 text-primary text-sm font-medium">
                    <Check className="w-4 h-4" /> Selected
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Search Results */}
      {hasSearched && (
        <section className="py-8 px-4 flex-1">
          <div className="container mx-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : results.length > 0 ? (
              <>
                <h3 className="text-xl font-semibold text-foreground mb-6">
                  {results.length} cars available in {pickupLocation}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {results.map((car) => (
                    <div
                      key={car.id}
                      className="bg-card border border-border rounded-2xl p-6 hover:shadow-lg transition-all duration-300"
                    >
                      <div className="text-center mb-4">
                        <div className="text-6xl mb-2">{car.image}</div>
                        <h4 className="text-lg font-semibold text-foreground">{car.name}</h4>
                        <p className="text-sm text-muted-foreground">{car.type} • {car.provider}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {car.features.map((feature) => (
                          <span key={feature} className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-full">
                            {feature}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-end justify-between border-t border-border pt-4">
                        <div>
                          <p className="text-2xl font-bold text-foreground">${car.pricePerDay * calculateTotalDays()}</p>
                          <p className="text-xs text-muted-foreground">
                            ${car.pricePerDay}/day × {calculateTotalDays()} days
                          </p>
                        </div>
                        <Button onClick={() => handleBookCar(car)}>Book Now</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <Info className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">No cars found</h3>
                <p className="text-muted-foreground">Try adjusting your search criteria</p>
              </div>
            )}
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
};

export default CarRental;
