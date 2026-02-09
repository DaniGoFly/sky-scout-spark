/**
 * PriceCalendarModal — Google Flights-style monthly calendar with per-day prices
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isBefore, startOfDay, isSameDay } from "date-fns";
import { ChevronLeft, ChevronRight, X, Calendar, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { fetchPriceCalendar, type PriceDay } from "@/lib/priceApi";
import { useLocale } from "@/hooks/useLocale";

interface PriceCalendarModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  origin: string;
  destination: string;
  onDateSelect: (date: string) => void;
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const PriceCalendarModal = ({ open, onOpenChange, origin, destination, onDateSelect }: PriceCalendarModalProps) => {
  const { currency, formatPrice } = useLocale();
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [priceData, setPriceData] = useState<PriceDay[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const today = useMemo(() => startOfDay(new Date()), []);

  const monthStr = format(currentMonth, "yyyy-MM");

  useEffect(() => {
    if (!open || !origin || !destination) return;

    setIsLoading(true);
    fetchPriceCalendar({ origin, destination, month: monthStr, currency })
      .then((res) => {
        if (res.ok) setPriceData(res.days);
        else setPriceData([]);
      })
      .finally(() => setIsLoading(false));
  }, [open, origin, destination, monthStr, currency]);

  const days = useMemo(() => eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) }), [currentMonth]);
  const startDayOfWeek = getDay(startOfMonth(currentMonth));

  const priceMap = useMemo(() => {
    const map = new Map<string, number | null>();
    priceData.forEach(d => map.set(d.date, d.price));
    return map;
  }, [priceData]);

  const minPrice = useMemo(() => {
    const prices = priceData.filter(d => d.price !== null).map(d => d.price!);
    return prices.length > 0 ? Math.min(...prices) : null;
  }, [priceData]);

  const handleDateClick = useCallback((day: Date) => {
    const dateStr = format(day, "yyyy-MM-dd");
    onDateSelect(dateStr);
    onOpenChange(false);
  }, [onDateSelect, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 gap-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Calendar className="w-4 h-4 text-primary" />
            Price Calendar · {origin} → {destination}
          </DialogTitle>
        </DialogHeader>

        {/* Month navigation */}
        <div className="flex items-center justify-between px-4 py-2">
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(m => subMonths(m, 1))}
            disabled={isBefore(subMonths(currentMonth, 1), startOfMonth(today))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="font-semibold text-sm">{format(currentMonth, "MMMM yyyy")}</span>
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(m => addMonths(m, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Grid */}
        <div className="px-4 pb-4">
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map(d => (
              <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">{d}</div>
            ))}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: startDayOfWeek }).map((_, i) => <div key={`pad-${i}`} />)}
              {days.map(day => {
                const dateStr = format(day, "yyyy-MM-dd");
                const price = priceMap.get(dateStr);
                const isDisabled = isBefore(day, today);
                const isCheapest = price !== null && price !== undefined && minPrice !== null && price === minPrice;

                return (
                  <button
                    key={dateStr}
                    disabled={isDisabled}
                    onClick={() => !isDisabled && handleDateClick(day)}
                    className={cn(
                      "flex flex-col items-center py-1.5 rounded-lg text-xs transition-colors min-h-[48px] justify-center",
                      isDisabled && "opacity-30 cursor-not-allowed",
                      !isDisabled && "hover:bg-secondary cursor-pointer",
                      isCheapest && !isDisabled && "bg-emerald-500/10 ring-1 ring-emerald-500/30"
                    )}
                  >
                    <span className="font-medium text-foreground">{day.getDate()}</span>
                    {price !== null && price !== undefined ? (
                      <span className={cn("text-[10px] font-semibold mt-0.5",
                        isCheapest ? "text-emerald-600" : "text-muted-foreground"
                      )}>
                        {formatPrice(price)}
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground/50 mt-0.5">—</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="px-4 pb-3 text-[10px] text-muted-foreground flex items-center gap-3 border-t border-border pt-2">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Cheapest
          </span>
          <span>Prices per person, one way</span>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PriceCalendarModal;
