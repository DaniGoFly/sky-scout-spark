import FlightSearchForm from "./FlightSearchForm";
import { Plane, Shield, Sparkles } from "lucide-react";

const FlightSearchHero = () => {
  return (
    <section className="relative py-16 px-4 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 gradient-hero-subtle" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_hsl(199_89%_48%_/_0.15),_transparent_50%)]" />
      
      {/* Animated Orbs */}
      <div className="absolute top-20 left-[10%] w-72 h-72 bg-primary/20 rounded-full blur-[100px] animate-pulse-slow" />
      <div className="absolute bottom-10 right-[5%] w-96 h-96 bg-accent/15 rounded-full blur-[120px] animate-pulse-slow" style={{ animationDelay: '2s' }} />

      <div className="container mx-auto relative">
        {/* Header */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-sm font-medium text-foreground/80">
            <Plane className="w-4 h-4 text-primary" />
            <span>Find the best flight deals</span>
          </div>
        </div>

        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-foreground mb-4 leading-[1.1] tracking-tight">
            Search Flights
            <span className="block gradient-text mt-1">Compare & Save</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Compare prices from hundreds of airlines and book directly with your preferred provider.
          </p>
        </div>

        <FlightSearchForm />

        {/* Trust Badges */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="w-4 h-4 text-emerald-500" />
            <span>No hidden fees</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>Best price guarantee</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FlightSearchHero;
