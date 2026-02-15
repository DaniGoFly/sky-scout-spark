import { useRef, useCallback } from "react";
import Header from "@/components/Header";
import Hero, { type HeroHandle } from "@/components/Hero";
import PopularDestinations from "@/components/PopularDestinations";
import Footer from "@/components/Footer";
import type { AISearchParams } from "@/components/FlightSearchHero";

const Index = () => {
  const heroRef = useRef<HeroHandle>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const handleDestinationClick = useCallback((dest: { city: string; code: string }) => {
    // Scroll to search
    searchRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    // Autofill destination
    heroRef.current?.setDestination({
      destinationCode: dest.code,
      destinationName: `${dest.city} (${dest.code})`,
    });
    // Prefill AI Travel Guide
    heroRef.current?.setTravelPrompt(
      `Plan me a trip to ${dest.city}. Suggest best dates, cheapest airports near me, and a 3-day itinerary.`
    );
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <Hero ref={heroRef} searchRef={searchRef} />
      <PopularDestinations onDestinationClick={handleDestinationClick} />
      <Footer />
    </div>
  );
};

export default Index;
