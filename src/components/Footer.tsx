import React from "react";
import { useTranslation } from "react-i18next";
import { Plane } from "lucide-react";
import { Link } from "react-router-dom";
import { useLegalUrl } from "@/hooks/useLegalUrl";
import { HOTELS_ENABLED } from "@/lib/featureFlags";
import { toast } from "sonner";

const Footer = React.forwardRef<HTMLElement>((_, ref) => {
  const { t } = useTranslation();
  const privacyUrl = useLegalUrl("privacy-policy");
  const cookiesUrl = useLegalUrl("cookies");
  const termsUrl = useLegalUrl("terms-and-conditions");
  const affiliateUrl = useLegalUrl("affiliate-disclosure");
  const impressumUrl = useLegalUrl("impressum");
  return (
    <footer ref={ref} className="bg-card/50 border-t border-border/40 py-12 md:py-16 xl:py-20 px-4 sm:px-6 lg:px-8 relative" style={{ paddingBottom: "calc(3rem + env(safe-area-inset-bottom))" }}>
      <div className="mx-auto max-w-[1100px] relative z-10">

        {/* ═══ Mobile footer: clean stacked layout ═══ */}
        <div className="md:hidden space-y-8 mb-10">
          <div>
            <Link to="/" className="flex items-center gap-2.5 mb-3 group">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
                <Plane className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold text-foreground tracking-tight">GoFlyFinder</span>
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-[280px]">{t("footer.brand_desc")}</p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-foreground text-sm mb-3">{t("footer.products")}</h4>
              <ul className="space-y-2">
                <li><Link to="/flights" className="text-muted-foreground hover:text-primary text-sm transition-colors py-1 block">{t("nav.flights")}</Link></li>
                {HOTELS_ENABLED ? (
                  <li><Link to="/hotels" className="text-muted-foreground hover:text-primary text-sm transition-colors py-1 block">{t("nav.hotels")}</Link></li>
                ) : (
                  <li><button onClick={() => toast.info(t("hero.coming_soon"), { duration: 3000 })} className="text-muted-foreground hover:text-primary text-sm transition-colors py-1 block">{t("nav.hotels")}</button></li>
                )}
                <li><Link to="/explore" className="text-muted-foreground hover:text-primary text-sm transition-colors py-1 block">{t("nav.explore")}</Link></li>
                <li><Link to="/contact" className="text-muted-foreground hover:text-primary text-sm transition-colors py-1 block">{t("footer.contact")}</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground text-sm mb-3">{t("footer.legal")}</h4>
              <ul className="space-y-2">
                <li><Link to={privacyUrl} className="text-muted-foreground hover:text-primary text-sm transition-colors py-1 block">{t("footer.privacy")}</Link></li>
                <li><Link to={termsUrl} className="text-muted-foreground hover:text-primary text-sm transition-colors py-1 block">{t("footer.terms")}</Link></li>
                <li><Link to={cookiesUrl} className="text-muted-foreground hover:text-primary text-sm transition-colors py-1 block">{t("footer.cookies")}</Link></li>
                <li><Link to={impressumUrl} className="text-muted-foreground hover:text-primary text-sm transition-colors py-1 block">{t("footer.impressum")}</Link></li>
                <li>
                  <button
                    onClick={() => window.dispatchEvent(new Event("open-cookie-settings"))}
                    className="text-muted-foreground hover:text-primary text-sm transition-colors py-1"
                  >
                    {t("footer.cookie_settings")}
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* ═══ Tablet/Desktop footer: 4-column grid — unchanged ═══ */}
        <div className="hidden md:grid grid-cols-4 gap-8 xl:gap-10 mb-14">
          {/* Brand */}
          <div>
            <Link to="/" className="flex items-center gap-2.5 mb-4 group">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center transition-transform group-hover:scale-105">
                <Plane className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold text-foreground tracking-tight">GoFlyFinder</span>
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-[220px]">{t("footer.brand_desc")}</p>
          </div>

          {/* Products */}
          <div>
            <h4 className="font-semibold text-foreground text-sm mb-4">{t("footer.products")}</h4>
            <ul className="space-y-2.5">
              <li><Link to="/flights" className="text-muted-foreground hover:text-primary text-sm transition-colors">{t("nav.flights")}</Link></li>
              <li><Link to="/hotels" className="text-muted-foreground hover:text-primary text-sm transition-colors">{t("nav.hotels")}</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold text-foreground text-sm mb-4">{t("footer.company")}</h4>
            <ul className="space-y-2.5">
              <li><Link to="/contact" className="text-muted-foreground hover:text-primary text-sm transition-colors">{t("footer.about")}</Link></li>
              <li><Link to="/contact" className="text-muted-foreground hover:text-primary text-sm transition-colors">{t("footer.contact")}</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold text-foreground text-sm mb-4">{t("footer.legal")}</h4>
            <ul className="space-y-2.5">
              <li><Link to={privacyUrl} className="text-muted-foreground hover:text-primary text-sm transition-colors">{t("footer.privacy")}</Link></li>
              <li><Link to={cookiesUrl} className="text-muted-foreground hover:text-primary text-sm transition-colors">{t("footer.cookies")}</Link></li>
              <li><Link to={termsUrl} className="text-muted-foreground hover:text-primary text-sm transition-colors">{t("footer.terms")}</Link></li>
              <li><Link to={affiliateUrl} className="text-muted-foreground hover:text-primary text-sm transition-colors">{t("footer.affiliate")}</Link></li>
              <li><Link to={impressumUrl} className="text-muted-foreground hover:text-primary text-sm transition-colors">{t("footer.impressum")}</Link></li>
              <li>
                <button
                  onClick={() => window.dispatchEvent(new Event("open-cookie-settings"))}
                  className="text-muted-foreground hover:text-primary text-sm transition-colors"
                >
                  {t("footer.cookie_settings")}
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border/40 pt-6 md:pt-8 mb-4 md:mb-6">
          <p className="text-xs text-muted-foreground/70 text-center max-w-2xl mx-auto leading-relaxed">{t("footer.disclaimer")}</p>
        </div>

        <div className="text-center text-sm text-muted-foreground/60">
          <p>{t("footer.copyright")}</p>
        </div>
      </div>
    </footer>
  );
});

Footer.displayName = "Footer";

export default Footer;
