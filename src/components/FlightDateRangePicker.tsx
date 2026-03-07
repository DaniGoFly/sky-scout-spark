import React, { useState, useCallback, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isBefore, isAfter, startOfDay, getDay } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

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
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

// Memoized day cell to prevent unnecessary re-renders
const DayCell = React.memo(({ 
  day, 
  isStart, 
  isEnd, 
  isInRange, 
  isDisabled,
  onClick 
}: {
  day: Date;
  isStart: boolean;
  isEnd: boolean;
  isInRange: boolean;
  isDisabled: boolean;
  onClick: () => void;
}) => {
  return (
    <button
      type="button"
      disabled={isDisabled}
      onClick={onClick}
      className={cn(
        "relative h-10 w-full max-w-10 text-sm font-medium transition-colors rounded-full",
        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        isDisabled && "text-muted-foreground/40 cursor-not-allowed",
        !isDisabled && !isStart && !isEnd && !isInRange && "hover:bg-secondary",
        isInRange && !isStart && !isEnd && "bg-primary/20 rounded-none",
        (isStart || isEnd) && "bg-primary text-primary-foreground",
        isStart && isInRange && "rounded-l-full rounded-r-none",
        isEnd && isInRange && "rounded-r-full rounded-l-none",
        isStart && !isInRange && "rounded-full",
        isEnd && !isInRange && "rounded-full"
      )}
    >
      {day.getDate()}
    </button>
  );
});

DayCell.displayName = "DayCell";

// Memoized month grid
const MonthGrid = React.memo(({ 
  month, 
  departDate, 
  returnDate, 
  tripType,
  onDayClick,
  today
}: {
  month: Date;
  departDate: Date | null;
  returnDate: Date | null;
  tripType: "roundtrip" | "oneway";
  onDayClick: (day: Date) => void;
  today: Date;
}) => {
  const days = useMemo(() => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    return eachDayOfInterval({ start, end });
  }, [month]);

  const startDayOfWeek = useMemo(() => getDay(startOfMonth(month)), [month]);

  const paddingDays = useMemo(() => {
    return Array.from({ length: startDayOfWeek }, (_, i) => i);
  }, [startDayOfWeek]);

  return (
    <div className="p-2">
      <h3 className="text-center font-semibold text-foreground mb-4">
        {format(month, "MMMM yyyy")}
      </h3>
      
      <div className="grid grid-cols-7 gap-1 mb-2">
        {WEEKDAYS.map((day) => (
          <div key={day} className="h-8 flex items-center justify-center text-xs font-medium text-muted-foreground">
            {day}
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 gap-1">
        {paddingDays.map((i) => (
          <div key={`pad-${i}`} className="h-10" />
        ))}
        
        {days.map((day) => {
          const isDisabled = isBefore(day, today);
          
          // Only highlight selected dates, not today
          const isStart = departDate ? isSameDay(day, departDate) : false;
          const isEnd = tripType === "roundtrip" && returnDate ? isSameDay(day, returnDate) : false;
          
          // Calculate if day is in range between depart and return
          const isInRange = tripType === "roundtrip" && 
            departDate && 
            returnDate && 
            (isAfter(day, departDate) && isBefore(day, returnDate));

          // Include start/end in range styling for proper rounded corners
          const showRangeStyle = isInRange || (isStart && returnDate && tripType === "roundtrip" && !isSameDay(departDate!, returnDate)) || (isEnd && departDate && tripType === "roundtrip" && !isSameDay(departDate, returnDate!));

          return (
            <DayCell
              key={day.toISOString()}
              day={day}
              isStart={isStart}
              isEnd={isEnd}
              isInRange={showRangeStyle}
              isDisabled={isDisabled}
              onClick={() => !isDisabled && onDayClick(day)}
            />
          );
        })}
      </div>
    </div>
  );
});

MonthGrid.displayName = "MonthGrid";

const FlightDateRangePicker: React.FC<FlightDateRangePickerProps> = ({
  departDate,
  returnDate,
  onDepartChange,
  onReturnChange,
  tripType,
  onTripTypeChange,
  hasError,
  bare = false,
  segmentMode = false,
  segmentLabel,
  segmentDisplay,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [selectingReturn, setSelectingReturn] = useState(false);
  const isMobile = useIsMobile();
  
  const today = useMemo(() => startOfDay(new Date()), []);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Handle click outside
  useEffect(() => {
    if (!isOpen) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-date-picker]")) {
        setIsOpen(false);
      }
    };
    
    // Delay to prevent immediate close on open click
    const timeout = setTimeout(() => {
      document.addEventListener("click", handleClickOutside);
    }, 100);
    
    return () => {
      clearTimeout(timeout);
      document.removeEventListener("click", handleClickOutside);
    };
  }, [isOpen]);

  const handleDayClick = useCallback((day: Date) => {
    if (tripType === "oneway") {
      onDepartChange(day);
      setIsOpen(false);
      return;
    }
    
    if (!selectingReturn || !departDate) {
      // Starting new selection - set depart, clear return
      onDepartChange(day);
      onReturnChange(null);
      setSelectingReturn(true);
    } else {
      if (isBefore(day, departDate) || isSameDay(day, departDate)) {
        // User clicked before or on depart, treat as new depart date
        onDepartChange(day);
        onReturnChange(null);
        // Keep selectingReturn true to continue selection
      } else {
        // Valid return date
        onReturnChange(day);
        setSelectingReturn(false);
        setIsOpen(false);
      }
    }
  }, [tripType, selectingReturn, departDate, onDepartChange, onReturnChange]);

  const handlePrevMonth = useCallback(() => {
    setCurrentMonth(prev => subMonths(prev, 1));
  }, []);

  const handleNextMonth = useCallback(() => {
    setCurrentMonth(prev => addMonths(prev, 1));
  }, []);

  const handleClear = useCallback(() => {
    onDepartChange(null);
    onReturnChange(null);
    setSelectingReturn(false);
    setCurrentMonth(startOfMonth(new Date()));
  }, [onDepartChange, onReturnChange]);

  const handleDone = useCallback(() => {
    setIsOpen(false);
    setSelectingReturn(false);
  }, []);

  const toggleOpen = useCallback(() => {
    setIsOpen(prev => !prev);
    if (!isOpen) {
      // When opening, show month of departure date or current month
      setCurrentMonth(departDate ? startOfMonth(departDate) : startOfMonth(new Date()));
      // If we have depart but no return, we're selecting return
      setSelectingReturn(!!departDate && !returnDate && tripType === "roundtrip");
    }
  }, [isOpen, departDate, returnDate, tripType]);

  const nextMonth = useMemo(() => addMonths(currentMonth, 1), [currentMonth]);
  
  const canGoPrev = useMemo(() => !isBefore(subMonths(currentMonth, 1), startOfMonth(today)), [currentMonth, today]);

  const displayText = useMemo(() => {
    if (!departDate) {
      return tripType === "roundtrip" ? "Any day • Any length" : "Any day";
    }
    if (tripType === "oneway") {
      return format(departDate, "MMM d, yyyy");
    }
    if (!returnDate) {
      return `${format(departDate, "MMM d")} - Select return`;
    }
    return `${format(departDate, "MMM d")} - ${format(returnDate, "MMM d, yyyy")}`;
  }, [departDate, returnDate, tripType]);

  // No position calculation needed — calendar is always viewport-centered

  return (
    <div className="relative" data-date-picker>
      {/* Trigger Button */}
      {segmentMode ? (
        <button
          type="button"
          onClick={toggleOpen}
          className="w-full h-full text-left px-4 flex flex-col justify-center cursor-pointer focus:outline-none hover:bg-[hsl(220_20%_96%)] transition-colors"
        >
          <span className="block text-[11px] font-semibold text-foreground/50 leading-[14px] h-[14px] mb-0.5">{segmentLabel}</span>
          <span className={cn("block text-[15px] leading-[20px] font-medium truncate", departDate ? "text-foreground" : "text-muted-foreground")}>
            {segmentDisplay}
          </span>
        </button>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={toggleOpen}
          className={cn(
            bare
              ? "w-full h-[36px] justify-start text-left font-medium bg-transparent border-0 rounded-none hover:bg-secondary/30 transition-all text-sm p-0 px-2"
              : "w-full h-[42px] justify-start text-left font-medium bg-secondary/40 border rounded-lg hover:bg-secondary/60 hover:border-primary/50 transition-all text-sm",
            hasError && !bare ? "border-destructive" : !bare ? "border-border/60" : "",
            isOpen && !bare && "border-primary bg-secondary/60"
          )}
        >
          {!bare && <Calendar className="mr-2 h-4 w-4 text-muted-foreground shrink-0" />}
          <span className={cn("truncate text-xs", !departDate && "text-muted-foreground")}>{displayText}</span>
        </Button>
      )}

      {/* Calendar Portal — rendered to document.body for viewport safety */}
      {isOpen && createPortal(
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[9998]"
            onClick={() => setIsOpen(false)}
          />

          {/* Calendar Dropdown - Always centered in viewport */}
          <div 
            data-date-picker
            className={cn(
              "fixed z-[9999] bg-card border border-border rounded-2xl shadow-xl",
              "animate-in fade-in-0 zoom-in-95 duration-200",
              "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
            )}
            style={{ 
              width: isMobile ? "min(95vw, 420px)" : "min(720px, calc(100vw - 24px))",
              maxHeight: isMobile ? "85vh" : "min(520px, calc(100vh - 24px))",
              overflowY: "auto",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card z-10 rounded-t-2xl">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onTripTypeChange("roundtrip")}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                    tripType === "roundtrip" 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  )}
                >
                  Round trip
                </button>
                <button
                  type="button"
                  onClick={() => onTripTypeChange("oneway")}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                    tripType === "oneway" 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  )}
                >
                  One way
                </button>
              </div>
              
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-full hover:bg-secondary transition-colors"
                aria-label="Close calendar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Selection Status */}
            <div className="px-4 py-2 bg-secondary/30 text-sm text-center text-muted-foreground">
              {tripType === "roundtrip" 
                ? (selectingReturn 
                    ? "Select return date" 
                    : "Select departure date")
                : "Select departure date"
              }
            </div>

            {/* Month Navigation */}
            <div className="flex items-center justify-between px-4 pt-2">
              <button
                type="button"
                onClick={handlePrevMonth}
                disabled={!canGoPrev}
                className={cn(
                  "p-2 rounded-full hover:bg-secondary transition-colors",
                  !canGoPrev && "opacity-30 cursor-not-allowed"
                )}
                aria-label="Previous month"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-2 rounded-full hover:bg-secondary transition-colors"
                aria-label="Next month"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            {/* Calendar Grid */}
            <div className={cn(
              "p-2",
              isMobile ? "grid grid-cols-1" : "grid grid-cols-2 gap-4"
            )}>
              <MonthGrid
                month={currentMonth}
                departDate={departDate}
                returnDate={returnDate}
                tripType={tripType}
                onDayClick={handleDayClick}
                today={today}
              />
              
              {!isMobile && (
                <MonthGrid
                  month={nextMonth}
                  departDate={departDate}
                  returnDate={returnDate}
                  tripType={tripType}
                  onDayClick={handleDayClick}
                  today={today}
                />
              )}
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between p-4 border-t border-border sticky bottom-0 bg-card rounded-b-2xl">
              <Button
                type="button"
                variant="ghost"
                onClick={handleClear}
                className="text-sm"
              >
                Clear
              </Button>
              
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={handleDone}
                  className="px-6"
                >
                  Done
                </Button>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
};

export default React.memo(FlightDateRangePicker);
