import { MapPin, ArrowRight } from "lucide-react";

const destinations = [
  {
    city: "Paris",
    country: "France",
    code: "CDG",
    image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&auto=format&fit=crop&q=80",
  },
  {
    city: "Tokyo",
    country: "Japan",
    code: "TYO",
    image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&auto=format&fit=crop&q=80",
  },
  {
    city: "New York",
    country: "United States",
    code: "JFK",
    image: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&auto=format&fit=crop&q=80",
  },
  {
    city: "London",
    country: "United Kingdom",
    code: "LHR",
    image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&auto=format&fit=crop&q=80",
  },
];

interface PopularDestinationsProps {
  onDestinationClick?: (destination: { city: string; code: string }) => void;
}

const PopularDestinations = ({ onDestinationClick }: PopularDestinationsProps) => {
  return (
    <section className="py-16 sm:py-24 px-4 bg-background relative overflow-hidden">
      <div className="container mx-auto max-w-6xl relative z-10">
        <div className="mb-8 sm:mb-12">
          <span className="text-primary text-xs sm:text-sm font-semibold uppercase tracking-widest mb-2 block">
            Trending now
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">
            Popular destinations
          </h2>
        </div>

        {/* Mobile: horizontal snap carousel / Desktop: grid */}
        <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:gap-4 md:gap-6 sm:overflow-visible sm:pb-0 scrollbar-hide">
          {destinations.map((destination, index) => (
            <button
              key={destination.city}
              onClick={() => onDestinationClick?.({ city: destination.city, code: destination.code })}
              className="group relative overflow-hidden rounded-xl aspect-[3/4] bg-secondary animate-fade-in text-left snap-start flex-shrink-0 w-[70vw] sm:w-auto active:scale-[0.98] transition-transform focus:outline-none focus:ring-2 focus:ring-primary/30"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <img
                src={destination.image}
                alt={destination.city}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                loading="lazy"
              />
              
              {/* Natural dark gradient for text readability — no color tint */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />
              
              <div className="absolute inset-0 p-4 sm:p-5 flex flex-col justify-end">
                <div className="flex items-center gap-1.5 text-white/75 text-xs mb-1.5">
                  <MapPin className="w-3 h-3" />
                  <span>{destination.country}</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-1.5">
                  {destination.city}
                </h3>
                <div className="flex items-center gap-2 text-white/75 text-sm opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                  <span>Explore flights</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PopularDestinations;
