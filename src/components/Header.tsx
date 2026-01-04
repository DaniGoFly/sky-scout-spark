import { Plane, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/30">
      <div className="container mx-auto px-4 h-18 flex items-center justify-between py-4">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-11 h-11 rounded-2xl gradient-hero flex items-center justify-center shadow-button transition-transform group-hover:scale-105">
            <Plane className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground tracking-tight">GoFlyFinder</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {["Flights", "Hotels", "Car Rental", "Deals"].map((item) => (
            <a
              key={item}
              href="#"
              className="px-4 py-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all font-medium text-sm"
            >
              {item}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="ghost" className="hidden sm:inline-flex rounded-xl font-semibold">
            Log in
          </Button>
          <Button variant="hero" size="sm" className="rounded-xl font-semibold">
            Sign up
          </Button>
          <Button variant="ghost" size="icon" className="md:hidden rounded-xl">
            <Menu className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
