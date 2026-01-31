import { Plane, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const isHome = location.pathname === "/";

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/60 backdrop-blur-xl border-b border-border/50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center transition-transform group-hover:scale-105 glow-primary">
            <Plane className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold text-foreground tracking-tight">
            GoFlyFinder
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {/* Flights - Active and unclickable on home page */}
          {isHome ? (
            <span className="px-4 py-2 rounded-lg text-sm font-medium text-primary bg-primary/10 cursor-default">
              Flights
            </span>
          ) : (
            <Link
              to="/"
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                location.pathname === "/flights"
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              Flights
            </Link>
          )}
          
          {/* Hotels - Always clickable */}
          <Link
            to="/hotels"
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              location.pathname === "/hotels"
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            )}
          >
            Hotels
          </Link>
        </nav>

        {/* Mobile Menu */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[280px] bg-card border-border">
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-2.5 mb-8 pt-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <Plane className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-bold text-foreground">GoFlyFinder</span>
              </div>
              
              <nav className="flex flex-col gap-1 flex-1">
                {/* Flights - Active and unclickable on home page */}
                {isHome ? (
                  <span className="px-4 py-3 rounded-xl font-medium text-primary bg-primary/10 cursor-default">
                    Flights
                  </span>
                ) : (
                  <Link
                    to="/"
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "px-4 py-3 rounded-xl font-medium transition-all",
                      location.pathname === "/flights"
                        ? "text-primary bg-primary/10"
                        : "text-muted-foreground hover:bg-secondary"
                    )}
                  >
                    Flights
                  </Link>
                )}
                
                {/* Hotels - Always clickable */}
                <Link
                  to="/hotels"
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "px-4 py-3 rounded-xl font-medium transition-all",
                    location.pathname === "/hotels"
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:bg-secondary"
                  )}
                >
                  Hotels
                </Link>
              </nav>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
};

export default Header;
