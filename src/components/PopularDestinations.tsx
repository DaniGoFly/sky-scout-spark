import DestinationCard from "./DestinationCard";
import { MapPin } from "lucide-react";

const destinations = [
  {
    city: "Paris",
    country: "France",
    price: 349,
    image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&auto=format&fit=crop",
  },
  {
    city: "Tokyo",
    country: "Japan",
    price: 699,
    image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&auto=format&fit=crop",
  },
  {
    city: "New York",
    country: "United States",
    price: 199,
    image: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&auto=format&fit=crop",
  },
  {
    city: "Dubai",
    country: "UAE",
    price: 449,
    image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&auto=format&fit=crop",
  },
];

const PopularDestinations = () => {
  return (
    <section className="py-24 px-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_hsl(199_89%_48%_/_0.03),_transparent_70%)]" />
      
      <div className="container mx-auto relative">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-6">
            <MapPin className="w-4 h-4" />
            <span>Trending destinations</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-foreground mb-5 tracking-tight">
            Popular Destinations
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Explore our most searched flights and discover your next adventure
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {destinations.map((destination, index) => (
            <div
              key={destination.city}
              className="opacity-0 animate-slide-up"
              style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'forwards' }}
            >
              <DestinationCard {...destination} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PopularDestinations;
