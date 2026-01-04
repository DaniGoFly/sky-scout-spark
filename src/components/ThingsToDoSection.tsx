import { Button } from "@/components/ui/button";
import { Compass } from "lucide-react";

const ThingsToDoSection = () => {
  return (
    <section className="py-16 px-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
      
      <div className="container mx-auto text-center relative z-10">
        <div className="max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6">
            <Compass className="w-4 h-4" />
            <span className="text-sm font-medium">Discover More</span>
          </div>
          
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Things To Do & Attractions
          </h2>
          
          <p className="text-muted-foreground mb-8 text-lg">
            Make the most of your trip with unforgettable tours, activities, and local experiences.
          </p>
          
          <Button 
            variant="hero" 
            size="lg" 
            asChild
          >
            <a 
              href="https://klook.tpo.lv/qk4USebH" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <Compass className="w-5 h-5 mr-2" />
              Explore Tours & Activities
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default ThingsToDoSection;
