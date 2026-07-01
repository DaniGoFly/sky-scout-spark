import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const KEY = "gofly.lastDealClick";
// Show the banner if the user returns within this window after a click.
const WINDOW_MS = 15 * 60 * 1000;
// Ignore near-instant returns (< 3s) — user likely bounced back before the
// partner page loaded, no expiry signal yet.
const MIN_AWAY_MS = 3_000;

/**
 * Recovery hint shown when a user returns to the results page shortly after
 * clicking "View Deal". The partner (OTA) sometimes 404s on stale fares —
 * we can't detect it directly (cross-origin), so we surface a friendly
 * "deal may have expired" hint with a one-tap refresh.
 *
 * Trigger: presence of a recent `gofly.lastDealClick` timestamp AND the tab
 * is visible again. The banner is dismissible per return.
 */
export default function ExpiredDealBanner({ onRefresh }: { onRefresh?: () => void }) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  const check = useCallback(() => {
    if (typeof window === "undefined") return;
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return;
    const age = Date.now() - ts;
    if (age >= MIN_AWAY_MS && age <= WINDOW_MS && document.visibilityState === "visible") {
      setVisible(true);
    }
  }, []);

  useEffect(() => {
    check();
    const onVis = () => check();
    const onShow = () => check();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pageshow", onShow);
    window.addEventListener("focus", onShow);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pageshow", onShow);
      window.removeEventListener("focus", onShow);
    };
  }, [check]);

  const dismiss = () => {
    sessionStorage.removeItem(KEY);
    setVisible(false);
  };

  const refresh = () => {
    sessionStorage.removeItem(KEY);
    setVisible(false);
    if (onRefresh) onRefresh();
    else window.location.reload();
  };

  if (!visible) return null;

  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm"
    >
      <AlertTriangle className="w-4 h-4 mt-0.5 text-amber-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-foreground">
          {t(
            "results.deal_may_expired",
            "Deal may have expired. Please refresh results or choose another offer.",
          )}
        </p>
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-7 px-2 gap-1 text-xs shrink-0"
        onClick={refresh}
      >
        <RefreshCw className="w-3 h-3" />
        {t("results.refresh_search", "Refresh search")}
      </Button>
      <button
        type="button"
        onClick={dismiss}
        aria-label={t("common.dismiss", "Dismiss")}
        className="p-1 text-muted-foreground hover:text-foreground shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}