import { memo } from "react";
import { useLocation, Link } from "react-router-dom";
import { Plane, Compass, Heart, Menu } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import LocaleSelector from "../LocaleSelector";
import { HOTELS_ENABLED } from "@/lib/featureFlags";
import { toast } from "sonner";

const NAV_ITEMS = [
  { path: "/", icon: Plane, labelKey: "nav.flights", matchPaths: ["/", "/flights"] },
  { path: "/explore", icon: Compass, labelKey: "nav.explore", matchPaths: ["/explore"] },
  { path: "/saved", icon: Heart, labelKey: "nav.saved", matchPaths: ["/saved"] },
] as const;

const MobileBottomNav = memo(() => {
  const location = useLocation();
  const { t } = useTranslation();
  const [moreOpen, setMoreOpen] = useState(false);

  // Hide on results pages — they have their own sticky controls
  const hideOnRoutes = ["/flights/results", "/flights/multicity", "/results", "/search"];
  if (hideOnRoutes.some(r => location.pathname.startsWith(r))) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[90] md:hidden bg-card/95 backdrop-blur-xl border-t border-border/50"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-stretch justify-around h-14">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = item.matchPaths.some(p =>
            p === "/" ? location.pathname === "/" : location.pathname.startsWith(p)
          );

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center flex-1 gap-0.5 transition-colors min-w-0",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground active:text-foreground"
              )}
            >
              <Icon className={cn("w-5 h-5", isActive && "fill-primary/15")} />
              <span className="text-[10px] font-medium leading-none">{t(item.labelKey)}</span>
            </Link>
          );
        })}

        {/* More tab with sheet */}
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger asChild>
            <button
              className="flex flex-col items-center justify-center flex-1 gap-0.5 text-muted-foreground active:text-foreground transition-colors min-w-0"
            >
              <Menu className="w-5 h-5" />
              <span className="text-[10px] font-medium leading-none">{t("nav.more", "More")}</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl bg-card border-border pb-8" style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom))" }}>
            <div className="space-y-4 pt-2">
              <h3 className="text-sm font-semibold text-foreground px-1">{t("nav.more", "More")}</h3>
              <div className="space-y-1">
                <Link
                  to="/contact"
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-foreground hover:bg-secondary transition-colors"
                >
                  {t("footer.contact")}
                </Link>
                {HOTELS_ENABLED ? (
                  <Link
                    to="/hotels"
                    onClick={() => setMoreOpen(false)}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-foreground hover:bg-secondary transition-colors"
                  >
                    {t("nav.hotels")}
                  </Link>
                ) : (
                  <button
                    onClick={() => {
                      toast.info(t("hero.coming_soon"), { duration: 3000 });
                      setMoreOpen(false);
                    }}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors w-full text-left"
                  >
                    {t("nav.hotels")}
                  </button>
                )}
              </div>
              <div className="border-t border-border/40 pt-3">
                <div className="flex items-center gap-3 px-3 py-2">
                  <span className="text-sm text-muted-foreground">{t("nav.language", "Language")}</span>
                  <LocaleSelector />
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
});

MobileBottomNav.displayName = "MobileBottomNav";
export default MobileBottomNav;
