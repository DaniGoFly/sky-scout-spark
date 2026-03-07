import { useState, forwardRef, useImperativeHandle, RefObject } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import FlightSearchForm from "./FlightSearchForm";
import TravelAssistant from "./TravelAssistant";
import { Plane, Building2, Car, Package, Sparkles, MapPin, CalendarSearch, Shield, Wifi, DollarSign } from "lucide-react";
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

const POPULAR_DESTINATIONS = [
  { city: "Bali", price: "€420", emoji: "🌴" },
  { city: "Mallorca", price: "€89", emoji: "☀️" },
  { city: "New York", price: "€390", emoji: "🗽" },
  { city: "Dubai", price: "€310", emoji: "🏙️" },
  { city: "Tokyo", price: "€480", emoji: "🗼" },
  { city: "London", price: "€120", emoji: "🇬🇧" },
];

const TRUST_ITEMS = [
  { icon: Plane, text: "600+ airlines" },
  { icon: Shield, text: "No hidden fees" },
  { icon: DollarSign, text: "Verified partners" },
  { icon: Wifi, text: "Live price updates" },
];

const SMART_TOOLS = [
  { icon: Sparkles, title: "AI Travel Guide", desc: "Ask anything about your trip", color: "from-primary/20 to-primary/5" },
  { icon: MapPin, title: "Explore Map", desc: "Find cheapest destinations", color: "from-emerald-500/15 to-emerald-500/5", href: "/explore" },
  { icon: CalendarSearch, title: "Flexible Dates", desc: "Find the cheapest days to fly", color: "from-amber-500/15 to-amber-500/5" },
];

const Hero = forwardRef<HeroHandle, HeroProps>(({ searchRef }, ref) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [aiSearchParams, setAiSearchParams] = useState<AISearchParams | null>(null);
  const [travelPrompt, setTravelPrompt] = useState<string | null>(null);
  const [showAIGuide, setShowAIGuide] = useState(false);

  useImperativeHandle(ref, () => ({
    setDestination: (params: AISearchParams) => setAiSearchParams(params),
    setTravelPrompt: (prompt: string) => setTravelPrompt(prompt),
  }));

  const handleDestinationSelect = (params: AISearchParams) => setAiSearchParams(params);
  const handleParamsConsumed = () => setAiSearchParams(null);

  const handlePillClick = (pill: typeof MODE_PILLS[number]) => {
    if (pill.active) return;
    if ("comingSoon" in pill && pill.comingSoon) {
      toast.info(t("hero.coming_soon"), { duration: 3000 });
      return;
    }
    if ("href" in pill && pill.href) navigate(pill.href);
  };

  return (
    <section className="relative bg-background overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-primary/[0.03] rounded-full blur-[200px] pointer-events-none z-0" aria-hidden="true" />
      <div className="absolute top-20 right-[15%] w-[300px] h-[300px] bg-primary/[0.02] rounded-full blur-[120px] pointer-events-none z-0" aria-hidden="true" />

      <div className="relative z-10 pt-24 sm:pt-28 pb-6 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1100px]">

          {/* ── Mode pills ── */}
          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1 scrollbar-none" style={{ WebkitOverflowScrolling: "touch" }}>
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
          <div className="mb-6 text-center sm:text-left animate-fade-in">
            <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold leading-[1.15] tracking-tight text-foreground">
              Find better flights{" "}
              <span className="text-primary">in seconds.</span>
            </h1>
            <p className="mt-2 text-[15px] sm:text-base text-muted-foreground leading-relaxed max-w-lg mx-auto sm:mx-0">
              Compare airlines and travel sites worldwide to find the best deals.
            </p>
          </div>

          {/* ── Search Bar ── */}
          <div ref={searchRef} className="animate-fade-in relative z-30 pointer-events-auto" style={{ animationDelay: "0.05s" }}>
            <FlightSearchForm
              aiSearchParams={aiSearchParams}
              onParamsConsumed={handleParamsConsumed}
            />
          </div>

          {/* ── Trust indicators ── */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-6 gap-y-2 mt-6 animate-fade-in" style={{ animationDelay: "0.08s" }}>
            {TRUST_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.text} className="flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5 text-primary/70" />
                  <span className="text-[12px] text-muted-foreground font-medium">{item.text}</span>
                </div>
              );
            })}
          </div>

          {/* ── Smart Travel Tools ── */}
          <div className="mt-10 animate-fade-in" style={{ animationDelay: "0.12s" }}>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Smart Travel Tools</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {SMART_TOOLS.map((tool) => {
                const Icon = tool.icon;
                const isAI = tool.title === "AI Travel Guide";
                return (
                  <button
                    key={tool.title}
                    onClick={() => {
                      if (isAI) setShowAIGuide(!showAIGuide);
                      else if (tool.href) navigate(tool.href);
                    }}
                    className={`flex items-center gap-3 p-4 rounded-xl border border-border/40 bg-gradient-to-br ${tool.color} hover:border-primary/30 transition-all text-left group cursor-pointer`}
                  >
                    <div className="w-10 h-10 rounded-lg bg-card/80 border border-border/30 flex items-center justify-center shrink-0 group-hover:border-primary/30 transition-colors">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-foreground block">{tool.title}</span>
                      <span className="text-[12px] text-muted-foreground">{tool.desc}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* AI Guide expandable */}
            {showAIGuide && (
              <div className="mt-3 rounded-xl border border-border/50 bg-card/60 p-4 animate-fade-in">
                <TravelAssistant onDestinationSelect={handleDestinationSelect} initialPrompt={travelPrompt} />
              </div>
            )}
          </div>

          {/* ── Popular destinations ── */}
          <div className="mt-8 animate-fade-in" style={{ animationDelay: "0.15s" }}>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Popular destinations right now</h3>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
              {POPULAR_DESTINATIONS.map((dest) => (
                <div
                  key={dest.city}
                  className="shrink-0 flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-card/60 border border-border/30 hover:border-primary/30 transition-all cursor-pointer hover:bg-card/80"
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
