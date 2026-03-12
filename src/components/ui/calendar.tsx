import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-4 pointer-events-auto", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-6",
        month: "space-y-4",
        caption: "grid grid-cols-[40px_1fr_40px] items-center pt-1 mb-2",
        // Month/year title — Flights Blue, no purple
        caption_label: "text-base font-semibold text-primary text-center justify-self-center whitespace-nowrap",
        nav: "contents",
        // Nav chevrons — blue tint, blue on hover, no absolute positioning
        nav_button: cn(
          "h-8 w-8 bg-primary/10 p-0 opacity-70 hover:opacity-100 rounded-full transition-all duration-200",
          "hover:bg-primary/20 inline-flex items-center justify-center border border-primary/20 hover:border-primary/40",
        ),
        nav_button_previous: "justify-self-center",
        nav_button_next: "justify-self-center",
        table: "w-full border-collapse",
        head_row: "flex",
        head_cell: "text-muted-foreground rounded-md w-10 sm:w-11 font-medium text-xs uppercase tracking-wider",
        row: "flex w-full mt-1",
        cell: cn(
          "relative p-0.5 text-center text-sm focus-within:relative focus-within:z-20",
          "[&:has([aria-selected])]:bg-transparent",
          "[&:has([aria-selected].day-range-end)]:rounded-r-full",
          "[&:has([aria-selected].day-outside)]:bg-transparent",
          "first:[&:has([aria-selected])]:rounded-l-full",
          "last:[&:has([aria-selected])]:rounded-r-full"
        ),
        // Day hover — subtle blue, no purple
        day: cn(
          "h-10 w-10 sm:h-11 sm:w-11 p-0 font-medium rounded-full transition-all duration-200",
          "hover:bg-primary/15 hover:text-foreground",
          "aria-selected:opacity-100",
          "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background"
        ),
        day_range_end: "day-range-end",
        // Selected day — solid blue fill, white text
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary/90 focus:bg-primary shadow-md shadow-primary/30",
        // Today — subtle blue ring, no fill
        day_today: "bg-primary/10 text-foreground font-bold ring-1 ring-primary/40",
        // Outside month days — dimmed
        day_outside:
          "day-outside text-muted-foreground/40 opacity-40 aria-selected:bg-primary/40 aria-selected:text-white/70",
        day_disabled: "text-muted-foreground/30 opacity-30 cursor-not-allowed hover:bg-transparent",
        // Range middle — blue strip
        day_range_middle:
          "aria-selected:bg-primary/20 aria-selected:text-foreground rounded-none",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ..._props }) => <ChevronLeft className="h-4 w-4 text-primary" />,
        IconRight: ({ ..._props }) => <ChevronRight className="h-4 w-4 text-primary" />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
