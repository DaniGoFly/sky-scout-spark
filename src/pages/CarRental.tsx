import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Car, MapPin, Calendar, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";

const carTypes = [
  { name: "Economy", price: "From $25/day", image: "🚗" },
  { name: "Compact", price: "From $35/day", image: "🚙" },
  { name: "SUV", price: "From $55/day", image: "🚐" },
  { name: "Luxury", price: "From $95/day", image: "🏎️" },
];

const CarRental = () => {
  const [pickupLocation, setPickupLocation] = useState("");

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
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    placeholder="Pick-up location"
                    className="pl-10 h-12"
                    value={pickupLocation}
                    onChange={(e) => setPickupLocation(e.target.value)}
                  />
                </div>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    placeholder="Pick-up date"
                    className="pl-10 h-12"
                  />
                </div>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    placeholder="Drop-off date"
                    className="pl-10 h-12"
                  />
                </div>
              </div>
              <Button variant="hero" size="lg" className="w-full mt-4">
                <Search className="w-5 h-5 mr-2" />
                Search Cars
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Car Types */}
      <section className="py-16 px-4 flex-1">
        <div className="container mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8 text-center">
            Popular Car Types
          </h2>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {carTypes.map((car) => (
              <div
                key={car.name}
                className="bg-card border border-border rounded-2xl p-6 text-center hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer"
              >
                <div className="text-5xl mb-4">{car.image}</div>
                <h3 className="text-lg font-semibold text-foreground mb-1">{car.name}</h3>
                <p className="text-sm text-muted-foreground">{car.price}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default CarRental;
