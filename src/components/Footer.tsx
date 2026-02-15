import React from "react";
import { useTranslation } from "react-i18next";
import { Plane } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = React.forwardRef<HTMLElement>((_, ref) => {
  const { t } = useTranslation();

  return (
    <footer ref={ref} className="bg-card border-t border-border py-16 px-4 relative overflow-hidden">
      <div className="absolute bottom-0 start-0 w-96 h-96 bg-primary/5 rounded-full blur-[120px]" />
      
      <div className="container mx-auto relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Plane className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-foreground">GoFlyFinder</span>
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed">{t("footer.brand_desc")}</p>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4">{t("footer.products")}</h4>
            <ul className="space-y-3">
              <li><Link to="/flights" className="text-muted-foreground hover:text-primary text-sm transition-colors">{t("nav.flights")}</Link></li>
              <li><Link to="/hotels" className="text-muted-foreground hover:text-primary text-sm transition-colors">{t("nav.hotels")}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4">{t("footer.company")}</h4>
            <ul className="space-y-3">
              <li><Link to="/contact" className="text-muted-foreground hover:text-primary text-sm transition-colors">{t("footer.about")}</Link></li>
              <li><Link to="/contact" className="text-muted-foreground hover:text-primary text-sm transition-colors">{t("footer.contact")}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4">{t("footer.legal")}</h4>
            <ul className="space-y-3">
              <li><Link to="/privacy-policy" className="text-muted-foreground hover:text-primary text-sm transition-colors">{t("footer.privacy")}</Link></li>
              <li><Link to="/cookies" className="text-muted-foreground hover:text-primary text-sm transition-colors">{t("footer.cookies")}</Link></li>
              <li><Link to="/terms-and-conditions" className="text-muted-foreground hover:text-primary text-sm transition-colors">{t("footer.terms")}</Link></li>
              <li><Link to="/affiliate-disclosure" className="text-muted-foreground hover:text-primary text-sm transition-colors">{t("footer.affiliate")}</Link></li>
              <li><Link to="/impressum" className="text-muted-foreground hover:text-primary text-sm transition-colors">{t("footer.impressum")}</Link></li>
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

        <div className="border-t border-border pt-8 mb-8">
          <p className="text-xs text-muted-foreground text-center max-w-2xl mx-auto leading-relaxed">{t("footer.disclaimer")}</p>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          <p>{t("footer.copyright")}</p>
        </div>
      </div>
    </footer>
  );
});

Footer.displayName = "Footer";

export default Footer;
