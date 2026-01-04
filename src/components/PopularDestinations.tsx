import DestinationCard from "./DestinationCard";

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
    <section className="py-20 px-4">
      <div className="container mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Popular Destinations
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Explore our most searched flights and find your next adventure
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {destinations.map((destination) => (
            <div
              key={destination.city}
              className="opacity-0 animate-slide-up"
              style={{ animationDelay: `${destinations.indexOf(destination) * 100}ms`, animationFillMode: 'forwards' }}
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
