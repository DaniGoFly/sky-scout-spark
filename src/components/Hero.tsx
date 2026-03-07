import { useState, forwardRef, useImperativeHandle, RefObject } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import FlightSearchForm from "./FlightSearchForm";
import TravelAssistant from "./TravelAssistant";
import { Plane, Building2, Car, Package, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { AISearchParams } from "./FlightSearchHero";

export interface HeroHandle {
  setDestination: (params: AISearchParams) => void;
  setTravelPrompt: (prompt: string) => void;
}

interface HeroProps {
  searchRef?: RefObject<HTMLDivElement | null>;
}

const MODE_PILLS = [
  { id: "flights", label: "nav.flights", icon: Plane, active: true },
  { id: "hotels", label: "nav.hotels", icon: Building2, active: false, href: "/hotels" },
  { id: "cars", label: "hero.car_rental", icon: Car, active: false, comingSoon: true },
  { id: "packages", label: "hero.packages", icon: Package, active: false, badge: "New", comingSoon: true },
] as const;

/* Mini destination cards shown under search */
const POPULAR_DESTINATIONS = [
  { city: "Bali", price: "€420", emoji: "🌴" },
  { city: "Mallorca", price: "€89", emoji: "☀️" },
  { city: "New York", price: "€390", emoji: "🗽" },
  { city: "Dubai", price: "€310", emoji: "🏙️" },
  { city: "Tokyo", price: "€480", emoji: "🗼" },
  { city: "London", price: "€120", emoji: "🇬🇧" },
];

const Hero = forwardRef<HeroHandle, HeroProps>(({ searchRef }, ref) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
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

  const handlePillClick = (pill: typeof MODE_PILLS[number]) => {
    if (pill.active) return;
    if ("comingSoon" in pill && pill.comingSoon) {
      toast.info(t("hero.coming_soon"), { duration: 3000 });
      return;
    }
    if ("href" in pill && pill.href) navigate(pill.href);
  };

  return (
    <section className="relative bg-background">
      {/* Ambient gradient */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-primary/[0.04] rounded-full blur-[180px] pointer-events-none z-0" aria-hidden="true" />

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
                  onClick={() => handlePillClick(pill)}
                  className={`
                    flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all shrink-0
                    ${pill.active
                      ? "bg-primary text-primary-foreground shadow-[0_2px_12px_hsl(var(--primary)/0.3)]"
                      : "comingSoon" in pill && pill.comingSoon
                        ? "bg-secondary/40 text-muted-foreground/70 hover:bg-secondary/60 cursor-pointer"
                        : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer"
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  {t(pill.label)}
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
          <div className="mb-8 animate-fade-in">
            <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold leading-[1.15] tracking-tight text-foreground">
              Find the best flights{" "}
              <span className="text-primary">in seconds.</span>
            </h1>
            <p className="mt-2.5 text-[15px] sm:text-base text-muted-foreground leading-relaxed max-w-lg">
              Compare airlines and travel sites to find the best deals worldwide.
            </p>
          </div>

          {/* ── Main content: Search card + AI Guide ── */}
          <div ref={searchRef} className="animate-fade-in relative z-30 pointer-events-auto" style={{ animationDelay: "0.05s" }}>
            <div className="flex flex-col lg:flex-row gap-5 items-start">
              {/* Search card — takes primary space */}
              <div className="flex-1 min-w-0 w-full">
                <FlightSearchForm
                  aiSearchParams={aiSearchParams}
                  onParamsConsumed={handleParamsConsumed}
                />
              </div>

              {/* AI Travel Guide — floating card on the right */}
              <div className="hidden lg:block w-[280px] shrink-0">
                <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-[0_4px_24px_rgba(0,0,0,0.15)] relative overflow-hidden">
                  {/* Subtle glow */}
                  <div className="absolute -top-8 -right-8 w-24 h-24 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">AI Travel Guide</h3>
                        <p className="text-[11px] text-muted-foreground">Ask anything about your trip ✨</p>
                      </div>
                    </div>
                    <div className="mt-2">
                      <TravelAssistant onDestinationSelect={handleDestinationSelect} initialPrompt={travelPrompt} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile AI Guide */}
            <div className="lg:hidden mt-6 animate-fade-in" style={{ animationDelay: "0.15s" }}>
              <TravelAssistant onDestinationSelect={handleDestinationSelect} initialPrompt={travelPrompt} />
            </div>
          </div>

          {/* ── Popular destinations strip ── */}
          <div className="mt-8 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">Popular destinations right now</h3>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
              {POPULAR_DESTINATIONS.map((dest) => (
                <div
                  key={dest.city}
                  className="shrink-0 flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-card border border-border/40 hover:border-primary/30 transition-all cursor-pointer hover:shadow-md"
                >
                  <span className="text-lg">{dest.emoji}</span>
                  <div>
                    <span className="text-sm font-medium text-foreground block leading-tight">{dest.city}</span>
                    <span className="text-xs text-primary font-semibold">from {dest.price}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});

Hero.displayName = "Hero";

export default Hero;
