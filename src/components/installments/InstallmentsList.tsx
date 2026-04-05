import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Eye, FastForward, CreditCard, Clock, AlertTriangle, Pencil } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { InstallmentGroup } from "@/hooks/useInstallments";
import { formatCurrency } from "@/lib/utils";

interface InstallmentsListProps {
  groups: InstallmentGroup[];
  onViewDetails: (group: InstallmentGroup) => void;
  onAnticipate: (group: InstallmentGroup) => void;
  onPayOff: (group: InstallmentGroup) => void;
  onEdit?: (group: InstallmentGroup) => void;
}

export function InstallmentsList({
  groups,
  onViewDetails,
  onAnticipate,
  onPayOff,
  onEdit,
}: InstallmentsListProps) {
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

  const getUrgencyBadge = (daysUntilNextDue?: number) => {
    if (daysUntilNextDue === undefined) return null;
    
    if (daysUntilNextDue <= 0) {
      return (
        <Badge variant="destructive" className="text-xs gap-1">
          <AlertTriangle className="h-3 w-3" />
          Vence hoje
        </Badge>
      );
    }
    if (daysUntilNextDue <= 7) {
      return (
        <Badge variant="secondary" className="text-xs gap-1 bg-yellow-500/20 text-yellow-700 dark:text-yellow-400">
          <Clock className="h-3 w-3" />
          Vence em {daysUntilNextDue}d
        </Badge>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {groups.map((group) => {
        const progress = (group.paidCount / group.totalCount) * 100;

        return (
          <Card key={group.id} className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-lg">{group.description}</CardTitle>
                    {getUrgencyBadge(group.daysUntilNextDue)}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="text-xs">
                      {group.cardName || group.bankName}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {group.categoryName}
                    </Badge>
                    {group.nextDueDate && (
                      <span className="text-xs text-muted-foreground">
                        Próxima: {format(group.nextDueDate, "dd/MM", { locale: ptBR })}
                      </span>
                    )}
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

              <div className="flex gap-2 pt-2 border-t flex-wrap">
                {onEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(group)}
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                )}
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