import SearchForm from "./SearchForm";
import { Shield, Sparkles, Clock, Plane, Hotel } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Hero = () => {
  return (
    <section className="relative pt-28 pb-24 px-4 overflow-hidden">
      {/* Layered Background */}
      <div className="absolute inset-0 gradient-hero-subtle" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_hsl(199_89%_48%_/_0.15),_transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_hsl(280_65%_60%_/_0.1),_transparent_50%)]" />
      
      {/* Animated Orbs */}
      <div className="absolute top-20 left-[10%] w-72 h-72 bg-primary/20 rounded-full blur-[100px] animate-pulse-slow" />
      <div className="absolute bottom-10 right-[5%] w-96 h-96 bg-accent/15 rounded-full blur-[120px] animate-pulse-slow" style={{ animationDelay: '2s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px]" />
      
      {/* Floating decorative elements */}
      <div className="absolute top-32 right-[15%] w-3 h-3 bg-primary rounded-full animate-float opacity-60" />
      <div className="absolute top-48 left-[20%] w-2 h-2 bg-accent rounded-full animate-float opacity-40" style={{ animationDelay: '1s' }} />
      <div className="absolute bottom-32 right-[25%] w-4 h-4 bg-primary/60 rounded-full animate-float" style={{ animationDelay: '3s' }} />

      <div className="container mx-auto relative">
        {/* Badge */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-sm font-medium text-foreground/80">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>Compare Flights & Hotels</span>
          </div>
        </div>

        <div className="text-center mb-14">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-foreground mb-6 leading-[1.1] tracking-tight">
            Find Your Best Travel Deal
            <span className="block gradient-text mt-2">Flights & Hotels</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-5 leading-relaxed">
            Search, compare, and explore flight and hotel options from leading travel providers. Find competitive prices and book securely with our partners.
          </p>
        </div>

        <SearchForm />
        
        {/* Quick Links */}
        <div className="flex justify-center gap-4 mt-6">
          <Button asChild variant="outline" className="rounded-xl">
            <Link to="/flights" className="gap-2">
              <Plane className="w-4 h-4" />
              Search Flights
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-xl">
            <Link to="/hotels" className="gap-2">
              <Hotel className="w-4 h-4" />
              Search Hotels
            </Link>
          </Button>
        </div>

        {/* Trust Badges */}
        <div className="mt-14 flex flex-wrap items-center justify-center gap-6 md:gap-10">
          <div className="flex items-center gap-3 px-5 py-3 rounded-2xl glass">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="text-left">
              <span className="text-sm font-semibold text-foreground block">No hidden fees</span>
              <span className="text-xs text-muted-foreground">Transparent pricing</span>
            </div>
          </div>
          <div className="flex items-center gap-3 px-5 py-3 rounded-2xl glass">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div className="text-left">
              <span className="text-sm font-semibold text-foreground block">Best price match</span>
              <span className="text-xs text-muted-foreground">Compare top providers</span>
            </div>
          </div>
          <div className="flex items-center gap-3 px-5 py-3 rounded-2xl glass">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-accent" />
            </div>
            <div className="text-left">
              <span className="text-sm font-semibold text-foreground block">Easy booking</span>
              <span className="text-xs text-muted-foreground">Quick comparison</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
