/**
 * MobileHero — Hybrid Skyscanner/Kiwi-inspired mobile homepage
 * Structure: Headline → Category pills → Search form → Discovery
 * Only rendered on mobile (<768px). Desktop hero renders separately.
 */
import { memo, forwardRef, useImperativeHandle, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Plane, Building2, Car, Package, Compass, Sparkles, CalendarSearch, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import FlightSearchForm, { type FlightSearchFormHandle } from "../FlightSearchForm";
import TravelAssistant from "../TravelAssistant";
import type { AISearchParams } from "../FlightSearchHero";
import type { HeroHandle } from "../Hero";
import heroBgTropical from "@/assets/hero-bg-tropical-minimal.png";

interface MobileHeroProps {
  searchRef?: React.RefObject<HTMLDivElement | null>;
}

/** Service category pills */
const SERVICE_PILLS = [
  { id: "flights", labelKey: "nav.flights", icon: Plane, active: true },
  { id: "hotels", labelKey: "nav.hotels", icon: Building2, active: false, comingSoon: true },
  { id: "cars", labelKey: "hero.car_rental", icon: Car, active: false, comingSoon: true },
  { id: "packages", labelKey: "hero.packages", icon: Package, active: false, comingSoon: true },
] as const;

/** Quick destinations */
const QUICK_DESTINATIONS = [
  { city: "Bali", code: "DPS", emoji: "🌴", price: "€420" },
  { city: "Mallorca", code: "PMI", emoji: "☀️", price: "€89" },
  { city: "New York", code: "JFK", emoji: "🗽", price: "€390" },
  { city: "Dubai", code: "DXB", emoji: "🏙️", price: "€310" },
  { city: "Tokyo", code: "TYO", emoji: "🗼", price: "€480" },
  { city: "London", code: "LHR", emoji: "🇬🇧", price: "€120" },
];

/** Discovery tools */
const TOOLS = [
  { icon: Compass, titleKey: "nav.explore", descKey: "hero_section.explore_map_desc", action: "explore" as const },
  { icon: CalendarSearch, titleKey: "hero_section.flexible_dates_title", descKey: "hero_section.flexible_dates_desc", action: "flex" as const },
  { icon: Sparkles, titleKey: "hero_section.ai_travel_guide", descKey: "hero_section.ai_travel_desc", action: "ai" as const },
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

  const handleToolClick = (action: "explore" | "flex" | "ai") => {
    if (action === "explore") navigate("/explore");
    else if (action === "ai") setShowAIGuide(!showAIGuide);
    else if (action === "flex") {
      searchRef?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => searchFormRef.current?.openFlexDates(), 400);
    }
  };

  return (
    <div className="md:hidden">
      {/* ═══ HERO ZONE ═══ */}
      <section className="relative overflow-visible bg-background">
        {/* Subtle tropical background texture */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-b-3xl" aria-hidden="true"
          style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06), 0 8px 32px rgba(0,0,0,0.3)" }}>

          <img
            src={heroBgTropical}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              opacity: 0.45,
              filter: "saturate(0.35) brightness(0.75)",
            }}
            loading="eager"
            decoding="async"
          />
          {/* Fade to background at bottom */}
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(to bottom, transparent 15%, hsl(var(--background)) 55%)",
            }}
          />
        </div>

        {/* Atmospheric gradient sweep */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, hsl(217 60% 50% / 0.08) 0%, hsl(217 55% 45% / 0.04) 40%, transparent 80%)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 140% 60% at 20% 30%, hsl(217 60% 60% / 0.06), transparent 70%)",
            }}
          />
        </div>

        <div className="relative z-10 pt-20 pb-2 px-4">
          {/* ── Headline ── */}
          <div className="mb-5">
            <h1 className="text-[22px] font-bold text-foreground leading-[1.25] tracking-tight">
              {t("hero.mobile_headline", "Find better flight deals.")}
            </h1>
            <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">
              {t("hero.mobile_subtext", "Compare airlines & agencies. Book via verified partners.")}
            </p>
          </div>

          {/* ── Category pills ── */}
          <div className="flex items-stretch gap-2 overflow-x-auto scrollbar-hide pb-4 -mx-1 px-1">
            {SERVICE_PILLS.map((pill) => {
              const Icon = pill.icon;
              return (
                <button
                  key={pill.id}
                  onClick={() => handlePillClick(pill)}
                  className={`
                    shrink-0 flex flex-col items-center justify-center gap-1.5 rounded-2xl transition-all min-w-[72px] py-2.5 px-3
                    ${pill.active
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                      : "bg-card/50 border border-border/20 text-muted-foreground active:bg-card/80"
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px] font-semibold leading-none">{t(pill.labelKey)}</span>
                </button>
              );
            })}
          </div>

          {/* ── Search form ── */}
          <div ref={searchRef} className="overflow-visible">
            <FlightSearchForm
              ref={searchFormRef}
              aiSearchParams={aiSearchParams}
              onParamsConsumed={handleParamsConsumed}
            />
          </div>
        </div>
      </section>

      {/* ═══ BELOW HERO — Discovery ═══ */}

      {/* AI Guide (expandable) */}
      {showAIGuide && (
        <section className="px-4 pt-4 pb-2 bg-background">
          <div className="rounded-2xl border border-border/30 bg-card/40 p-4 animate-fade-in">
            <TravelAssistant
              onDestinationSelect={(params) => setAiSearchParams(params)}
            />
          </div>
        </section>
      )}

      {/* Quick destinations */}
      <section className="px-4 pt-5 pb-2 bg-background">
        <h3 className="text-[11px] font-semibold text-muted-foreground/50 uppercase tracking-[0.12em] mb-2.5">
          {t("hero_section.popular_destinations")}
        </h3>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1 snap-x snap-mandatory">
          {QUICK_DESTINATIONS.map((dest) => (
            <button
              key={dest.city}
              onClick={() => handleDestinationSelect(dest)}
              className="shrink-0 snap-start flex items-center gap-2.5 px-3.5 py-3 rounded-2xl bg-card/30 border border-border/15 active:scale-[0.97] active:bg-card/50 transition-all min-w-[140px]"
            >
              <span className="text-lg leading-none">{dest.emoji}</span>
              <div className="text-left">
                <span className="text-[12px] font-semibold text-foreground block leading-tight">{dest.city}</span>
                <span className="text-[10px] text-muted-foreground/50">{t("hero_section.from_price", { price: dest.price })}</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Discovery tools */}
      <section className="px-4 pt-5 pb-24 bg-background">
        <h3 className="text-[11px] font-semibold text-muted-foreground/50 uppercase tracking-[0.12em] mb-2.5">
          {t("hero_section.smart_tools")}
        </h3>
        <div className="space-y-2">
          {TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.titleKey}
                onClick={() => handleToolClick(tool.action)}
                className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl border border-border/15 bg-card/25 active:bg-card/50 transition-all text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-secondary/50 flex items-center justify-center shrink-0">
                  <Icon className="w-[18px] h-[18px] text-muted-foreground/70" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[13px] font-semibold text-foreground block leading-tight">{t(tool.titleKey)}</span>
                  <span className="text-[11px] text-muted-foreground/50 leading-snug">{t(tool.descKey)}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/25 shrink-0" />
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
