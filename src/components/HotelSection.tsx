import { Button } from "@/components/ui/button";
import { Hotel } from "lucide-react";

const HotelSection = () => {
  return (
    <section className="py-16 px-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-secondary/50 to-transparent" />
      
      <div className="container mx-auto text-center relative z-10">
        <div className="max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6">
            <Hotel className="w-4 h-4" />
            <span className="text-sm font-medium">Accommodations</span>
          </div>
          
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Find the Perfect Hotel
          </h2>
          
          <p className="text-muted-foreground mb-8 text-lg">
            Compare hotel prices from trusted booking partners worldwide.
          </p>
          
          <Button 
            variant="hero" 
            size="lg" 
            asChild
          >
            <a 
              href="#" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <Hotel className="w-5 h-5 mr-2" />
              Search Hotels
            </a>
          </Button>
          
          <p className="text-sm text-muted-foreground mt-4">
            No hidden fees • Secure booking • Trusted travel partners
          </p>
        </div>
      </div>
    </section>
  );
};

export default HotelSection;
