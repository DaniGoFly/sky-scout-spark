/**
 * MobileHero — App-like mobile homepage hero
 * Inspired by major travel platforms: category icons, clean search, quick destinations
 * Only rendered on mobile (<768px). Desktop hero renders separately.
 */
import { memo, forwardRef, useImperativeHandle, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Plane, Search, MapPin, Sparkles, CalendarSearch, ChevronRight, Hotel, Compass } from "lucide-react";
import { useTranslation } from "react-i18next";
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

const CATEGORY_ICONS = [
  { icon: Plane, labelKey: "nav.flights", path: null, active: true },
  { icon: Hotel, labelKey: "nav.hotels", path: "/hotels", active: false },
  { icon: Compass, labelKey: "nav.explore", path: "/explore", active: false },
];

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

  const handleToolClick = (action: "ai" | "explore" | "flex") => {
    if (action === "ai") setShowAIGuide(!showAIGuide);
    else if (action === "explore") navigate("/explore");
    else if (action === "flex") {
      searchRef?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => searchFormRef.current?.openFlexDates(), 400);
    }
  };

  const handleCategoryClick = (path: string | null) => {
    if (path) navigate(path);
  };

  return (
    <div className="md:hidden">
      {/* ── Logo area + greeting ── */}
      <section className="pt-20 px-5 pb-4 bg-background relative">
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div
            className="absolute top-0 left-0 w-full h-full"
            style={{ background: "linear-gradient(180deg, hsl(215 50% 80% / 0.07) 0%, transparent 60%)" }}
          />
        </div>

        <div className="relative z-10">
          <h1 className="text-[22px] font-bold text-foreground leading-snug">
            {t("hero.headline_1")}{" "}
            <span className="text-primary">{t("hero.headline_2")}</span>
          </h1>
          <p className="mt-1.5 text-[13px] text-muted-foreground leading-relaxed">
            {t("hero.tagline")}
          </p>
        </div>
      </section>

      {/* ── Category icons row (Skyscanner-inspired) ── */}
      <section className="px-5 pb-4 bg-background">
        <div className="flex items-center gap-6">
          {CATEGORY_ICONS.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.labelKey}
                onClick={() => handleCategoryClick(cat.path)}
                className="flex flex-col items-center gap-1.5 min-w-[60px]"
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                  cat.active
                    ? "bg-primary/15 ring-2 ring-primary/30"
                    : "bg-secondary/60 active:bg-secondary"
                }`}>
                  <Icon className={`w-6 h-6 ${cat.active ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <span className={`text-[11px] font-semibold ${cat.active ? "text-primary" : "text-muted-foreground"}`}>
                  {t(cat.labelKey)}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Search form — full mobile layout ── */}
      <section ref={searchRef} className="px-4 pt-2 pb-4 bg-background relative z-10">
        <FlightSearchForm
          ref={searchFormRef}
          aiSearchParams={aiSearchParams}
          onParamsConsumed={handleParamsConsumed}
        />
      </section>

      {/* ── Quick destinations — horizontal scroll ── */}
      <section className="px-4 pt-4 pb-2 bg-background">
        <h3 className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-[0.12em] mb-3">
          {t("hero_section.popular_destinations")}
        </h3>
        <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1 snap-x snap-mandatory">
          {QUICK_DESTINATIONS.map((dest) => (
            <button
              key={dest.city}
              onClick={() => handleDestinationSelect(dest)}
              className="shrink-0 snap-start flex items-center gap-2.5 px-4 py-3.5 rounded-xl bg-card/40 border border-border/20 active:scale-[0.97] transition-all min-w-[140px]"
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
      <section className="px-4 pt-6 pb-6 bg-background">
        <h3 className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-[0.12em] mb-3">
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
