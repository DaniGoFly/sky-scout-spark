import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FlightResults from "@/components/FlightResults";

const Results = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-20">
        <FlightResults />
      </main>
      <Footer />
    </div>
  );
};

export default Results;
