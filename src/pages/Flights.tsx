import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FlightSearchHero from "@/components/FlightSearchHero";
import HowItWorks from "@/components/HowItWorks";
import PopularDestinations from "@/components/PopularDestinations";

const Flights = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1">
        <FlightSearchHero />
        <HowItWorks />
        <PopularDestinations />
      </main>
      <Footer />
    </div>
  );
};

export default Flights;
