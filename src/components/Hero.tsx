import { useState, forwardRef, useImperativeHandle, RefObject, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import FlightSearchForm, { type FlightSearchFormHandle } from "./FlightSearchForm";
import TravelAssistant from "./TravelAssistant";
import { Plane, Building2, Car, Package, Sparkles, MapPin, CalendarSearch } from "lucide-react";
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
  { id: "hotels", label: "nav.hotels", icon: Building2, active: false, comingSoon: true },
  { id: "cars", label: "hero.car_rental", icon: Car, active: false, comingSoon: true },
  { id: "packages", label: "hero.packages", icon: Package, active: false, comingSoon: true },
] as const;

const POPULAR_DESTINATIONS = [
  { city: "Bali", code: "DPS", price: "€420", emoji: "🌴" },
  { city: "Mallorca", code: "PMI", price: "€89", emoji: "☀️" },
  { city: "New York", code: "JFK", price: "€390", emoji: "🗽" },
  { city: "Dubai", code: "DXB", price: "€310", emoji: "🏙️" },
  { city: "Tokyo", code: "TYO", price: "€480", emoji: "🗼" },
  { city: "London", code: "LHR", price: "€120", emoji: "🇬🇧" },
  { city: "Barcelona", code: "BCN", price: "€95", emoji: "🇪🇸" },
  { city: "Paris", code: "CDG", price: "€110", emoji: "🗼" },
];

const SMART_TOOLS = [
  { icon: Sparkles, titleKey: "hero_section.ai_travel_guide", descKey: "hero_section.ai_travel_desc" },
  { icon: MapPin, titleKey: "hero_section.explore_map", descKey: "hero_section.explore_map_desc", href: "/explore" },
  { icon: CalendarSearch, titleKey: "hero_section.flexible_dates_title", descKey: "hero_section.flexible_dates_desc" },
];

const Hero = forwardRef<HeroHandle, HeroProps>(({ searchRef }, ref) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [aiSearchParams, setAiSearchParams] = useState<AISearchParams | null>(null);
  const [travelPrompt, setTravelPrompt] = useState<string | null>(null);
  const [showAIGuide, setShowAIGuide] = useState(false);
  const searchFormRef = useRef<FlightSearchFormHandle>(null);

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
    <>
      {/* ═══════════════════════════════════════════════════════════
          UNIFIED HERO — continuous surface with horizontal light sweep
          ═══════════════════════════════════════════════════════════ */}
      <section className="relative overflow-visible bg-background">
        {/* Full-width left-to-right atmospheric booking zone — covers entire hero */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          {/* Single smooth top-to-bottom gradient — no overlapping radials */}
          <div
            className="absolute top-0 left-0 w-full h-full"
            style={{ background: "linear-gradient(180deg, hsl(222 40% 8% / 0.6) 0%, hsl(220 42% 12% / 0.35) 30%, hsl(218 38% 14% / 0.15) 60%, transparent 100%)" }}
          />
          {/* Subtle left-side accent for depth */}
          <div
            className="absolute top-0 left-0 w-full h-full"
            style={{ background: "linear-gradient(135deg, hsl(215 50% 50% / 0.06) 0%, transparent 50%)" }}
          />
        </div>

        <div className="relative z-10 pt-24 sm:pt-28 pb-10 sm:pb-14 px-4 sm:px-6 lg:px-8 overflow-visible">
          <div className="mx-auto max-w-[1100px] overflow-visible">

            {/* ── Category pills ── */}
            <div className="flex items-center gap-1.5 mb-10 overflow-x-auto pb-1 scrollbar-none justify-start" style={{ WebkitOverflowScrolling: "touch" }}>
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
                  </button>
                );
              })}
            </div>

            {/* ── Headline ── */}
            <div className="mb-12 text-left animate-fade-in">
              <h1 className="text-3xl sm:text-4xl lg:text-[2.85rem] font-bold leading-[1.12] tracking-tight text-foreground">
                {t("hero.headline_1")}{" "}
                <span className="text-primary">{t("hero.headline_2")}</span>
              </h1>
              <p className="mt-4 text-[15px] sm:text-base text-muted-foreground leading-relaxed max-w-lg">
                {t("hero.tagline")}
              </p>
            </div>

            {/* ── Search bar — directly in the flow ── */}
            <div ref={searchRef} className="animate-fade-in overflow-visible">
              <FlightSearchForm
                ref={searchFormRef}
                aiSearchParams={aiSearchParams}
                onParamsConsumed={handleParamsConsumed}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SECTION G: SMART TRAVEL TOOLS — clearly separate
          ═══════════════════════════════════════════════════════════ */}
      <section className="relative z-0 px-4 sm:px-6 lg:px-8 mt-20 sm:mt-24 animate-fade-in">
        <div className="mx-auto max-w-[1100px]">
          <h3 className="text-xs font-semibold text-muted-foreground/60 mb-5 uppercase tracking-[0.15em] text-center sm:text-left">
            {t("hero_section.smart_tools")}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {SMART_TOOLS.map((tool) => {
              const Icon = tool.icon;
              const isAI = tool.titleKey === "hero_section.ai_travel_guide";
              return (
                <button
                  key={tool.titleKey}
                  onClick={() => {
                    if (isAI) setShowAIGuide(!showAIGuide);
                    else if (tool.titleKey === "hero_section.flexible_dates_title") {
                      searchRef?.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                      setTimeout(() => searchFormRef.current?.openFlexDates(), 400);
                    }
                    else if (tool.href) navigate(tool.href);
                  }}
                  className="flex items-center gap-4 p-5 rounded-2xl border border-border/25 bg-card/30 hover:bg-card/50 hover:border-border/40 transition-all text-left group cursor-pointer"
                >
                  <div className="w-11 h-11 rounded-xl bg-secondary/50 flex items-center justify-center shrink-0 group-hover:bg-secondary/80 transition-colors">
                    <Icon className="w-5 h-5 text-muted-foreground/70 group-hover:text-primary transition-colors" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-semibold text-foreground block">{t(tool.titleKey)}</span>
                    <span className="text-[12px] text-muted-foreground/60 leading-snug">{t(tool.descKey)}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* AI Guide expandable */}
          {showAIGuide && (
            <div className="mt-4 rounded-2xl border border-border/30 bg-card/40 p-5 animate-fade-in">
              <TravelAssistant onDestinationSelect={handleDestinationSelect} initialPrompt={travelPrompt} />
            </div>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SECTION H: POPULAR DESTINATIONS — own section
          ═══════════════════════════════════════════════════════════ */}
      <section className="relative z-0 px-4 sm:px-6 lg:px-8 mt-14 sm:mt-18 pb-10 animate-fade-in">
        <div className="mx-auto max-w-[1100px]">
          <h3 className="text-xs font-semibold text-muted-foreground/60 mb-5 uppercase tracking-[0.15em] text-center sm:text-left">
            {t("hero_section.popular_destinations")}
          </h3>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
            {POPULAR_DESTINATIONS.map((dest) => (
              <button
                key={dest.city}
                onClick={() => {
                  searchRef?.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                  setTimeout(() => {
                    handleDestinationSelect({ destinationName: dest.city, destinationCode: dest.code });
                  }, 300);
                }}
                className="shrink-0 flex items-center gap-3.5 px-5 py-3.5 rounded-2xl bg-card/30 border border-border/20 hover:border-primary/40 hover:bg-card/50 transition-all cursor-pointer group"
              >
                <span className="text-xl">{dest.emoji}</span>
                <div className="text-left">
                  <span className="text-sm font-medium text-foreground block leading-tight group-hover:text-primary transition-colors">{dest.city}</span>
                  <span className="text-xs text-muted-foreground/60 font-medium">{t("hero_section.from_price", { price: dest.price })}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>
    </>
  );
});

Hero.displayName = "Hero";

export default Hero;
