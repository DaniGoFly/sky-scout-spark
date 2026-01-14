import { Plane, Menu, Globe, ChevronDown } from "lucide-react";
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
  const isHome = location.pathname === "/";

  return (
    <header className={cn(
      "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
      isHome 
        ? "bg-transparent" 
        : "bg-background/95 backdrop-blur-md border-b border-border/50"
    )}>
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center transition-all",
            isHome ? "bg-white/20 backdrop-blur-sm" : "bg-primary"
          )}>
            <Plane className={cn(
              "w-5 h-5",
              isHome ? "text-white" : "text-primary-foreground"
            )} />
          </div>
          <span className={cn(
            "text-lg font-bold tracking-tight",
            isHome ? "text-white" : "text-foreground"
          )}>
            GoFlyFinder
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.label}
              to={item.path}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-all",
                isHome 
                  ? "text-white/90 hover:text-white hover:bg-white/10" 
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary",
                location.pathname === item.path && (isHome ? "bg-white/20 text-white" : "bg-secondary text-foreground")
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          {/* Language/Currency - Desktop */}
          <Button 
            variant="ghost" 
            size="sm" 
            className={cn(
              "hidden md:flex gap-1.5 rounded-full",
              isHome ? "text-white/90 hover:text-white hover:bg-white/10" : "text-muted-foreground"
            )}
          >
            <Globe className="w-4 h-4" />
            <span className="text-sm">EN</span>
            <ChevronDown className="w-3 h-3" />
          </Button>

          {/* Mobile Menu */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className={cn(
                  "md:hidden rounded-full",
                  isHome ? "text-white hover:bg-white/10" : ""
                )}
              >
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px]">
              <div className="flex flex-col h-full">
                <div className="flex items-center gap-2.5 mb-8 pt-2">
                  <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
                    <Plane className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <span className="text-lg font-bold text-foreground">GoFlyFinder</span>
                </div>
                
                <nav className="flex flex-col gap-1 flex-1">
                  {navItems.map((item) => (
                    <Link
                      key={item.label}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "px-4 py-3 rounded-xl font-medium transition-all",
                        location.pathname === item.path
                          ? "text-foreground bg-secondary"
                          : "text-muted-foreground hover:bg-secondary/50"
                      )}
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default Header;
