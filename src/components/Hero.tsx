import TravelpayoutsWidget from "./TravelpayoutsWidget";

const Hero = () => {
  return (
    <section className="relative min-h-[600px] md:min-h-[700px] flex flex-col">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1920&auto=format&fit=crop&q=80"
          alt="Travel background"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col justify-center pt-20 pb-12 px-4">
        <div className="container mx-auto">
          {/* Hero Text */}
          <div className="text-center mb-10 max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
              Find and compare<br className="hidden sm:block" /> cheap flights
            </h1>
            <p className="text-lg md:text-xl text-white/80">
              Search hundreds of travel sites at once
            </p>
          </div>

          {/* Search Widget Container */}
          <div className="max-w-4xl mx-auto">
            <div className="rounded-xl overflow-visible pb-64">
              <TravelpayoutsWidget />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
