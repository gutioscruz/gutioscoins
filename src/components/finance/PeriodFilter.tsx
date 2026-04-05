import { useMemo } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PeriodFilterProps {
  startDate: Date | undefined;
  endDate: Date | undefined;
  onPeriodChange: (start: Date | undefined, end: Date | undefined) => void;
}

export const PeriodFilter = ({ startDate, onPeriodChange }: PeriodFilterProps) => {
  // Generate list of months: 12 past + current + 12 future
  const monthOptions = useMemo(() => {
    const options: { value: string; label: string; date: Date }[] = [];
    const now = new Date();
    
    // 12 months in the past
    for (let i = 12; i >= 1; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = format(date, "MMMM", { locale: ptBR });
      const year = format(date, "yy");
      const label = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} '${year}`;
      options.push({ value, label, date });
    }
    
    // Current month
    const currentValue = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const currentMonthName = format(now, "MMMM", { locale: ptBR });
    const currentYear = format(now, "yy");
    options.push({ 
      value: currentValue, 
      label: `${currentMonthName.charAt(0).toUpperCase() + currentMonthName.slice(1)} '${currentYear}`,
      date: new Date(now.getFullYear(), now.getMonth(), 1)
    });
    
    // 12 months in the future
    for (let i = 1; i <= 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = format(date, "MMMM", { locale: ptBR });
      const year = format(date, "yy");
      const label = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} '${year}`;
      options.push({ value, label, date });
    }
    
    return options;
  }, []);

  const currentValue = startDate 
    ? `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`
    : monthOptions.find(opt => {
        const now = new Date();
        return opt.date.getFullYear() === now.getFullYear() && opt.date.getMonth() === now.getMonth();
      })?.value || "";

  const handleMonthChange = (value: string) => {
    const selected = monthOptions.find(opt => opt.value === value);
    if (selected) {
      onPeriodChange(startOfMonth(selected.date), endOfMonth(selected.date));
    }
  };

  const currentLabel = monthOptions.find(opt => opt.value === currentValue)?.label || "Selecione";

  return (
    <Select value={currentValue} onValueChange={handleMonthChange}>
      <SelectTrigger className="w-[160px]">
        <SelectValue>{currentLabel}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {monthOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
