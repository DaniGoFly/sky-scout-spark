import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FlightResults from "@/components/FlightResults";

const Results = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-20">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-foreground mb-6">Flight Results</h1>
        </div>
        <FlightResults />
      </main>
      <Footer />
    </div>
  );
};

export default Results;
