import { Button } from "@/components/ui/button";
import { Hotel, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

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
];

const HotelSection = () => {
  const navigate = useNavigate();

  const handleSearchHotelsClick = () => {
    navigate("/hotels");
    // After navigation, scroll to the search form
    setTimeout(() => {
      const searchForm = document.querySelector('[data-hotel-search-form]');
      if (searchForm) {
        searchForm.scrollIntoView({ behavior: "smooth", block: "center" });
        const destinationInput = searchForm.querySelector('input[placeholder*="Where"]') as HTMLInputElement;
        if (destinationInput) {
          destinationInput.focus();
        }
      }
    }, 100);
  };

  const handleDestinationClick = (city: string) => {
    // Navigate to hotels page with pre-filled city and auto-search
    navigate(`/hotels?city=${encodeURIComponent(city)}&autoSearch=true`);
  };

  return (
    <section className="py-16 px-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-secondary/50 to-transparent" />
      
      <div className="container mx-auto text-center relative z-10">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6">
            <Hotel className="w-4 h-4" />
            <span className="text-sm font-medium">Accommodations</span>
          </div>
          
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Find the Perfect Hotel
          </h2>
          
          <p className="text-muted-foreground mb-8 text-lg">
            Compare hotel prices from trusted booking partners worldwide.
          </p>
          
          <Button 
            variant="hero" 
            size="lg" 
            onClick={handleSearchHotelsClick}
          >
            <Hotel className="w-5 h-5 mr-2" />
            Search Hotels
          </Button>
          
          <p className="text-sm text-muted-foreground mt-4 mb-10">
            No hidden fees • Secure booking • Trusted travel partners
          </p>

          {/* Destination Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {destinations.map((destination) => (
              <div
                key={destination.city}
                onClick={() => handleDestinationClick(destination.city)}
                className="group relative rounded-2xl overflow-hidden aspect-[4/3] shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer"
              >
                <img
                  src={destination.image}
                  alt={`${destination.city}, ${destination.country}`}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4 text-left">
                  <h3 className="text-xl font-bold text-white">{destination.city}</h3>
                  <p className="text-white/80 text-sm">{destination.country}</p>
                </div>
                <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <ArrowRight className="w-4 h-4 text-white" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HotelSection;