import { Plane, Sparkles, Globe, ArrowRight } from "lucide-react";
import FlightSearchForm from "./FlightSearchForm";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex flex-col overflow-hidden noise-overlay">
      {/* Animated background gradients */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/20" />
        
        {/* Floating orbs */}
        <div className="absolute top-20 left-[10%] w-96 h-96 bg-primary/30 rounded-full blur-[120px] animate-float" />
        <div className="absolute bottom-20 right-[10%] w-80 h-80 bg-accent/20 rounded-full blur-[100px] animate-float-delayed" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[150px]" />
        
        {/* Grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px),
                              linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col justify-center pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-5xl">
          {/* Badge */}
          <div className="flex justify-center mb-8 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 backdrop-blur-sm">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Powered by AI</span>
            </div>
          </div>

          {/* Hero Text */}
          <div className="text-center mb-12 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight tracking-tight">
              <span className="text-foreground">Find your next</span>
              <br />
              <span className="gradient-text">adventure</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Compare prices from hundreds of airlines and book your dream trip in seconds
            </p>
          </div>

          {/* Flight Search Form */}
          <div className="animate-fade-in glow-primary rounded-2xl" style={{ animationDelay: '0.2s' }}>
            <FlightSearchForm />
          </div>

          {/* Stats/Trust indicators */}
          <div className="mt-16 flex flex-wrap justify-center gap-8 md:gap-16 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-foreground mb-1">500+</div>
              <div className="text-sm text-muted-foreground">Airlines</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-foreground mb-1">2M+</div>
              <div className="text-sm text-muted-foreground">Routes</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-foreground mb-1">Best</div>
              <div className="text-sm text-muted-foreground">Price guarantee</div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-fade-in" style={{ animationDelay: '0.5s' }}>
        <span className="text-xs text-muted-foreground uppercase tracking-widest">Explore</span>
        <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex justify-center pt-2">
          <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" />
        </div>
      </div>
    </section>
  );
};

export default Hero;
