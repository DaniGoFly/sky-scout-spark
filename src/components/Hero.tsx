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
    <section className="relative bg-background">
      {/* Ambient gradient — very subtle */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-primary/[0.04] rounded-full blur-[180px] pointer-events-none" />

      <div className="relative z-10 pt-24 sm:pt-28 pb-10 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1100px]">

          {/* ── Mode pills ── */}
          <div
            className="flex items-center gap-2 mb-8 overflow-x-auto pb-1 scrollbar-none"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {MODE_PILLS.map((pill) => {
              const Icon = pill.icon;
              return (
                <button
                  key={pill.id}
                  onClick={() => {
                    if (pill.active) return;
                    if ("href" in pill && pill.href) navigate(pill.href);
                  }}
                  className={`
                    flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all shrink-0
                    ${pill.active
                      ? "bg-primary text-primary-foreground shadow-[0_2px_12px_hsl(var(--primary)/0.3)]"
                      : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer"
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  {pill.label}
                  {"badge" in pill && pill.badge && (
                    <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 rounded-full leading-none">
                      {pill.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ── Headline ── */}
          <div className="mb-6 animate-fade-in">
            <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold leading-[1.15] tracking-tight text-foreground">
              Millions of cheap flights.{" "}
              <span className="text-primary">One simple search.</span>
            </h1>
            <p className="mt-2.5 text-[15px] sm:text-base text-muted-foreground leading-relaxed max-w-lg">
              Compare airlines &amp; agencies. Book via verified partners.
            </p>
          </div>

          {/* ── Search bar ── */}
          <div ref={searchRef} className="animate-fade-in" style={{ animationDelay: "0.05s" }}>
            <FlightSearchForm
              aiSearchParams={aiSearchParams}
              onParamsConsumed={handleParamsConsumed}
            />
          </div>

          {/* ── AI Travel Guide (secondary) ── */}
          <div className="mt-8 animate-fade-in mx-auto w-full max-w-3xl" style={{ animationDelay: "0.15s" }}>
            <TravelAssistant onDestinationSelect={handleDestinationSelect} initialPrompt={travelPrompt} />
          </div>
        </div>
      </div>
    </section>
  );
});

Hero.displayName = "Hero";

export default Hero;
