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
    <section className="hero-section relative min-h-screen flex flex-col overflow-hidden">
      {/* Radial highlight */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(900px circle at 50% 0%, rgba(47,122,248,0.18), transparent 60%)",
        }}
      />

      <div className="relative z-10 flex-1 flex flex-col justify-center pt-28 pb-20 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-14 animate-fade-in">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-5 leading-tight tracking-tight text-white">
              {t("hero.title_search")}{" "}
              <span className="text-[hsl(200,100%,72%)]">{t("hero.title_flights")}</span>
            </h1>
            <p className="text-lg md:text-xl text-white/60 max-w-xl mx-auto leading-relaxed">
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
