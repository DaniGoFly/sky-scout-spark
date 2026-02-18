import { useState, forwardRef, useImperativeHandle, RefObject } from "react";
import FlightSearchForm from "./FlightSearchForm";
import FlightPathsBackground from "./FlightPathsBackground";
import TravelAssistant from "./TravelAssistant";
import type { AISearchParams } from "./FlightSearchHero";

export interface HeroHandle {
  setDestination: (params: AISearchParams) => void;
  setTravelPrompt: (prompt: string) => void;
}

interface HeroProps {
  searchRef?: RefObject<HTMLDivElement | null>;
}

const Hero = forwardRef<HeroHandle, HeroProps>(({ searchRef }, ref) => {
  const [aiSearchParams, setAiSearchParams] = useState<AISearchParams | null>(null);
  const [travelPrompt, setTravelPrompt] = useState<string | null>(null);

  useImperativeHandle(ref, () => ({
    setDestination: (params: AISearchParams) => {
      setAiSearchParams(params);
    },
    setTravelPrompt: (prompt: string) => {
      setTravelPrompt(prompt);
    },
  }));

  const handleDestinationSelect = (params: AISearchParams) => {
    setAiSearchParams(params);
  };

  const handleParamsConsumed = () => {
    setAiSearchParams(null);
  };

  return (
    <section className="hero-section relative min-h-[100svh] flex flex-col overflow-hidden">
      {/* Subtle radial highlight */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(900px circle at 50% 0%, rgba(47,122,248,0.18), transparent 60%)",
        }}
      />

      <FlightPathsBackground />

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col justify-center pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-5xl">
          {/* Hero Text */}
          <div className="text-center mb-8 sm:mb-12 animate-fade-in">
            <h1 className="text-[32px] sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-4 sm:mb-6 leading-[1.1] tracking-tight text-white">
              Find your next{" "}
              <span className="text-[hsl(200,100%,70%)]">adventure</span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-white/65 max-w-xl mx-auto leading-relaxed px-2">
              Compare prices from hundreds of airlines and book your dream trip in seconds
            </p>
          </div>

          {/* Flight Search Form — white card on dark hero */}
          <div ref={searchRef} className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <FlightSearchForm
              aiSearchParams={aiSearchParams}
              onParamsConsumed={handleParamsConsumed}
            />
          </div>

          {/* AI Travel Assistant */}
          <div className="mt-8 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <TravelAssistant onDestinationSelect={handleDestinationSelect} initialPrompt={travelPrompt} />
          </div>
        </div>
      </div>
    </section>
  );
});

Hero.displayName = "Hero";

export default Hero;
