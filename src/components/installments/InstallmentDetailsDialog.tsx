import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, Clock, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { InstallmentGroup } from "@/hooks/useInstallments";

interface InstallmentDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: InstallmentGroup | null;
}

export function InstallmentDetailsDialog({
  open,
  onOpenChange,
  group,
}: InstallmentDetailsDialogProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);

  if (!group) return null;

  const sortedInstallments = [...group.installments].sort(
    (a, b) => a.installmentNumber - b.installmentNumber
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{group.description}</DialogTitle>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="secondary">{group.cardName || group.bankName}</Badge>
            <Badge variant="outline">{group.categoryName}</Badge>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="text-center p-3 bg-muted rounded-lg">
            <p className="text-2xl font-bold">{group.totalCount}</p>
            <p className="text-xs text-muted-foreground">Total de Parcelas</p>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <p className="text-2xl font-bold">{formatCurrency(group.totalAmount)}</p>
            <p className="text-xs text-muted-foreground">Valor Total</p>
          </div>
        </div>

        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-2">
            {sortedInstallments.map((installment) => (
              <div
                key={installment.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  installment.isPaid
                    ? "bg-green-500/10 border-green-500/20"
                    : "bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  {installment.isPaid ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <Clock className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium">
                      Parcela {installment.installmentNumber}/{group.totalCount}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {format(installment.date, "dd/MM/yyyy", { locale: ptBR })}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatCurrency(installment.amount)}</p>
                  <Badge variant={installment.isPaid ? "default" : "secondary"} className="text-xs">
                    {installment.isPaid ? "Pago" : "Pendente"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
