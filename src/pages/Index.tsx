import Header from "@/components/Header";
import Hero from "@/components/Hero";
import WhyUseSection from "@/components/WhyUseSection";
import PopularDestinations from "@/components/PopularDestinations";
import HotelSection from "@/components/HotelSection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Hero />
      <WhyUseSection />
      <PopularDestinations />
      <HotelSection />
      <Footer />
    </div>
  );
};

export default Index;
