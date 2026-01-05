import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FlightSearchHero from "@/components/FlightSearchHero";
import WhyUseSection from "@/components/WhyUseSection";
import PopularDestinations from "@/components/PopularDestinations";

const Flights = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="pt-20 flex-1">
        <FlightSearchHero />
        <WhyUseSection />
        <PopularDestinations />
      </main>
      <Footer />
    </div>
  );
};

export default Flights;
