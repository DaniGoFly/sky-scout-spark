import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import FlightSearchForm from "./FlightSearchForm";
import FlightPathsBackground from "./FlightPathsBackground";

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
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/10" />
      <div className="absolute top-20 left-[10%] w-96 h-96 bg-primary/20 rounded-full blur-[120px] animate-float" />
      <div className="absolute bottom-20 right-[10%] w-80 h-80 bg-accent/15 rounded-full blur-[100px] animate-float-delayed" />
      <FlightPathsBackground />

      <div className="relative z-10 flex-1 flex flex-col justify-center pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-12 animate-fade-in">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight tracking-tight">
              <span className="text-foreground">{t("hero.title_search")}</span>
              <span className="gradient-text">{t("hero.title_flights")}</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed">
              {t("hero.subtitle")}
            </p>
          </div>

          <div className="glow-primary rounded-2xl">
            <FlightSearchForm 
              aiSearchParams={aiSearchParams}
              onParamsConsumed={handleParamsConsumed}
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default FlightSearchHero;
