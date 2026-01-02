import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Eye, FastForward, CreditCard } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { InstallmentGroup } from "@/hooks/useInstallments";

interface InstallmentsListProps {
  groups: InstallmentGroup[];
  onViewDetails: (group: InstallmentGroup) => void;
  onAnticipate: (group: InstallmentGroup) => void;
  onPayOff: (group: InstallmentGroup) => void;
}

export function InstallmentsList({
  groups,
  onViewDetails,
  onAnticipate,
  onPayOff,
}: InstallmentsListProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);

  if (groups.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhum parcelamento ativo</h3>
          <p className="text-muted-foreground">
            Quando você tiver compras parceladas, elas aparecerão aqui.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => {
        const progress = (group.paidCount / group.totalCount) * 100;

        return (
          <Card key={group.id} className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{group.description}</CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      {group.cardName || group.bankName}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {group.categoryName}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">
                    {formatCurrency(group.installmentAmount)}
                    <span className="text-sm font-normal text-muted-foreground">/mês</span>
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">
                    {group.paidCount}/{group.totalCount} parcelas pagas
                  </span>
                  <span className="font-medium">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              <div className="flex items-center justify-between text-sm">
                <div>
                  <span className="text-muted-foreground">Restam </span>
                  <span className="font-semibold">{formatCurrency(group.remainingAmount)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Término: </span>
                  <span className="font-medium">
                    {format(group.endDate, "MMM/yyyy", { locale: ptBR })}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewDetails(group)}
                  className="flex-1"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Ver Parcelas
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onAnticipate(group)}
                  className="flex-1"
                >
                  <FastForward className="h-4 w-4 mr-1" />
                  Antecipar
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => onPayOff(group)}
                  className="flex-1"
                >
                  <CreditCard className="h-4 w-4 mr-1" />
                  Quitar
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
