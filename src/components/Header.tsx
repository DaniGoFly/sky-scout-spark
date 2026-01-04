import { Plane, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-md border-b border-border/50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl gradient-hero flex items-center justify-center">
            <Plane className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground">GoFlyFinder</span>
        </div>

        <nav className="hidden md:flex items-center gap-8">
          <a href="#" className="text-muted-foreground hover:text-foreground transition-colors font-medium">
            Flights
          </a>
          <a href="#" className="text-muted-foreground hover:text-foreground transition-colors font-medium">
            Hotels
          </a>
          <a href="#" className="text-muted-foreground hover:text-foreground transition-colors font-medium">
            Car Rental
          </a>
          <a href="#" className="text-muted-foreground hover:text-foreground transition-colors font-medium">
            Deals
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <Button variant="ghost" className="hidden sm:inline-flex">
            Log in
          </Button>
          <Button variant="hero" size="sm">
            Sign up
          </Button>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
