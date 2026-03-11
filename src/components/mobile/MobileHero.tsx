/**
 * MobileHero — App-like mobile homepage hero
 * Structure: Logo → Headline → Category icons → Search form → Quick destinations → Smart tools
 * Uses GoFlyFinder's dark fade gradient, NOT solid blocks.
 * Only rendered on mobile (<768px). Desktop hero renders separately.
 */
import { memo, forwardRef, useImperativeHandle, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Plane, Sparkles, MapPin, CalendarSearch, ChevronRight, Building2, Compass, Car, Package } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import FlightSearchForm, { type FlightSearchFormHandle } from "../FlightSearchForm";
import TravelAssistant from "../TravelAssistant";
import type { AISearchParams } from "../FlightSearchHero";
import type { HeroHandle } from "../Hero";

interface MobileHeroProps {
  searchRef?: React.RefObject<HTMLDivElement | null>;
}

const QUICK_DESTINATIONS = [
  { city: "Bali", code: "DPS", emoji: "🌴", price: "€420" },
  { city: "Mallorca", code: "PMI", emoji: "☀️", price: "€89" },
  { city: "New York", code: "JFK", emoji: "🗽", price: "€390" },
  { city: "Dubai", code: "DXB", emoji: "🏙️", price: "€310" },
  { city: "Tokyo", code: "TYO", emoji: "🗼", price: "€480" },
  { city: "London", code: "LHR", emoji: "🇬🇧", price: "€120" },
];

/** Service category pills — matches desktop Hero behavior.
 *  Flights = active, others trigger "Coming soon" toast. */
const SERVICE_PILLS = [
  { id: "flights", labelKey: "nav.flights", icon: Plane, active: true },
  { id: "hotels", labelKey: "nav.hotels", icon: Building2, active: false, comingSoon: true },
  { id: "cars", labelKey: "hero.car_rental", icon: Car, active: false, comingSoon: true },
  { id: "packages", labelKey: "hero.packages", icon: Package, active: false, comingSoon: true },
] as const;

const TOOLS = [
  { icon: Sparkles, titleKey: "hero_section.ai_travel_guide", descKey: "hero_section.ai_travel_desc", action: "ai" as const },
  { icon: MapPin, titleKey: "hero_section.explore_map", descKey: "hero_section.explore_map_desc", action: "explore" as const },
  { icon: CalendarSearch, titleKey: "hero_section.flexible_dates_title", descKey: "hero_section.flexible_dates_desc", action: "flex" as const },
];

const MobileHero = forwardRef<HeroHandle, MobileHeroProps>(({ searchRef }, ref) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [aiSearchParams, setAiSearchParams] = useState<AISearchParams | null>(null);
  const [showAIGuide, setShowAIGuide] = useState(false);
  const searchFormRef = useRef<FlightSearchFormHandle>(null);

  useImperativeHandle(ref, () => ({
    setDestination: (params: AISearchParams) => setAiSearchParams(params),
    setTravelPrompt: () => {},
  }));

  const handleParamsConsumed = () => setAiSearchParams(null);

  const handleDestinationSelect = (dest: { city: string; code: string }) => {
    setAiSearchParams({
      destinationCode: dest.code,
      destinationName: `${dest.city} (${dest.code})`,
    });
    searchRef?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handlePillClick = (pill: typeof SERVICE_PILLS[number]) => {
    if (pill.active) return;
    if ("comingSoon" in pill && pill.comingSoon) {
      toast.info(t("hero.coming_soon"), { duration: 3000 });
    }
  };

  const handleToolClick = (action: "ai" | "explore" | "flex") => {
    if (action === "ai") setShowAIGuide(!showAIGuide);
    else if (action === "explore") navigate("/explore");
    else if (action === "flex") {
      searchRef?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => searchFormRef.current?.openFlexDates(), 400);
    }
  };

  return (
    <div className="md:hidden">
      {/* ═══════════════════════════════════════════════
          HERO ZONE — with GoFlyFinder atmospheric gradient
          ═══════════════════════════════════════════════ */}
      <section className="relative overflow-visible bg-background">
        {/* Atmospheric light sweep — matching desktop hero */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div
            className="absolute top-0 left-0 w-full h-full"
            style={{ background: "linear-gradient(180deg, hsl(215 50% 80% / 0.09) 0%, hsl(215 55% 82% / 0.06) 30%, hsl(220 50% 75% / 0.03) 60%, transparent 100%)" }}
          />
          <div
            className="absolute top-0 left-0 w-full h-full"
            style={{ background: "radial-gradient(ellipse 120% 80% at 30% 40%, hsl(215 50% 88% / 0.05), transparent 70%)" }}
          />
        </div>

        <div className="relative z-10 pt-20 pb-6 px-5">
          {/* ── 1. Brand + Logo ── */}
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Plane className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-foreground tracking-tight">
              GoFlyFinder
            </span>
          </div>

          {/* ── 2. Headline ── */}
          <h1 className="text-[22px] font-bold text-foreground leading-[1.2] tracking-tight mb-2">
            {t("hero.headline_1")}{" "}
            <span className="text-primary">{t("hero.headline_2")}</span>
          </h1>
          <p className="text-[13px] text-muted-foreground leading-relaxed mb-6 max-w-[320px]">
            {t("hero.tagline")}
          </p>

          {/* ── 3. Service category pills — horizontal scroll ── */}
          <div className="flex items-center gap-2 mb-6 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
            {SERVICE_PILLS.map((pill) => {
              const Icon = pill.icon;
              return (
                <button
                  key={pill.id}
                  onClick={() => handlePillClick(pill)}
                  className={`
                    flex items-center gap-2 px-4 py-2.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-all shrink-0
                    ${pill.active
                      ? "bg-primary/15 text-primary border border-primary/25"
                      : "text-muted-foreground/50 active:text-muted-foreground"
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  {t(pill.labelKey)}
                </button>
              );
            })}
          </div>

          {/* ── 4. Search form ── */}
          <div ref={searchRef} className="overflow-visible">
            <FlightSearchForm
              ref={searchFormRef}
              aiSearchParams={aiSearchParams}
              onParamsConsumed={handleParamsConsumed}
            />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          BELOW HERO — Discovery content
          ═══════════════════════════════════════════════ */}

      {/* ── Quick destinations — horizontal snap scroll ── */}
      <section className="px-4 pt-8 pb-2 bg-background">
        <h3 className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-[0.12em] mb-3 px-1">
          {t("hero_section.popular_destinations")}
        </h3>
        <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1 snap-x snap-mandatory">
          {QUICK_DESTINATIONS.map((dest) => (
            <button
              key={dest.city}
              onClick={() => handleDestinationSelect(dest)}
              className="shrink-0 snap-start flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-card/30 border border-border/20 active:scale-[0.97] active:bg-card/50 transition-all min-w-[148px]"
            >
              <span className="text-xl">{dest.emoji}</span>
              <div className="text-left">
                <span className="text-[13px] font-semibold text-foreground block leading-tight">{dest.city}</span>
                <span className="text-[11px] text-muted-foreground/60">{t("hero_section.from_price", { price: dest.price })}</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* ── Smart tools — card-based ── */}
      <section className="px-4 pt-8 pb-8 bg-background">
        <h3 className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-[0.12em] mb-3 px-1">
          {t("hero_section.smart_tools")}
        </h3>
        <div className="space-y-2.5">
          {TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.titleKey}
                onClick={() => handleToolClick(tool.action)}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border border-border/20 bg-card/30 active:bg-card/60 transition-all text-left min-h-[64px]"
              >
                <div className="w-11 h-11 rounded-xl bg-secondary/50 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-muted-foreground/70" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[14px] font-semibold text-foreground block">{t(tool.titleKey)}</span>
                  <span className="text-[12px] text-muted-foreground/60 leading-snug">{t(tool.descKey)}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/30 shrink-0" />
              </button>
            );
          })}
        </div>

        {/* AI Guide expandable */}
        {showAIGuide && (
          <div className="mt-3 rounded-2xl border border-border/30 bg-card/40 p-4 animate-fade-in">
            <TravelAssistant
              onDestinationSelect={(params) => setAiSearchParams(params)}
            />
          </div>
        )}
      </section>
    </div>
  );
});

MobileHero.displayName = "MobileHero";
export default MobileHero;
