import { MapPin, ArrowRight } from "lucide-react";

const destinations = [
  {
    city: "Paris",
    country: "France",
    code: "CDG",
    image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=3840&auto=format&fit=crop&q=90",
  },
  {
    city: "Tokyo",
    country: "Japan",
    code: "TYO",
    image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=3840&auto=format&fit=crop&q=90",
  },
  {
    city: "New York",
    country: "United States",
    code: "JFK",
    image: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=3840&auto=format&fit=crop&q=90",
  },
  {
    city: "London",
    country: "United Kingdom",
    code: "LHR",
    image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=3840&auto=format&fit=crop&q=90",
  },
];

interface PopularDestinationsProps {
  onDestinationClick?: (destination: { city: string; code: string }) => void;
}

const PopularDestinations = ({ onDestinationClick }: PopularDestinationsProps) => {
  return (
    <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-background relative">
      <div className="mx-auto max-w-[1100px] relative z-10">
        {/* Section header */}
        <div className="mb-10 sm:mb-14">
          <span className="text-primary text-xs font-semibold uppercase tracking-[0.15em] mb-3 block">
            Trending now
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground leading-tight">
            Popular destinations
          </h2>
          <p className="mt-2 text-muted-foreground text-[15px] max-w-md">
            Explore the world's most loved cities — click to search flights instantly.
          </p>
        </div>

        {/* Cards grid */}
        <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:gap-5 sm:overflow-visible sm:pb-0 scrollbar-hide">
          {destinations.map((destination, index) => (
            <button
              key={destination.city}
              onClick={() => onDestinationClick?.({ city: destination.city, code: destination.code })}
              className="group relative overflow-hidden rounded-2xl aspect-[3/4] bg-secondary animate-fade-in text-left snap-start flex-shrink-0 w-[68vw] sm:w-auto active:scale-[0.98] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 focus:ring-offset-background"
              style={{ animationDelay: `${index * 0.08}s` }}
            >
              <img
                src={destination.image}
                alt={`Flights to ${destination.city}`}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                loading="lazy"
              />
              
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              
              <div className="absolute inset-0 p-5 sm:p-6 flex flex-col justify-end">
                <div className="flex items-center gap-1.5 text-white/70 text-xs mb-1.5">
                  <MapPin className="w-3 h-3" />
                  <span>{destination.country}</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
                  {destination.city}
                </h3>
                <div className="flex items-center gap-2 text-white/80 text-sm font-medium opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
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
