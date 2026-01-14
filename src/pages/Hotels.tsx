import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HotelSearchHero from "@/components/HotelSearchHero";
import HowItWorksHotels from "@/components/HowItWorksHotels";
import PopularHotelDestinations from "@/components/PopularHotelDestinations";

const Hotels = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1">
        <HotelSearchHero />
        <HowItWorksHotels />
        <PopularHotelDestinations />
      </main>
      <Footer />
    </div>
  );
};

export default Hotels;
