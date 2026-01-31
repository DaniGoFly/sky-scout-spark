import { ArrowRight, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

const destinations = [
  {
    city: "Paris",
    country: "France",
    image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&auto=format&fit=crop",
    color: "from-violet-500/80 to-purple-900/90",
  },
  {
    city: "Tokyo",
    country: "Japan",
    image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=600&auto=format&fit=crop",
    color: "from-pink-500/80 to-rose-900/90",
  },
  {
    city: "New York",
    country: "United States",
    image: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=600&auto=format&fit=crop",
    color: "from-cyan-500/80 to-blue-900/90",
  },
  {
    city: "London",
    country: "United Kingdom",
    image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600&auto=format&fit=crop",
    color: "from-amber-500/80 to-orange-900/90",
  },
];

const PopularDestinations = () => {
  return (
    <section className="py-24 px-4 bg-background relative overflow-hidden">
      {/* Background accent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/5 rounded-full blur-[120px]" />
      
      <div className="container mx-auto max-w-6xl relative z-10">
        <div className="flex items-end justify-between mb-12">
          <div>
            <span className="text-primary text-sm font-semibold uppercase tracking-widest mb-2 block">
              Trending now
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Popular destinations
            </h2>
          </div>
          <Link 
            to="/flights" 
            className="hidden md:flex items-center gap-2 text-muted-foreground hover:text-primary font-medium transition-colors text-sm group"
          >
            View all
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {destinations.map((destination, index) => (
            <Link
              key={destination.city}
              to={`/flights?to=${encodeURIComponent(destination.city)}`}
              className="group relative overflow-hidden rounded-2xl aspect-[3/4] bg-secondary animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <img
                src={destination.image}
                alt={destination.city}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              
              {/* Gradient overlay */}
              <div className={`absolute inset-0 bg-gradient-to-t ${destination.color} opacity-60 group-hover:opacity-70 transition-opacity`} />
              
              {/* Content */}
              <div className="absolute inset-0 p-5 flex flex-col justify-end">
                <div className="flex items-center gap-1.5 text-white/80 text-xs mb-2">
                  <MapPin className="w-3 h-3" />
                  <span>{destination.country}</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  {destination.city}
                </h3>
                <div className="flex items-center gap-2 text-white/80 text-sm opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                  <span>Explore flights</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
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
