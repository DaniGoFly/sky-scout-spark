import SearchForm from "./SearchForm";

interface HeroProps {
  onSearch?: () => void;
}

const Hero = ({ onSearch }: HeroProps) => {
  return (
    <section className="relative pt-32 pb-20 px-4 overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 gradient-hero opacity-5" />
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/5 to-transparent" />
      
      {/* Floating Elements */}
      <div className="absolute top-40 left-10 w-20 h-20 bg-primary/10 rounded-full blur-2xl animate-float" />
      <div className="absolute bottom-20 right-20 w-32 h-32 bg-primary/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />

      <div className="container mx-auto relative">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
            Find your next
            <span className="block text-primary">adventure</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            GoFlyFinder compares flight prices from multiple travel partners so you can find the best deals. When you click a deal, you'll be redirected to the provider to complete your booking.
          </p>
        </div>

        <SearchForm onSearch={onSearch} />

        {/* Trust Badges */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-sm">No hidden fees</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-sm">Price match guarantee</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-sm">24/7 support</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
