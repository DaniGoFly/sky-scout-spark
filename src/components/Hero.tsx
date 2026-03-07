import { useState, forwardRef, useImperativeHandle, RefObject } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import FlightSearchForm from "./FlightSearchForm";
import TravelAssistant from "./TravelAssistant";
import { Plane, Building2, Car, Package, Sparkles, MapPin, CalendarSearch, Shield, Wifi, DollarSign, CheckCircle2 } from "lucide-react";
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
  { city: "Barcelona", price: "€95", emoji: "🇪🇸" },
  { city: "Paris", price: "€110", emoji: "🗼" },
];

const TRUST_ITEMS = [
  { icon: Plane, text: "600+ airlines" },
  { icon: Shield, text: "No hidden fees" },
  { icon: CheckCircle2, text: "Verified partners" },
  { icon: Wifi, text: "Live price updates" },
];

const SMART_TOOLS = [
  { icon: Sparkles, title: "AI Travel Guide", desc: "Get personalized travel recommendations" },
  { icon: MapPin, title: "Explore Map", desc: "Discover cheapest destinations nearby", href: "/explore" },
  { icon: CalendarSearch, title: "Flexible Dates", desc: "Find the cheapest days to fly" },
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
    <section className="relative overflow-hidden bg-background">
      {/* ── Premium atmospheric glow ── */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {/* Central soft white-blue bloom */}
        <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full opacity-[0.06]"
          style={{ background: "radial-gradient(ellipse, hsl(210 60% 95%), hsl(217 91% 58% / 0.15), transparent 70%)" }} />
        {/* Secondary softer bloom lower */}
        <div className="absolute top-[30%] left-1/2 -translate-x-1/2 w-[1200px] h-[400px] rounded-full opacity-[0.04]"
          style={{ background: "radial-gradient(ellipse, hsl(210 50% 90%), transparent 65%)" }} />
        {/* Subtle side accents */}
        <div className="absolute top-[15%] right-[10%] w-[250px] h-[250px] rounded-full bg-primary/[0.02] blur-[100px]" />
        <div className="absolute top-[20%] left-[8%] w-[200px] h-[200px] rounded-full bg-primary/[0.015] blur-[80px]" />
      </div>

      <div className="relative z-10 pt-24 sm:pt-28 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1100px]">

          {/* ── Mode pills ── */}
          <div className="flex items-center gap-1.5 mb-8 overflow-x-auto pb-1 scrollbar-none justify-center sm:justify-start" style={{ WebkitOverflowScrolling: "touch" }}>
            {MODE_PILLS.map((pill) => {
              const Icon = pill.icon;
              return (
                <button
                  key={pill.id}
                  onClick={() => handlePillClick(pill)}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all shrink-0
                    ${pill.active
                      ? "bg-primary/15 text-primary border border-primary/25"
                      : "comingSoon" in pill && pill.comingSoon
                        ? "text-muted-foreground/50 hover:text-muted-foreground cursor-pointer"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/40 cursor-pointer"
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  {t(pill.label)}
                  {"badge" in pill && pill.badge && (
                    <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 rounded-full leading-none">
                      {pill.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ── Headline ── */}
          <div className="mb-8 text-center animate-fade-in">
            <h1 className="text-3xl sm:text-4xl lg:text-[2.85rem] font-bold leading-[1.12] tracking-tight text-foreground">
              Find better flights{" "}
              <span className="text-primary">in seconds.</span>
            </h1>
            <p className="mt-3 text-[15px] sm:text-base text-muted-foreground leading-relaxed max-w-xl mx-auto">
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
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 mt-7 animate-fade-in" style={{ animationDelay: "0.08s" }}>
            {TRUST_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.text} className="flex items-center gap-2">
                  <Icon className="w-3.5 h-3.5 text-muted-foreground/60" />
                  <span className="text-[12px] text-muted-foreground/80 font-medium tracking-wide">{item.text}</span>
                </div>
              );
            })}
          </div>

          {/* ── Smart Travel Tools ── */}
          <div className="mt-14 animate-fade-in" style={{ animationDelay: "0.12s" }}>
            <h3 className="text-xs font-semibold text-muted-foreground/70 mb-4 uppercase tracking-[0.15em] text-center sm:text-left">Smart Travel Tools</h3>
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
                    className="flex items-center gap-3.5 p-4 rounded-xl border border-border/30 bg-card/40 hover:bg-card/70 hover:border-border/50 transition-all text-left group cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-lg bg-secondary/60 flex items-center justify-center shrink-0 group-hover:bg-secondary transition-colors">
                      <Icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-sm font-semibold text-foreground block">{tool.title}</span>
                      <span className="text-[12px] text-muted-foreground/70 leading-snug">{tool.desc}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* AI Guide expandable */}
            {showAIGuide && (
              <div className="mt-3 rounded-xl border border-border/40 bg-card/50 p-4 animate-fade-in">
                <TravelAssistant onDestinationSelect={handleDestinationSelect} initialPrompt={travelPrompt} />
              </div>
            )}
          </div>

          {/* ── Popular destinations ── */}
          <div className="mt-10 animate-fade-in" style={{ animationDelay: "0.15s" }}>
            <h3 className="text-xs font-semibold text-muted-foreground/70 mb-4 uppercase tracking-[0.15em] text-center sm:text-left">Popular destinations right now</h3>
            <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
              {POPULAR_DESTINATIONS.map((dest) => (
                <div
                  key={dest.city}
                  className="shrink-0 flex items-center gap-3 px-4 py-3 rounded-xl bg-card/40 border border-border/25 hover:border-border/50 hover:bg-card/60 transition-all cursor-pointer group"
                >
                  <span className="text-xl">{dest.emoji}</span>
                  <div>
                    <span className="text-sm font-medium text-foreground block leading-tight group-hover:text-primary transition-colors">{dest.city}</span>
                    <span className="text-xs text-muted-foreground font-medium">from {dest.price}</span>
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
