import { useMemo } from "react";
import { format, addDays, startOfDay, isSameDay } from "date-fns";
import { TrendingDown, TrendingUp, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

interface PriceCalendarProps {
  departDate: Date;
  basePrice: number;
  onDateSelect: (date: Date) => void;
  isRealData?: boolean;
  hideIfNoData?: boolean;
}

const PriceCalendar = ({ departDate, basePrice, onDateSelect, isRealData = false, hideIfNoData = false }: PriceCalendarProps) => {
  const { t } = useTranslation();

  const priceData = useMemo(() => {
    const today = startOfDay(new Date());
    const data = [];
    for (let i = -3; i <= 3; i++) {
      const date = addDays(departDate, i);
      if (date < today) continue;
      const seed = date.getDate() + date.getMonth() * 31;
      const variation = ((seed * 17) % 100) - 50;
      const price = Math.max(basePrice + variation, Math.floor(basePrice * 0.7));
      data.push({ date, price, isSelected: isSameDay(date, departDate), isCheapest: false });
    }
    if (data.length > 0) {
      const minPrice = Math.min(...data.map(d => d.price));
      data.forEach(d => { d.isCheapest = d.price === minPrice && !d.isSelected; });
    }
    return data;
  }, [departDate, basePrice]);

  const avgPrice = useMemo(() => {
    if (priceData.length === 0) return basePrice;
    return Math.round(priceData.reduce((sum, d) => sum + d.price, 0) / priceData.length);
  }, [priceData, basePrice]);

  if (priceData.length === 0) return null;
  if (hideIfNoData && !isRealData) return null;

  return (
    <div className="bg-card border border-border rounded-2xl p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-foreground">{t("price_calendar.title")}</h3>
          {!isRealData && (
            <span className="text-xs text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded font-medium flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {t("price_calendar.estimated")}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {isRealData ? t("price_calendar.lowest") : t("price_calendar.based_on")}{" "}
          <span className="font-semibold text-foreground">${basePrice}</span>
        </p>
      </div>
      
      <div className="flex gap-2 overflow-x-auto pb-2">
        {priceData.map(({ date, price, isSelected, isCheapest }) => {
          const isAboveAvg = price > avgPrice;
          return (
            <button
              key={date.toISOString()}
              onClick={() => onDateSelect(date)}
              className={`flex-shrink-0 flex flex-col items-center p-3 rounded-xl transition-all min-w-[70px] ${
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : isCheapest
                  ? "bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20"
                  : "bg-secondary/50 hover:bg-secondary"
              }`}
            >
              <span className={`text-xs ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                {format(date, "EEE")}
              </span>
              <span className={`text-sm font-semibold ${isSelected ? "" : "text-foreground"}`}>
                {format(date, "MMM d")}
              </span>
              <div className="flex items-center gap-1 mt-1">
                {isCheapest && !isSelected && <TrendingDown className="w-3 h-3 text-emerald-500" />}
                {isAboveAvg && !isCheapest && !isSelected && <TrendingUp className="w-3 h-3 text-orange-500" />}
                <span className={`text-sm font-bold ${
                  isSelected ? "" : isCheapest ? "text-emerald-600" : isAboveAvg ? "text-orange-600" : "text-foreground"
                }`}>
                  ${price}
                </span>
              </div>
            </button>
          );
        })}
      </div>
      
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <TrendingDown className="w-3 h-3 text-emerald-500" />
          <span>{t("price_calendar.cheapest")}</span>
        </div>
        <div className="flex items-center gap-1">
          <TrendingUp className="w-3 h-3 text-orange-500" />
          <span>{t("price_calendar.above_average")}</span>
        </div>
        {!isRealData && (
          <span className="ml-auto text-amber-600">{t("price_calendar.estimates_only")}</span>
        )}
      </div>
    </div>
  );
};

export default PriceCalendar;
