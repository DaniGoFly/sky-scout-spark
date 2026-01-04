import Header from "@/components/Header";
import Hero from "@/components/Hero";
import AviasalesSearch from "@/components/AviasalesSearch";
import AviasalesCalendar from "@/components/AviasalesCalendar";
import AviasalesMap from "@/components/AviasalesMap";
import WhyUseSection from "@/components/WhyUseSection";
import HotelSection from "@/components/HotelSection";
import ThingsToDoSection from "@/components/ThingsToDoSection";
import PopularDestinations from "@/components/PopularDestinations";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Hero />
      <AviasalesSearch />
      <AviasalesCalendar />
      <AviasalesMap />
      <WhyUseSection />
      <HotelSection />
      <ThingsToDoSection />
      <PopularDestinations />
      <Footer />
    </div>
  );
};

export default Index;
