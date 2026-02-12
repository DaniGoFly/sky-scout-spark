import { memo } from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { useLocale } from "@/hooks/useLocale";
import type { Flight } from "@/lib/flightNormalizer";
import { getAirlineName } from "@/lib/flightNormalizer";

interface StickyMobileCTAProps {
  cheapestFlight: Flight | null;
  onViewDeal: () => void;
}

const StickyMobileCTA = memo(({ cheapestFlight, onViewDeal }: StickyMobileCTAProps) => {
  const { t } = useTranslation();
  const { formatPrice } = useLocale();

  if (!cheapestFlight) return null;

  const airline = getAirlineName(cheapestFlight.airlines?.[0] || "");
  const price = formatPrice(cheapestFlight.price.amount, cheapestFlight.price.currency);

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 bg-card/95 backdrop-blur-md border-t border-border px-4 py-3 md:hidden">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground truncate">{airline}</p>
          <p className="text-lg font-bold text-foreground">{price}</p>
        </div>
        <Button onClick={onViewDeal} size="lg" className="gap-1.5 font-semibold whitespace-nowrap px-6">
          <span>{t("card.view_deal", "View Deal")}</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
});
StickyMobileCTA.displayName = "StickyMobileCTA";

export default StickyMobileCTA;
