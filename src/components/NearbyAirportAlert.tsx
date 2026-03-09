/**
 * NearbyAirportAlert — subtle insider-tip banner
 */

import { memo, useMemo } from "react";
import { Plane, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import type { EnrichedFlight } from "@/lib/flightEnrichment";
import { useLocale } from "@/hooks/useLocale";

interface NearbyAirportAlertProps {
  currentOrigin: string;
  destination: string;
  currentFlights: EnrichedFlight[];
  allFlights: EnrichedFlight[];
  onDismiss: () => void;
  onViewAlternate: (origin: string) => void;
  flightsCurrency?: string;
}

const NEARBY_DRIVE_TIMES: Record<string, Record<string, number>> = {
  STR: { FRA: 80, MUC: 130 }, MUC: { STR: 130, NUE: 70 }, DUS: { CGN: 30, FRA: 130 },
  HAM: { BRE: 90 }, FRA: { STR: 80, DUS: 130 }, LHR: { LGW: 60, STN: 60, LTN: 60 },
  LGW: { LHR: 60, STN: 80 }, STN: { LHR: 60, LGW: 80 }, CDG: { ORY: 40 }, ORY: { CDG: 40 },
  FCO: { CIA: 40 }, MXP: { LIN: 50, BGY: 50 }, BCN: { GRO: 90 }, MAD: { VLC: 180 },
  BRU: { AMS: 170, LGG: 80 }, AMS: { BRU: 170, EIN: 90 }, VIE: { BTS: 55 }, ZRH: { BSL: 80 },
};

function getDriveTime(from: string, to: string): number | null {
  return NEARBY_DRIVE_TIMES[from]?.[to] ?? NEARBY_DRIVE_TIMES[to]?.[from] ?? null;
}

const SAVINGS_THRESHOLD = 40;

const NearbyAirportAlert = memo(({
  currentOrigin, destination, currentFlights, allFlights, onDismiss, onViewAlternate, flightsCurrency,
}: NearbyAirportAlertProps) => {
  const { t } = useTranslation();
  const { formatPrice } = useLocale();

  const formatDriveTime = (minutes: number): string => {
    if (minutes < 60) return t("nearby.drive_min", { min: minutes });
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? t("nearby.drive_hours_min", { h, m }) : t("nearby.drive_hours", { h });
  };

  const suggestion = useMemo(() => {
    if (!currentFlights.length || !allFlights.length) return null;
    const currentCheapest = Math.min(...currentFlights.map(f => f.price.amount));
    const alternates = new Map<string, number>();
    for (const f of allFlights) {
      const src = ((f as any).origin_source || f.origin || "").toUpperCase();
      if (!src || src === currentOrigin.toUpperCase()) continue;
      const existing = alternates.get(src);
      if (existing === undefined || f.price.amount < existing) alternates.set(src, f.price.amount);
    }
    let bestAlt: { origin: string; price: number; savings: number; driveTime: number | null } | null = null;
    for (const [origin, price] of alternates) {
      const savings = currentCheapest - price;
      if (savings >= SAVINGS_THRESHOLD) {
        if (!bestAlt || savings > bestAlt.savings) {
          bestAlt = { origin, price, savings, driveTime: getDriveTime(currentOrigin.toUpperCase(), origin) };
        }
      }
    }
    return bestAlt;
  }, [currentFlights, allFlights, currentOrigin]);

  if (!suggestion) return null;

  const savingsLabel = formatPrice(suggestion.savings, flightsCurrency);
  const priceLabel = formatPrice(suggestion.price, flightsCurrency);

  return (
    <div className="relative flex items-start gap-3 rounded-xl border border-primary/15 bg-primary/5 px-4 py-3.5 text-sm">
      <button
        onClick={onDismiss}
        className="absolute top-2.5 end-2.5 p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors"
        aria-label={t("nearby.dismiss")}
      >
        <X className="w-3.5 h-3.5" />
      </button>

      <div className="mt-0.5 shrink-0 w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
        <Plane className="w-3.5 h-3.5 text-primary" />
      </div>

      <div className="flex-1 min-w-0 pe-6">
        <p className="font-semibold text-foreground leading-snug">
          {t("compare.saves", { origin: suggestion.origin, amount: savingsLabel })}
        </p>
        <p className="text-muted-foreground text-xs mt-0.5 leading-relaxed">
          {suggestion.origin} → {destination} {t("flight_card.from").toLowerCase()} {priceLabel}
          {suggestion.driveTime !== null && (
            <span> · {t("compare.drive_time", { time: formatDriveTime(suggestion.driveTime), origin: currentOrigin })}</span>
          )}
        </p>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => onViewAlternate(suggestion.origin)}
        className="shrink-0 self-center text-xs border-primary/30 hover:border-primary/60 hover:bg-primary/10 h-7 px-3"
      >
        {t("compare.view_origin", { origin: suggestion.origin })}
      </Button>
    </div>
  );
});

NearbyAirportAlert.displayName = "NearbyAirportAlert";
export default NearbyAirportAlert;
