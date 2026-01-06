import { Plane, Hotel, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface ComingSoonProps {
  type?: "feature" | "booking" | "auth";
}

const ComingSoon = ({ type = "feature" }: ComingSoonProps) => {
  const messages = {
    feature: {
      title: "Coming Soon",
      description: "This section is coming later. For now, explore Flights and Hotels.",
    },
    booking: {
      title: "Demo Mode",
      description: "Live booking links launch soon. This is a demo using sample data.",
    },
    auth: {
      title: "No Account Required",
      description: "Accounts are not required. You can search flights and hotels without signing up.",
    },
  };

  const { title, description } = messages[type];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 flex items-center justify-center px-4 pt-24 pb-16">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl gradient-hero flex items-center justify-center">
            <Plane className="w-10 h-10 text-primary-foreground" />
          </div>
          
          <h1 className="text-3xl font-bold text-foreground mb-4">{title}</h1>
          <p className="text-muted-foreground mb-8">{description}</p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild variant="hero" size="lg">
              <Link to="/flights" className="gap-2">
                <Plane className="w-5 h-5" />
                Search Flights
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/hotels" className="gap-2">
                <Hotel className="w-5 h-5" />
                Search Hotels
              </Link>
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ComingSoon;
