import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, TrendingDown } from "lucide-react";
import { MonthlyCommitment } from "@/hooks/useInstallments";

interface FutureCommitmentCardProps {
  data: MonthlyCommitment[];
}

export function FutureCommitmentCard({ data }: FutureCommitmentCardProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);

  const nonZeroMonths = data.filter((d) => d.amount > 0);
  const firstFreeMonth = data.findIndex((d) => d.amount === 0);
  const freeMonthLabel =
    firstFreeMonth !== -1 ? data[firstFreeMonth]?.monthLabel : null;

  if (nonZeroMonths.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            Comprometimento de Limite
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-green-500">
            <TrendingDown className="h-5 w-5" />
            <p className="font-medium">Sem comprometimentos futuros!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          Comprometimento de Limite
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {nonZeroMonths.slice(0, 5).map((month) => (
          <div key={month.monthLabel} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-medium">{month.monthLabel}:</span>
              <span className="text-muted-foreground">
                {month.count} parcelamento{month.count !== 1 ? "s" : ""}
              </span>
            </div>
            <span className="font-semibold">{formatCurrency(month.amount)}</span>
          </div>
        ))}

        {nonZeroMonths.length > 5 && (
          <p className="text-sm text-muted-foreground">
            + {nonZeroMonths.length - 5} meses com comprometimento
          </p>
        )}

        {freeMonthLabel && (
          <div className="pt-3 mt-3 border-t">
            <div className="flex items-center gap-2 text-green-500">
              <TrendingDown className="h-4 w-4" />
              <p className="text-sm font-medium">
                Limite liberado a partir de: {freeMonthLabel}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
