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
    <section className="relative min-h-screen flex flex-col">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/30" />
      
      {/* Decorative elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col justify-center pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-5xl">
          {/* Hero Text */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight tracking-tight">
              Search flights
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Compare prices from hundreds of airlines and find the best deals
            </p>
          </div>

          {/* Flight Search Form */}
          <FlightSearchForm 
            aiSearchParams={aiSearchParams}
            onParamsConsumed={handleParamsConsumed}
          />
        </div>
      </div>
    </section>
  );
};

export default FlightSearchHero;
