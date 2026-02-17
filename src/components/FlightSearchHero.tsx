import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import FlightSearchForm from "./FlightSearchForm";
import FlightPathsBackground from "./FlightPathsBackground";
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
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />
      <div className="absolute top-20 left-[10%] w-72 h-72 bg-primary/10 rounded-full blur-[140px]" />
      <div className="absolute bottom-20 right-[10%] w-64 h-64 bg-accent/8 rounded-full blur-[120px]" />
      <FlightPathsBackground />

      <div className="relative z-10 flex-1 flex flex-col justify-center pt-28 pb-20 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-16 animate-fade-in">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight tracking-tight">
              <span className="text-foreground">{t("hero.title_search")}</span>
              <span className="gradient-text">{t("hero.title_flights")}</span>
            </h1>
            <p className="text-lg md:text-xl text-foreground/60 max-w-xl mx-auto leading-relaxed">
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
