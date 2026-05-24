"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

/**
 * Минимальная обёртка над react-day-picker v10.
 * Намеренно не перечисляет внутренние classNames-ключи (они меняются между версиями RDP) —
 * детальную тёмную тему календаря добавим на этапе, где появится date picker.
 */
function Calendar({ className, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      components={{
        Chevron: ({ orientation, className: cls, ...rest }) =>
          orientation === "left" ? (
            <ChevronLeft className={cn("size-4", cls)} {...rest} />
          ) : (
            <ChevronRight className={cn("size-4", cls)} {...rest} />
          ),
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
