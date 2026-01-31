import { useState, useCallback } from "react";
import FlightSearchForm from "./FlightSearchForm";

export interface AISearchParams {
  destinationCode: string;
  destinationName: string;
}

const FlightSearchHero = () => {
  const [aiSearchParams, setAiSearchParams] = useState<AISearchParams | null>(null);

  const handleParamsConsumed = useCallback(() => {
    setAiSearchParams(null);
  }, []);

  return (
    <section className="relative min-h-screen flex flex-col overflow-hidden noise-overlay">
      {/* Animated background gradients */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/20" />
        
        {/* Floating orbs */}
        <div className="absolute top-20 left-[10%] w-96 h-96 bg-primary/30 rounded-full blur-[120px] animate-float" />
        <div className="absolute bottom-20 right-[10%] w-80 h-80 bg-accent/20 rounded-full blur-[100px] animate-float-delayed" />
        
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
          {/* Hero Text */}
          <div className="text-center mb-12 animate-fade-in">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight tracking-tight">
              <span className="text-foreground">Search </span>
              <span className="gradient-text">flights</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Compare prices from hundreds of airlines and find the best deals
            </p>
          </div>

          {/* Flight Search Form */}
          <div className="glow-primary rounded-2xl">
            <FlightSearchForm 
              aiSearchParams={aiSearchParams}
              onParamsConsumed={handleParamsConsumed}
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default FlightSearchHero;
