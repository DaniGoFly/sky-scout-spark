import { useMemo } from "react";
import { format, addDays, startOfDay, isSameDay } from "date-fns";
import { TrendingDown, TrendingUp } from "lucide-react";

interface PriceCalendarProps {
  departDate: Date;
  basePrice: number;
  onDateSelect: (date: Date) => void;
}

const PriceCalendar = ({ departDate, basePrice, onDateSelect }: PriceCalendarProps) => {
  const priceData = useMemo(() => {
    const today = startOfDay(new Date());
    const data = [];
    
    // Generate prices for 7 days before and after selected date
    for (let i = -3; i <= 3; i++) {
      const date = addDays(departDate, i);
      if (date < today) continue;
      
      // Generate pseudo-random but consistent price variation
      const seed = date.getDate() + date.getMonth() * 31;
      const variation = ((seed * 17) % 100) - 50; // -50 to +49
      const price = Math.max(basePrice + variation, Math.floor(basePrice * 0.7));
      
      data.push({
        date,
        price,
        isSelected: isSameDay(date, departDate),
        isCheapest: false,
      });
    }

    // Mark cheapest
    if (data.length > 0) {
      const minPrice = Math.min(...data.map(d => d.price));
      data.forEach(d => {
        d.isCheapest = d.price === minPrice;
      });
    }

    return data;
  }, [departDate, basePrice]);

  const avgPrice = useMemo(() => {
    if (priceData.length === 0) return basePrice;
    return Math.round(priceData.reduce((sum, d) => sum + d.price, 0) / priceData.length);
  }, [priceData, basePrice]);

  if (priceData.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-2xl p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-foreground">Price Calendar</h3>
          <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded">Estimated</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Avg: <span className="font-semibold text-foreground">${avgPrice}</span>
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
                {isCheapest && !isSelected && (
                  <TrendingDown className="w-3 h-3 text-emerald-500" />
                )}
                {isAboveAvg && !isCheapest && !isSelected && (
                  <TrendingUp className="w-3 h-3 text-orange-500" />
                )}
                <span className={`text-sm font-bold ${
                  isSelected 
                    ? "" 
                    : isCheapest 
                    ? "text-emerald-600" 
                    : isAboveAvg 
                    ? "text-orange-600" 
                    : "text-foreground"
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
          <span>Cheapest</span>
        </div>
        <div className="flex items-center gap-1">
          <TrendingUp className="w-3 h-3 text-orange-500" />
          <span>Above average</span>
        </div>
      </div>
    </div>
  );
};

export default PriceCalendar;
