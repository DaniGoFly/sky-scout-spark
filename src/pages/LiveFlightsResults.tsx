import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LiveFlightResults from "@/components/LiveFlightResults";

const LiveFlightsResults = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1">
        <LiveFlightResults />
      </main>
      <Footer />
    </div>
  );
};

export default LiveFlightsResults;
