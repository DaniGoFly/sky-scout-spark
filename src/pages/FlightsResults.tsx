import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FlightResultsEmbed from "@/components/FlightResultsEmbed";

const FlightsResults = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="pt-20 flex-1">
        <FlightResultsEmbed />
      </main>
      <Footer />
    </div>
  );
};

export default FlightsResults;
