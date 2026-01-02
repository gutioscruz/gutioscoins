import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Flag, CheckCircle2, Clock } from "lucide-react";
import { format, differenceInMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { InstallmentGroup } from "@/hooks/useInstallments";

interface EndProjectionCardProps {
  groups: InstallmentGroup[];
}

export function EndProjectionCard({ groups }: EndProjectionCardProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);

  const today = new Date();

  const sortedGroups = [...groups].sort(
    (a, b) => a.endDate.getTime() - b.endDate.getTime()
  );

  const nextToEnd = sortedGroups.slice(0, 5);

  // Calculate the next installment to end and how much limit will be freed
  const closestEnd = sortedGroups[0];
  const monthsUntilFirst = closestEnd
    ? differenceInMonths(closestEnd.endDate, today)
    : null;

  if (groups.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Flag className="h-5 w-5 text-primary" />
            Próximos Términos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-green-500">
            <CheckCircle2 className="h-5 w-5" />
            <p className="font-medium">Nenhum parcelamento ativo!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Flag className="h-5 w-5 text-primary" />
          Próximos Términos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {nextToEnd.map((group) => {
          const monthsRemaining = differenceInMonths(group.endDate, today);

          return (
            <div
              key={group.id}
              className="flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                {monthsRemaining <= 2 ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                ) : (
                  <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <span className="truncate font-medium">{group.description}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-sm text-muted-foreground">
                  {group.remainingCount} parc.
                </span>
                <span className="text-sm font-medium">
                  {format(group.endDate, "MMM/yy", { locale: ptBR })}
                </span>
              </div>
            </div>
          );
        })}

        {closestEnd && monthsUntilFirst !== null && (
          <div className="pt-3 mt-3 border-t">
            <p className="text-sm text-muted-foreground">
              Próximo limite liberado:{" "}
              <span className="font-semibold text-foreground">
                {formatCurrency(closestEnd.installmentAmount)}/mês
              </span>{" "}
              a partir de{" "}
              <span className="font-semibold text-foreground">
                {format(closestEnd.endDate, "MMM/yy", { locale: ptBR })}
              </span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
