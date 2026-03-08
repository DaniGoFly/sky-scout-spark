import React, { useState, useCallback, useMemo } from "react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isBefore, isAfter, startOfDay, getDay } from "date-fns";
import { ChevronLeft, ChevronRight, X, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

/* ─── Types ─── */
export interface CalendarPanelProps {
  departDate: Date | null;
  returnDate: Date | null;
  onDepartChange: (date: Date | null) => void;
  onReturnChange: (date: Date | null) => void;
  tripType: "roundtrip" | "oneway";
  onTripTypeChange: (type: "roundtrip" | "oneway") => void;
  onDone: () => void;
  /* Flex dates state */
  departFlexBefore: number;
  departFlexAfter: number;
  returnFlexBefore: number;
  returnFlexAfter: number;
  onDepartFlexBeforeChange: (v: number) => void;
  onDepartFlexAfterChange: (v: number) => void;
  onReturnFlexBeforeChange: (v: number) => void;
  onReturnFlexAfterChange: (v: number) => void;
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

/* ─── Day Cell ─── */
const DayCell = React.memo(({
  day, isStart, isEnd, isInRange, isDisabled, isToday, onClick
}: {
  day: Date; isStart: boolean; isEnd: boolean; isInRange: boolean; isDisabled: boolean; isToday: boolean; onClick: () => void;
}) => (
  <button
    type="button"
    disabled={isDisabled}
    onClick={onClick}
    className={cn(
      "relative h-10 w-10 text-sm font-medium transition-all rounded-full",
      "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-1",
      isDisabled && "text-gray-300 cursor-not-allowed",
      !isDisabled && !isStart && !isEnd && !isInRange && "text-gray-700 hover:bg-primary/10",
      isInRange && !isStart && !isEnd && "bg-primary/10 text-gray-800 rounded-none",
      (isStart || isEnd) && "bg-primary text-white font-semibold shadow-sm",
      isStart && isInRange && "rounded-l-full rounded-r-none",
      isEnd && isInRange && "rounded-r-full rounded-l-none",
      isStart && !isInRange && "rounded-full",
      isEnd && !isInRange && "rounded-full",
      isToday && !isStart && !isEnd && "ring-1 ring-primary/30 font-bold"
    )}
  >
    {day.getDate()}
  </button>
));
DayCell.displayName = "DayCell";

/* ─── Month Grid ─── */
const MonthGrid = React.memo(({
  month, departDate, returnDate, tripType, onDayClick, today
}: {
  month: Date; departDate: Date | null; returnDate: Date | null; tripType: "roundtrip" | "oneway"; onDayClick: (day: Date) => void; today: Date;
}) => {
  const days = useMemo(() => eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) }), [month]);
  const startDayOfWeek = useMemo(() => getDay(startOfMonth(month)), [month]);
  const paddingDays = useMemo(() => Array.from({ length: startDayOfWeek }, (_, i) => i), [startDayOfWeek]);

  return (
    <div className="flex-1 min-w-0">
      <h3 className="text-center font-semibold text-gray-900 text-base mb-4">{format(month, "MMMM yyyy")}</h3>
      <div className="grid grid-cols-7 gap-0 mb-2">
        {WEEKDAYS.map((d) => (
          <div key={d} className="h-8 flex items-center justify-center text-xs font-medium text-gray-400 uppercase tracking-wider">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0">
        {paddingDays.map((i) => <div key={`pad-${i}`} className="h-10 w-10" />)}
        {days.map((day) => {
          const isDisabled = isBefore(day, today);
          const isStart = departDate ? isSameDay(day, departDate) : false;
          const isEnd = tripType === "roundtrip" && returnDate ? isSameDay(day, returnDate) : false;
          const isInRange = tripType === "roundtrip" && departDate && returnDate && isAfter(day, departDate) && isBefore(day, returnDate);
          const showRange = isInRange || (isStart && returnDate && tripType === "roundtrip" && !isSameDay(departDate!, returnDate)) || (isEnd && departDate && tripType === "roundtrip" && !isSameDay(departDate, returnDate!));
          const isToday = isSameDay(day, today);
          return (
            <DayCell key={day.toISOString()} day={day} isStart={isStart} isEnd={isEnd} isInRange={!!showRange} isDisabled={isDisabled} isToday={isToday} onClick={() => !isDisabled && onDayClick(day)} />
          );
        })}
      </div>
    </div>
  );
});
MonthGrid.displayName = "MonthGrid";

/* ─── Flex Stepper ─── */
const FlexStepper = ({ label, value, onChange, max = 10 }: { label: string; value: number; onChange: (v: number) => void; max?: number }) => (
  <div className="flex items-center justify-between">
    <span className="text-sm text-gray-600">{label}</span>
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => onChange(Math.max(0, value - 1))} disabled={value <= 0}
        className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-600 disabled:opacity-30 transition-colors">
        <Minus className="w-3.5 h-3.5" />
      </button>
      <span className="w-6 text-center text-sm font-semibold text-gray-900 tabular-nums">{value}</span>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max}
        className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-600 disabled:opacity-30 transition-colors">
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
);

/* ═══════════════════════════════════════════
   CALENDAR PANEL — Skyscanner-style attached
   ═══════════════════════════════════════════ */
export const CalendarPanel: React.FC<CalendarPanelProps> = ({
  departDate, returnDate, onDepartChange, onReturnChange,
  tripType, onTripTypeChange, onDone,
  departFlexBefore, departFlexAfter, returnFlexBefore, returnFlexAfter,
  onDepartFlexBeforeChange, onDepartFlexAfterChange, onReturnFlexBeforeChange, onReturnFlexAfterChange,
}) => {
  const [currentMonth, setCurrentMonth] = useState(() => departDate ? startOfMonth(departDate) : startOfMonth(new Date()));
  const [selectingReturn, setSelectingReturn] = useState(() => !!departDate && !returnDate && tripType === "roundtrip");
  const [activeTab, setActiveTab] = useState<"specific" | "flexible">("specific");
  const isMobile = useIsMobile();
  const today = useMemo(() => startOfDay(new Date()), []);
  const nextMonth = useMemo(() => addMonths(currentMonth, 1), [currentMonth]);
  const canGoPrev = useMemo(() => !isBefore(subMonths(currentMonth, 1), startOfMonth(today)), [currentMonth, today]);

  const handleDayClick = useCallback((day: Date) => {
    if (tripType === "oneway") {
      onDepartChange(day);
      return;
    }
    if (!selectingReturn || !departDate) {
      onDepartChange(day);
      onReturnChange(null);
      setSelectingReturn(true);
    } else {
      if (isBefore(day, departDate) || isSameDay(day, departDate)) {
        onDepartChange(day);
        onReturnChange(null);
      } else {
        onReturnChange(day);
        setSelectingReturn(false);
      }
    }
  }, [tripType, selectingReturn, departDate, onDepartChange, onReturnChange]);

  const handleClear = useCallback(() => {
    onDepartChange(null);
    onReturnChange(null);
    setSelectingReturn(false);
    setCurrentMonth(startOfMonth(new Date()));
  }, [onDepartChange, onReturnChange]);

  const handleResetFlex = useCallback(() => {
    onDepartFlexBeforeChange(0);
    onDepartFlexAfterChange(0);
    onReturnFlexBeforeChange(0);
    onReturnFlexAfterChange(0);
  }, [onDepartFlexBeforeChange, onDepartFlexAfterChange, onReturnFlexBeforeChange, onReturnFlexAfterChange]);

  return (
    <div
      className="w-full bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.25)] border border-gray-200 overflow-hidden pointer-events-auto"
      onClick={(e) => e.stopPropagation()}
    >
      {/* ── Header: Trip type + Tabs + Close ── */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100">
        {/* Trip type */}
        <div className="flex gap-1">
          <button type="button" onClick={() => onTripTypeChange("roundtrip")}
            className={cn("px-4 py-1.5 rounded-full text-sm font-medium transition-all",
              tripType === "roundtrip" ? "bg-primary text-white" : "text-gray-500 hover:bg-gray-100")}>
            Round trip
          </button>
          <button type="button" onClick={() => onTripTypeChange("oneway")}
            className={cn("px-4 py-1.5 rounded-full text-sm font-medium transition-all",
              tripType === "oneway" ? "bg-primary text-white" : "text-gray-500 hover:bg-gray-100")}>
            One way
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-gray-100 rounded-full p-0.5">
          <button type="button" onClick={() => setActiveTab("specific")}
            className={cn("px-5 py-1.5 rounded-full text-sm font-medium transition-all",
              activeTab === "specific" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}>
            Specific dates
          </button>
          <button type="button" onClick={() => setActiveTab("flexible")}
            className={cn("px-5 py-1.5 rounded-full text-sm font-medium transition-all",
              activeTab === "flexible" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}>
            Flexible dates
          </button>
        </div>

        {/* Close */}
        <button type="button" onClick={onDone}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600" aria-label="Close calendar">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* ── Content ── */}
      {activeTab === "specific" ? (
        <>
          {/* Selection hint */}
          <div className="px-6 py-2.5 text-sm text-center text-gray-400 bg-gray-50/60">
            {tripType === "roundtrip"
              ? (selectingReturn ? "Select return date" : "Select departure date")
              : "Select departure date"}
          </div>

          {/* Month navigation + Calendars */}
          <div className="px-6 pt-2 pb-4">
            <div className="flex items-start gap-8">
              {/* Prev arrow */}
              <button type="button" onClick={() => setCurrentMonth(prev => subMonths(prev, 1))} disabled={!canGoPrev}
                className={cn("mt-1 p-2 rounded-full hover:bg-gray-100 transition-colors flex-shrink-0",
                  !canGoPrev && "opacity-20 cursor-not-allowed")} aria-label="Previous month">
                <ChevronLeft className="h-5 w-5 text-gray-600" />
              </button>

              {/* Month grids */}
              <div className={cn("flex-1 min-w-0", isMobile ? "flex flex-col gap-6" : "flex gap-10")}>
                <MonthGrid month={currentMonth} departDate={departDate} returnDate={returnDate} tripType={tripType} onDayClick={handleDayClick} today={today} />
                {!isMobile && <MonthGrid month={nextMonth} departDate={departDate} returnDate={returnDate} tripType={tripType} onDayClick={handleDayClick} today={today} />}
              </div>

              {/* Next arrow */}
              <button type="button" onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}
                className="mt-1 p-2 rounded-full hover:bg-gray-100 transition-colors flex-shrink-0" aria-label="Next month">
                <ChevronRight className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          </div>
        </>
      ) : (
        /* ── Flexible dates tab ── */
        <div className="px-6 py-6 max-w-md mx-auto space-y-5">
          <div>
            <p className="text-sm font-semibold text-gray-900 mb-3">Departure flexibility</p>
            <div className="space-y-2.5">
              <FlexStepper label="Days before" value={departFlexBefore} onChange={onDepartFlexBeforeChange} />
              <FlexStepper label="Days after" value={departFlexAfter} onChange={onDepartFlexAfterChange} />
            </div>
          </div>
          {tripType === "roundtrip" && (
            <div>
              <div className="h-px bg-gray-200 mb-4" />
              <p className="text-sm font-semibold text-gray-900 mb-3">Return flexibility</p>
              <div className="space-y-2.5">
                <FlexStepper label="Days before" value={returnFlexBefore} onChange={onReturnFlexBeforeChange} />
                <FlexStepper label="Days after" value={returnFlexAfter} onChange={onReturnFlexAfterChange} />
              </div>
            </div>
          )}
          <button type="button" onClick={handleResetFlex}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
            Reset all
          </button>
        </div>
      )}

      {/* ── Footer ── */}
      <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 bg-gray-50/40">
        <Button type="button" variant="ghost" onClick={handleClear} className="text-sm text-gray-500 hover:text-gray-800">
          Clear dates
        </Button>
        <Button type="button" onClick={onDone} className="px-8 rounded-full">
          Done
        </Button>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════
   DEFAULT EXPORT — kept for backward compat
   (Trigger-only component for segment mode)
   ═══════════════════════════════════════════ */
interface FlightDateRangePickerProps {
  departDate: Date | null;
  returnDate: Date | null;
  onDepartChange: (date: Date | null) => void;
  onReturnChange: (date: Date | null) => void;
  tripType: "roundtrip" | "oneway";
  onTripTypeChange: (type: "roundtrip" | "oneway") => void;
  hasError?: boolean;
  bare?: boolean;
  segmentMode?: boolean;
  segmentLabel?: string;
  segmentDisplay?: string;
  onOpenCalendar?: () => void;
}

const FlightDateRangePicker: React.FC<FlightDateRangePickerProps> = ({
  segmentLabel, segmentDisplay, departDate, onOpenCalendar,
}) => {
  return (
    <button
      type="button"
      onClick={onOpenCalendar}
      className="w-full h-full text-left flex flex-col justify-center cursor-pointer focus:outline-none relative z-30 pointer-events-auto"
    >
      <span className="block text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-[0.12em] leading-none">{segmentLabel}</span>
      <span className={cn(
        "block text-[14px] leading-[20px] mt-1.5 whitespace-nowrap",
        departDate ? "font-semibold text-foreground" : "font-normal text-muted-foreground/40"
      )}>
        {segmentDisplay}
      </span>
    </button>
  );
};

export default React.memo(FlightDateRangePicker);
