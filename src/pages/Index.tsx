import { useState } from "react";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import PopularDestinations from "@/components/PopularDestinations";
import FlightResults from "@/components/FlightResults";
import Footer from "@/components/Footer";

const Index = () => {
  const [showResults, setShowResults] = useState(false);

  const handleSearch = () => {
    setShowResults(true);
    // Scroll to results
    setTimeout(() => {
      document.getElementById("results")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Hero onSearch={handleSearch} />
      
      {showResults && (
        <div id="results">
          <FlightResults />
        </div>
      )}
      
      <PopularDestinations />
      <Footer />
    </div>
  );
};

export default Index;
