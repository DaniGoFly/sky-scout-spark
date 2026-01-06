import { Plane, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const navItems = [
  { label: "Flights", path: "/flights" },
  { label: "Hotels", path: "/hotels" },
];

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

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
          {navItems.map((item) => (
            <Link
              key={item.label}
              to={item.path}
              className={cn(
                "px-4 py-2 rounded-xl hover:text-foreground hover:bg-secondary/80 transition-all font-medium text-sm",
                location.pathname === item.path
                  ? "text-foreground bg-secondary/60"
                  : "text-muted-foreground"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {/* Mobile Menu */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden rounded-xl">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] sm:w-[350px]">
              <div className="flex flex-col h-full">
                <div className="flex items-center gap-3 mb-8 pt-2">
                  <div className="w-10 h-10 rounded-xl gradient-hero flex items-center justify-center">
                    <Plane className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <span className="text-lg font-bold text-foreground">GoFlyFinder</span>
                </div>
                
                <nav className="flex flex-col gap-2 flex-1">
                  {navItems.map((item) => (
                    <Link
                      key={item.label}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "px-4 py-3 rounded-xl hover:bg-secondary/80 transition-all font-medium",
                        location.pathname === item.path
                          ? "text-foreground bg-secondary/60"
                          : "text-muted-foreground"
                      )}
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>
                
                <div className="border-t border-border pt-4">
                  <p className="text-xs text-muted-foreground text-center">
                    Compare flights & hotels from trusted providers
                  </p>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default Header;
