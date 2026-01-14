import TravelpayoutsWidget from "./TravelpayoutsWidget";

const FlightSearchHero = () => {
  return (
    <section className="relative min-h-[750px] flex flex-col">
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
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center py-16 px-4">
        <div className="container mx-auto">
          {/* Hero Text */}
          <div className="text-center mb-10 max-w-3xl mx-auto">
            <p className="text-primary text-sm font-medium tracking-wide uppercase mb-3">
              ✈️ Your journey starts here
            </p>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
              Where would you like to go?
            </h1>
            <p className="text-lg md:text-xl text-white/85">
              Search hundreds of airlines and find the best deals for your next adventure
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
