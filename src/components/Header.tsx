import { Plane, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import AuthModal from "@/components/AuthModal";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Flights", path: "/" },
  { label: "Hotels", path: "/hotels" },
  { label: "Car Rental", path: "/car-rental" },
  { label: "Deals", path: "/deals" },
];

const Header = () => {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const location = useLocation();

  const openLogin = () => {
    setAuthMode("login");
    setAuthModalOpen(true);
  };

  const openSignup = () => {
    setAuthMode("signup");
    setAuthModalOpen(true);
  };

  return (
    <>
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
            <Button 
              variant="ghost" 
              className="hidden sm:inline-flex rounded-xl font-semibold"
              onClick={openLogin}
            >
              Log in
            </Button>
            <Button 
              variant="hero" 
              size="sm" 
              className="rounded-xl font-semibold"
              onClick={openSignup}
            >
              Sign up
            </Button>
            <Button variant="ghost" size="icon" className="md:hidden rounded-xl">
              <Menu className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <AuthModal 
        isOpen={authModalOpen} 
        onClose={() => setAuthModalOpen(false)} 
        initialMode={authMode}
      />
    </>
  );
};

export default Header;
