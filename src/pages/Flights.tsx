import Header from "@/components/Header";
import Hero from "@/components/Hero";
import WhyUseSection from "@/components/WhyUseSection";
import PopularDestinations from "@/components/PopularDestinations";
import Footer from "@/components/Footer";

const Flights = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Hero />
      <WhyUseSection />
      <PopularDestinations />
      <Footer />
    </div>
  );
};

export default Flights;
