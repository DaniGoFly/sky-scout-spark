import TravelpayoutsWidget from "./TravelpayoutsWidget";
import { Plane, Shield, Sparkles, TrendingDown, ExternalLink } from "lucide-react";

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
        {/* Badge */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-sm font-medium text-foreground/80">
            <TrendingDown className="w-4 h-4 text-emerald-500" />
            <span>Find the lowest prices on flights</span>
          </div>
        </div>

        {/* Main headline - clear value prop */}
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-foreground mb-4 leading-[1.1] tracking-tight">
            Find the Best
            <span className="block gradient-text mt-1">Flight Deals</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Compare flights from hundreds of airlines and booking sites. 
            Search, compare prices, and book with our trusted partners.
          </p>
        </div>

        {/* Travelpayouts Widget */}
        <div className="widget-wrapper glass rounded-2xl p-6 md:p-8 max-w-4xl mx-auto">
          <TravelpayoutsWidget />
        </div>

        {/* Explanation */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-4 py-2">
            <ExternalLink className="w-4 h-4" />
            <span>Clicking "Search" will redirect you to Aviasales for live results and booking</span>
          </div>
        </div>

        {/* Trust Badges - key differentiators */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-6 md:gap-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Shield className="w-4 h-4 text-emerald-500" />
            </div>
            <span>No hidden fees</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Plane className="w-4 h-4 text-primary" />
            </div>
            <span>500+ airlines</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-accent" />
            </div>
            <span>Best price guarantee</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FlightSearchHero;
