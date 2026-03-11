/**
 * MobileHero — Skyscanner-inspired mobile homepage
 * Structure: Brand → Headline → Service pills → Trip type → Search card → Options → CTA → Feature cards → Destinations
 * Uses GoFlyFinder's dark atmospheric gradient, NOT solid blocks.
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

/** Service category pills — Flights active, others show "Coming soon" toast */
const SERVICE_PILLS = [
  { id: "flights", labelKey: "nav.flights", icon: Plane, active: true },
  { id: "hotels", labelKey: "nav.hotels", icon: Building2, active: false, comingSoon: true },
  { id: "cars", labelKey: "hero.car_rental", icon: Car, active: false, comingSoon: true },
  { id: "packages", labelKey: "hero.packages", icon: Package, active: false, comingSoon: true },
] as const;

/** Feature cards below search — horizontal scroll */
const FEATURE_CARDS = [
  { icon: Building2, labelKey: "nav.hotels", path: "/hotels" },
  { icon: Compass, labelKey: "nav.explore", path: "/explore" },
  { icon: Sparkles, labelKey: "hero_section.ai_travel_guide", action: "ai" as const },
];

const TOOLS = [
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

  const handleFeatureClick = (card: typeof FEATURE_CARDS[number]) => {
    if ("action" in card && card.action === "ai") {
      setShowAIGuide(!showAIGuide);
    } else if ("path" in card && card.path) {
      navigate(card.path);
    }
  };

  const handleToolClick = (action: "explore" | "flex") => {
    if (action === "explore") navigate("/explore");
    else if (action === "flex") {
      searchRef?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => searchFormRef.current?.openFlexDates(), 400);
    }
  };

  return (
    <div className="md:hidden">
      {/* ═══════════════════════════════════════════════
          HERO ZONE — GoFlyFinder atmospheric dark gradient
          ═══════════════════════════════════════════════ */}
      <section className="relative overflow-visible bg-background">
        {/* Atmospheric light sweep */}
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

        <div className="relative z-10 pt-20 pb-2 px-5">
          {/* ── 1. Brand Logo ── */}
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Plane className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-foreground tracking-tight">
              GoFlyFinder
            </span>
          </div>

          {/* ── 2. Service category pills — horizontal scroll (Skyscanner-style) ── */}
          <div className="flex items-stretch gap-2 overflow-x-auto scrollbar-hide pb-5 -mx-1 px-1">
            {SERVICE_PILLS.map((pill) => {
              const Icon = pill.icon;
              return (
                <button
                  key={pill.id}
                  onClick={() => handlePillClick(pill)}
                  className={`
                    shrink-0 flex flex-col items-center justify-center gap-1.5 rounded-2xl transition-all min-w-[76px] py-3 px-4
                    ${pill.active
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                      : "bg-card/50 border border-border/20 text-muted-foreground active:bg-card/80"
                    }
                  `}
                >
                  <Icon className="w-6 h-6" />
                  <span className="text-[11px] font-semibold leading-none">{t(pill.labelKey)}</span>
                </button>
              );
            })}
          </div>

          {/* ── 3. Search form with card ── */}
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
          BELOW HERO — Feature cards + Discovery
          ═══════════════════════════════════════════════ */}

      {/* ── Feature cards — Skyscanner-style horizontal scroll ── */}
      <section className="px-4 pt-6 pb-2 bg-background">
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1 snap-x snap-mandatory">
          {FEATURE_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.labelKey}
                onClick={() => handleFeatureClick(card)}
                className="shrink-0 snap-start flex flex-col items-start gap-3 p-4 rounded-2xl bg-card/50 border border-border/20 active:bg-card/70 transition-all min-w-[140px] min-h-[100px]"
              >
                <div className="w-10 h-10 rounded-xl bg-secondary/60 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-muted-foreground" />
                </div>
                <span className="text-[13px] font-semibold text-foreground leading-tight">{t(card.labelKey)}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* AI Guide expandable */}
      {showAIGuide && (
        <section className="px-4 pb-4 bg-background">
          <div className="rounded-2xl border border-border/30 bg-card/40 p-4 animate-fade-in">
            <TravelAssistant
              onDestinationSelect={(params) => setAiSearchParams(params)}
            />
          </div>
        </section>
      )}

      {/* ── Quick destinations ── */}
      <section className="px-4 pt-4 pb-2 bg-background">
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

      {/* ── Smart tools ── */}
      <section className="px-4 pt-6 pb-8 bg-background">
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
      </section>
    </div>
  );
});

MobileHero.displayName = "MobileHero";
export default MobileHero;
