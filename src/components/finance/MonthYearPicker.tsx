import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface MonthYearPickerProps {
  selectedDate: Date;
  onSelect: (start: Date, end: Date) => void;
}

const months = [
  "Janeiro", "Fevereiro", "Março", "Abril",
  "Maio", "Junho", "Julho", "Agosto",
  "Setembro", "Outubro", "Novembro", "Dezembro"
];

export const MonthYearPicker = ({ selectedDate, onSelect }: MonthYearPickerProps) => {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear());

  const handleMonthSelect = (monthIndex: number) => {
    const newDate = new Date(viewYear, monthIndex, 1);
    onSelect(startOfMonth(newDate), endOfMonth(newDate));
    setOpen(false);
  };

  const currentMonth = selectedDate.getMonth();
  const currentYear = selectedDate.getFullYear();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="min-w-[180px] justify-start">
          {format(selectedDate, "MMMM yyyy", { locale: ptBR })}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-3" align="start">
        <div className="space-y-3">
          {/* Year navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewYear(y => y - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-semibold text-foreground">{viewYear}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewYear(y => y + 1)}
              disabled={viewYear >= new Date().getFullYear()}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Month grid */}
          <div className="grid grid-cols-3 gap-2">
            {months.map((month, index) => {
              const isSelected = index === currentMonth && viewYear === currentYear;
              const isFuture = viewYear > new Date().getFullYear() || 
                (viewYear === new Date().getFullYear() && index > new Date().getMonth());
              
              return (
                <Button
                  key={month}
                  variant={isSelected ? "default" : "ghost"}
                  size="sm"
                  disabled={isFuture}
                  className={cn(
                    "h-9 text-sm",
                    isSelected && "bg-primary text-primary-foreground",
                    isFuture && "opacity-50"
                  )}
                  onClick={() => handleMonthSelect(index)}
                >
                  {month.slice(0, 3)}
                </Button>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
