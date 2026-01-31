import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const destinations = [
  {
    city: "Paris",
    country: "France",
    image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&auto=format&fit=crop",
  },
  {
    city: "Tokyo",
    country: "Japan",
    image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=600&auto=format&fit=crop",
  },
  {
    city: "New York",
    country: "United States",
    image: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=600&auto=format&fit=crop",
  },
  {
    city: "London",
    country: "United Kingdom",
    image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600&auto=format&fit=crop",
  },
];

const PopularDestinations = () => {
  return (
    <section className="py-20 px-4 bg-background">
      <div className="container mx-auto max-w-5xl">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
              Popular destinations
            </h2>
            <p className="text-muted-foreground">
              Trending flight searches
            </p>
          </div>
          <Link 
            to="/flights" 
            className="hidden md:flex items-center gap-2 text-primary hover:text-primary/80 font-medium transition-colors text-sm"
          >
            View all
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {destinations.map((destination) => (
            <Link
              key={destination.city}
              to={`/flights?to=${encodeURIComponent(destination.city)}`}
              className="group relative overflow-hidden rounded-2xl aspect-[3/4] bg-secondary"
            >
              <img
                src={destination.image}
                alt={destination.city}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h3 className="text-lg font-bold text-white mb-0.5">
                  {destination.city}
                </h3>
                <p className="text-white/70 text-sm">
                  {destination.country}
                </p>
              </div>
              
              {/* Hover indicator */}
              <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRight className="w-4 h-4 text-white" />
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-8 text-center md:hidden">
          <Link 
            to="/flights" 
            className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium transition-colors text-sm"
          >
            View all destinations
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default PopularDestinations;
