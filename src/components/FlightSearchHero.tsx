import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import FlightSearchForm from "./FlightSearchForm";
import TrustSignals from "./TrustSignals";

export interface AISearchParams {
  destinationCode: string;
  destinationName: string;
}

const FlightSearchHero = () => {
  const [aiSearchParams, setAiSearchParams] = useState<AISearchParams | null>(null);
  const { t } = useTranslation();

  const handleParamsConsumed = useCallback(() => {
    setAiSearchParams(null);
  }, []);

  return (
    <section className="relative min-h-screen flex flex-col overflow-hidden">
      {/* Calm navy gradient + subtle grid texture */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(1200px circle at 50% 10%, rgba(47,122,248,0.10), transparent 60%), linear-gradient(180deg, hsl(222 47% 6%), hsl(222 40% 8%))",
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          opacity: 0.4,
        }}
      />

      <div className="relative z-10 flex-1 flex flex-col justify-center pt-28 pb-20 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-14 animate-fade-in">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-5 leading-tight tracking-tight text-foreground">
              {t("hero.title_search")}{" "}
              <span className="gradient-text">{t("hero.title_flights")}</span>
            </h1>
            <p className="text-lg md:text-xl text-foreground/65 max-w-xl mx-auto leading-relaxed">
              {t("hero.subtitle")}
            </p>
          </div>

          <FlightSearchForm
            aiSearchParams={aiSearchParams}
            onParamsConsumed={handleParamsConsumed}
          />

          <TrustSignals />
        </div>
      </div>
    </section>
  );
};

export default FlightSearchHero;
