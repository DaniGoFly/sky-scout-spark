import Header from "@/components/Header";
import Hero from "@/components/Hero";
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
      <WhyUseSection />
      <HotelSection />
      <ThingsToDoSection />
      <PopularDestinations />
      <Footer />
    </div>
  );
};

export default Index;
