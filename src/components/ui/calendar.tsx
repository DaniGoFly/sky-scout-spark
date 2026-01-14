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
        caption: "flex justify-center pt-1 relative items-center mb-2",
        caption_label: "text-base font-semibold bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          "h-8 w-8 bg-gradient-to-br from-primary/10 to-purple-500/10 p-0 opacity-70 hover:opacity-100 rounded-full transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-primary/20 inline-flex items-center justify-center border border-primary/20 hover:border-primary/40",
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
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
        day: cn(
          "h-10 w-10 sm:h-11 sm:w-11 p-0 font-medium rounded-full transition-all duration-300 hover:scale-110",
          "hover:bg-gradient-to-br hover:from-primary/20 hover:via-purple-500/20 hover:to-pink-500/20",
          "hover:shadow-lg hover:shadow-primary/10",
          "aria-selected:opacity-100",
          "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-gradient-to-br from-primary via-purple-500 to-pink-500 text-white hover:from-primary hover:via-purple-600 hover:to-pink-600 focus:from-primary focus:via-purple-500 focus:to-pink-500 shadow-lg shadow-primary/30 animate-scale-in",
        day_today: "bg-gradient-to-br from-primary/10 via-purple-500/10 to-pink-500/10 text-foreground font-bold ring-2 ring-primary/30",
        day_outside:
          "day-outside text-muted-foreground/40 opacity-50 aria-selected:bg-gradient-to-br aria-selected:from-primary/50 aria-selected:via-purple-500/50 aria-selected:to-pink-500/50 aria-selected:text-white/70",
        day_disabled: "text-muted-foreground/30 opacity-30 cursor-not-allowed hover:scale-100 hover:bg-transparent",
        day_range_middle: "aria-selected:bg-gradient-to-r aria-selected:from-primary/20 aria-selected:via-purple-500/20 aria-selected:to-pink-500/20 aria-selected:text-foreground rounded-none",
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
