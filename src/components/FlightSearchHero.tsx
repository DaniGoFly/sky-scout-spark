import TravelpayoutsWidget from "./TravelpayoutsWidget";
import TravelAssistant from "./TravelAssistant";

const FlightSearchHero = () => {
  return (
    <section className="relative min-h-[900px] flex flex-col">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1920&auto=format&fit=crop&q=80"
          alt="Flight search background"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
      </div>

      {/* Content - positioned toward top to leave room below for calendar */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-start pt-20 pb-16 px-4">
        <div className="container mx-auto">
          {/* Hero Text */}
          <div className="text-center mb-10 max-w-4xl mx-auto">
            <p className="text-primary text-base font-semibold tracking-wider uppercase mb-4">
              ✈️ Your journey starts here
            </p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              Where would you like to go?
            </h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-2xl mx-auto">
              Search hundreds of airlines and find the best deals for your next adventure
            </p>
          </div>

          {/* Search Widget Container */}
          <div className="max-w-4xl mx-auto">
            <div className="rounded-xl overflow-visible">
              <TravelpayoutsWidget />
            </div>
          </div>

          {/* AI Travel Assistant */}
          <TravelAssistant />
        </div>
      </div>
    </section>
  );
};

export default FlightSearchHero;
