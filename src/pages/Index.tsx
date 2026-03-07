import { useRef, useCallback } from "react";
import Header from "@/components/Header";
import Hero, { type HeroHandle } from "@/components/Hero";
import PopularDestinations from "@/components/PopularDestinations";
import WhyUseSection from "@/components/WhyUseSection";

import Footer from "@/components/Footer";
import type { AISearchParams } from "@/components/FlightSearchHero";

const Index = () => {
  const heroRef = useRef<HeroHandle>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const handleDestinationClick = useCallback((dest: { city: string; code: string }) => {
    searchRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    heroRef.current?.setDestination({
      destinationCode: dest.code,
      destinationName: `${dest.city} (${dest.code})`,
    });
    heroRef.current?.setTravelPrompt(
      `Plan me a trip to ${dest.city}. Suggest best dates, cheapest airports near me, and a 3-day itinerary.`
    );
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <Hero ref={heroRef} searchRef={searchRef} />
      <PopularDestinations onDestinationClick={handleDestinationClick} />
      <WhyUseSection />
      <Footer />
    </div>
  );
};

export default Index;
