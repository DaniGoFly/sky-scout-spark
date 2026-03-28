import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Shield, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useLegalUrl } from "@/hooks/useLegalUrl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getConsent,
  hasConsentDecision,
  acceptAll,
  rejectAll,
  saveConsent,
  type ConsentData,
} from "@/lib/consent";

/** Reusable hook so footer "Cookie settings" can reopen */
export function useCookieSettings() {
  const [showPreferences, setShowPreferences] = useState(false);
  return { showPreferences, setShowPreferences };
}

export default function CookieConsent() {
  const { t } = useTranslation();
  const privacyUrl = useLegalUrl("privacy-policy");
  const cookiesUrl = useLegalUrl("cookies");
  const [visible, setVisible] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    if (!hasConsentDecision()) {
      setVisible(true);
    }
  }, []);

  const handleAcceptAll = useCallback(() => {
    acceptAll();
    setVisible(false);
    setShowPrefs(false);
  }, []);

  const handleRejectAll = useCallback(() => {
    rejectAll();
    setVisible(false);
    setShowPrefs(false);
  }, []);

  const handleSavePreferences = useCallback(() => {
    saveConsent(analytics, marketing);
    setVisible(false);
    setShowPrefs(false);
  }, [analytics, marketing]);

  const openPreferences = useCallback(() => {
    const consent = getConsent();
    if (consent) {
      setAnalytics(consent.analytics);
      setMarketing(consent.marketing);
    }
    setShowPrefs(true);
  }, []);

  // Listen for external "open cookie settings" events (from footer link)
  useEffect(() => {
    const handler = () => openPreferences();
    window.addEventListener("open-cookie-settings", handler);
    return () => window.removeEventListener("open-cookie-settings", handler);
  }, [openPreferences]);

  // Preferences modal
  const prefsModal = (
    <Dialog open={showPrefs} onOpenChange={setShowPrefs}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Shield className="w-5 h-5 text-primary" />
            {t("cookie.manage_title")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-5 py-2">
          {/* Necessary */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">{t("cookie.necessary")}</p>
              <p className="text-xs text-muted-foreground">{t("cookie.necessary_desc")}</p>
            </div>
            <Switch checked disabled className="opacity-50" />
          </div>
          {/* Analytics */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">{t("cookie.analytics")}</p>
              <p className="text-xs text-muted-foreground">{t("cookie.analytics_desc")}</p>
            </div>
            <Switch checked={analytics} onCheckedChange={setAnalytics} />
          </div>
          {/* Marketing / Affiliate */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">{t("cookie.marketing")}</p>
              <p className="text-xs text-muted-foreground">{t("cookie.marketing_desc")}</p>
            </div>
            <Switch checked={marketing} onCheckedChange={setMarketing} />
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={handleRejectAll}>
            {t("cookie.reject_all")}
          </Button>
          <Button className="flex-1" onClick={handleSavePreferences}>
            {t("cookie.save_preferences")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  if (!visible && !showPrefs) return prefsModal;

  return (
    <>
      {prefsModal}
      {visible && (
        <div className="fixed bottom-0 left-0 right-0 z-[60] p-4 pb-[calc(1rem+3.5rem+env(safe-area-inset-bottom))] md:pb-4 animate-in slide-in-from-bottom-4 duration-300">
          <div className="container mx-auto max-w-3xl">
            <div className="bg-card border border-border rounded-2xl p-5 shadow-2xl shadow-black/20">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground font-medium mb-1">
                    {t("cookie.banner_title")}
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                    {t("cookie.banner_text")}{" "}
                    <Link to={privacyUrl} className="text-primary hover:underline">
                      {t("footer.privacy")}
                    </Link>
                    {" · "}
                    <Link to={cookiesUrl} className="text-primary hover:underline">
                      {t("cookie.cookie_policy")}
                    </Link>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={handleAcceptAll}>
                      {t("cookie.accept_all")}
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleRejectAll}>
                      {t("cookie.reject_all")}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={openPreferences}>
                      {t("cookie.manage")}
                    </Button>
                  </div>
                </div>
                <button
                  onClick={handleRejectAll}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
