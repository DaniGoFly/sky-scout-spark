import { useState, forwardRef, useImperativeHandle, RefObject } from "react";
import { useNavigate } from "react-router-dom";
import FlightSearchForm from "./FlightSearchForm";
import TravelAssistant from "./TravelAssistant";
import { Plane, Building2, Car, Package } from "lucide-react";
import type { AISearchParams } from "./FlightSearchHero";

export interface HeroHandle {
  setDestination: (params: AISearchParams) => void;
  setTravelPrompt: (prompt: string) => void;
}

interface HeroProps {
  searchRef?: RefObject<HTMLDivElement | null>;
}

const MODE_PILLS = [
  { id: "flights", label: "Flights", icon: Plane, active: true },
  { id: "hotels", label: "Hotels", icon: Building2, active: false, href: "/hotels" },
  { id: "cars", label: "Car rental", icon: Car, active: false },
  { id: "packages", label: "Packages", icon: Package, active: false, badge: "New" },
] as const;

const Hero = forwardRef<HeroHandle, HeroProps>(({ searchRef }, ref) => {
  const navigate = useNavigate();
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
    <section className="relative overflow-hidden bg-background">
      {/* Subtle ambient glow — very understated */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/5 rounded-full blur-[150px] pointer-events-none" />

      <div className="relative z-10 pt-10 sm:pt-12 pb-8 px-4 sm:px-6">
        <div className="container mx-auto max-w-5xl">

          {/* ── A) Mode pills ── */}
          <div className="flex items-center gap-1.5 mb-6 overflow-x-auto pb-1 -mx-1 px-1">
            {MODE_PILLS.map((pill) => {
              const Icon = pill.icon;
              return (
                <button
                  key={pill.id}
                  onClick={() => {
                    if (pill.active) return;
                    if ('href' in pill && pill.href) navigate(pill.href);
                  }}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all shrink-0
                    ${pill.active
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer"
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  {pill.label}
                  {'badge' in pill && pill.badge && (
                    <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-primary/20 text-primary rounded-full leading-none">
                      {pill.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ── B) Headline + Subline ── */}
          <div className="mb-5 animate-fade-in">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight tracking-tight text-foreground text-center lg:text-left">
              Millions of cheap flights.{" "}
              <span className="text-primary">One simple search.</span>
            </h1>
            <p className="mt-1.5 text-sm sm:text-base text-muted-foreground text-center lg:text-left">
              Compare airlines &amp; agencies. Book via verified partners.
            </p>
          </div>

          {/* ── C+D) Search form (trip dropdown + segmented bar + checkboxes) ── */}
          <div ref={searchRef} className="animate-fade-in" style={{ animationDelay: "0.05s" }}>
            <FlightSearchForm
              aiSearchParams={aiSearchParams}
              onParamsConsumed={handleParamsConsumed}
            />
          </div>

          {/* ── AI Travel Assistant ── */}
          <div className="mt-8 animate-fade-in" style={{ animationDelay: "0.15s" }}>
            <TravelAssistant onDestinationSelect={handleDestinationSelect} initialPrompt={travelPrompt} />
          </div>
        </div>
      </div>
    </section>
  );
});

Hero.displayName = "Hero";

export default Hero;
