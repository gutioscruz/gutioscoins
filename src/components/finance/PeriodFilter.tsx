import { useState } from "react";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, subYears } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type PeriodPreset = "thisMonth" | "lastMonth" | "last3Months" | "last6Months" | "thisYear" | "lastYear" | "custom";

interface PeriodFilterProps {
  startDate: Date | undefined;
  endDate: Date | undefined;
  onPeriodChange: (start: Date | undefined, end: Date | undefined) => void;
}

export const PeriodFilter = ({ startDate, endDate, onPeriodChange }: PeriodFilterProps) => {
  const [preset, setPreset] = useState<PeriodPreset>("thisMonth");

  const applyPreset = (presetValue: PeriodPreset) => {
    setPreset(presetValue);
    const now = new Date();

    switch (presetValue) {
      case "thisMonth":
        onPeriodChange(startOfMonth(now), endOfMonth(now));
        break;
      case "lastMonth":
        const lastMonth = subMonths(now, 1);
        onPeriodChange(startOfMonth(lastMonth), endOfMonth(lastMonth));
        break;
      case "last3Months":
        onPeriodChange(subMonths(now, 3), now);
        break;
      case "last6Months":
        onPeriodChange(subMonths(now, 6), now);
        break;
      case "thisYear":
        onPeriodChange(startOfYear(now), endOfYear(now));
        break;
      case "lastYear":
        const lastYear = subYears(now, 1);
        onPeriodChange(startOfYear(lastYear), endOfYear(lastYear));
        break;
      case "custom":
        // Mantém as datas atuais
        break;
    }
  };

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <Select value={preset} onValueChange={(v: PeriodPreset) => applyPreset(v)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="thisMonth">Este Mês</SelectItem>
          <SelectItem value="lastMonth">Mês Passado</SelectItem>
          <SelectItem value="last3Months">Últimos 3 Meses</SelectItem>
          <SelectItem value="last6Months">Últimos 6 Meses</SelectItem>
          <SelectItem value="thisYear">Este Ano</SelectItem>
          <SelectItem value="lastYear">Ano Passado</SelectItem>
          <SelectItem value="custom">Personalizado</SelectItem>
        </SelectContent>
      </Select>

      {preset === "custom" && (
        <>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal",
                  !startDate && "text-muted-foreground"
                )}
              >
                <Calendar className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, "PPP", { locale: ptBR }) : "Data inicial"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={startDate}
                onSelect={(date) => onPeriodChange(date, endDate)}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal",
                  !endDate && "text-muted-foreground"
                )}
              >
                <Calendar className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, "PPP", { locale: ptBR }) : "Data final"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={endDate}
                onSelect={(date) => onPeriodChange(startDate, date)}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </>
      )}
    </div>
  );
};
