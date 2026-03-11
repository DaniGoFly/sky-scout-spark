import React from "react";
import { useTranslation } from "react-i18next";
import { Plane } from "lucide-react";
import { Link } from "react-router-dom";
import { useLegalUrl } from "@/hooks/useLegalUrl";

const Footer = React.forwardRef<HTMLElement>((_, ref) => {
  const { t } = useTranslation();
  const privacyUrl = useLegalUrl("privacy-policy");
  const cookiesUrl = useLegalUrl("cookies");
  const termsUrl = useLegalUrl("terms-and-conditions");
  const affiliateUrl = useLegalUrl("affiliate-disclosure");
  const impressumUrl = useLegalUrl("impressum");
  return (
    <footer ref={ref} className="bg-card/50 border-t border-border/40 py-16 sm:py-20 px-4 sm:px-6 lg:px-8 relative">
      <div className="mx-auto max-w-[1100px] relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 sm:gap-10 mb-14">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
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

        <div className="border-t border-border/40 pt-8 mb-6">
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
