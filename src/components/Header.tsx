import { Plane, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import LocaleSelector from "./LocaleSelector";

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { t } = useTranslation();
  const isHome = location.pathname === "/";
  const isHotels = location.pathname === "/hotels";

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/60 backdrop-blur-xl border-b border-border/50" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className="container mx-auto px-4 min-h-[56px] h-16 flex items-center justify-between max-w-full box-border overflow-hidden">
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
          {isHome ? (
            <span className="px-4 py-2 rounded-lg text-sm font-medium text-primary bg-primary/10 cursor-default">
              {t("nav.flights")}
            </span>
          ) : (
            <Link
              to="/"
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              {t("nav.flights")}
            </Link>
          )}
          
          {isHotels ? (
            <span className="px-4 py-2 rounded-lg text-sm font-medium text-primary bg-primary/10 cursor-default">
              {t("nav.hotels")}
            </span>
          ) : (
            <Link
              to="/hotels"
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              {t("nav.hotels")}
            </Link>
          )}

          <Link
            to="/explore"
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              location.pathname === "/explore"
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            )}
          >
            {t("nav.explore")}
          </Link>

          <LocaleSelector />
        </nav>

        {/* Mobile: Locale + Menu */}
        <div className="flex items-center gap-3 md:hidden shrink-0">
          <LocaleSelector />
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-lg"
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
                  {[
                    { path: "/", label: t("nav.flights"), active: isHome },
                    { path: "/hotels", label: t("nav.hotels"), active: isHotels },
                    { path: "/explore", label: t("nav.explore"), active: location.pathname === "/explore" },
                  ].map((item) =>
                    item.active ? (
                      <span key={item.path} className="px-4 py-3 rounded-xl font-medium text-primary bg-primary/10 cursor-default text-[15px]">
                        {item.label}
                      </span>
                    ) : (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className="px-4 py-3 rounded-xl font-medium text-muted-foreground hover:bg-secondary transition-all text-[15px] active:scale-[0.98]"
                      >
                        {item.label}
                      </Link>
                    )
                  )}
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
