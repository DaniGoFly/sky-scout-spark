import TravelpayoutsWidget from "./TravelpayoutsWidget";

const FlightSearchHero = () => {
  return (
    <section className="relative min-h-[500px] flex flex-col">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1920&auto=format&fit=crop&q=80"
          alt="Flight search background"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/60" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col justify-center py-12 px-4">
        <div className="container mx-auto">
          {/* Hero Text */}
          <div className="text-center mb-8 max-w-3xl mx-auto">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3">
              Search cheap flights
            </h1>
            <p className="text-lg text-white/80">
              Compare prices from hundreds of airlines and booking sites
            </p>
          </div>

          {/* Search Widget Container */}
          <div className="max-w-4xl mx-auto">
            <div className="rounded-xl overflow-visible">
              <TravelpayoutsWidget />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FlightSearchHero;
