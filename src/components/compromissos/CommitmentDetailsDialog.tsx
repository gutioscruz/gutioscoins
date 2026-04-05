import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  CreditCard, 
  Landmark, 
  Calendar, 
  Check, 
  Clock,
  TrendingDown 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Commitment } from "@/hooks/useCommitments";
import { InstallmentGroup } from "@/hooks/useInstallments";
import { Loan } from "@/types/finance";

interface CommitmentDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commitment: Commitment | null;
  installmentGroup?: InstallmentGroup;
  loan?: Loan;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export const CommitmentDetailsDialog = ({
  open,
  onOpenChange,
  commitment,
  installmentGroup,
  loan,
}: CommitmentDetailsDialogProps) => {
  if (!commitment) return null;

  const Icon = commitment.kind === "installment" ? CreditCard : Landmark;
  const progress = ((commitment.totalCount - commitment.remainingCount) / commitment.totalCount) * 100;

  // Get installments list based on type
  const installmentsList = commitment.kind === "installment" && installmentGroup
    ? installmentGroup.installments.map(inst => ({
        number: inst.installmentNumber,
        dueDate: inst.date,
        amount: inst.amount,
        paid: inst.isPaid,
        paidDate: inst.isPaid ? inst.date : undefined,
      }))
    : loan?.payments?.map(p => ({
        number: p.installmentNumber,
        dueDate: p.dueDate,
        amount: p.amount,
        paid: p.paid,
        paidDate: p.paidDate,
      })) || [];

  // Sort by installment number
  const sortedInstallments = [...installmentsList].sort((a, b) => a.number - b.number);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            Detalhes do Compromisso
          </DialogTitle>
          <DialogDescription>
            {commitment.title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary Card */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">Origem</p>
              <p className="font-medium">{commitment.origin}</p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">Categoria</p>
              <p className="font-medium">{commitment.categoryName || "—"}</p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">Valor Mensal</p>
              <p className="font-medium">{formatCurrency(commitment.monthlyAmount)}</p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">Restante</p>
              <p className="font-medium text-expense">{formatCurrency(commitment.remainingAmount)}</p>
            </div>
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progresso</span>
              <span className="font-medium">
                {commitment.totalCount - commitment.remainingCount} de {commitment.totalCount} parcelas pagas
              </span>
            </div>
            <Progress value={progress} className="h-3" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Pago: {formatCurrency(commitment.paidAmount)}</span>
              <span>{progress.toFixed(0)}%</span>
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Próximo Vencimento</span>
            </div>
            {commitment.nextDueDate ? (
              <p className="text-lg font-bold">
                {format(commitment.nextDueDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            ) : (
              <p className="text-muted-foreground">Nenhuma parcela pendente</p>
            )}
          </div>

          {/* Installments List */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Histórico de Parcelas
            </h4>
            <ScrollArea className="h-[200px] rounded-md border">
              <div className="p-2 space-y-1">
                {sortedInstallments.map((inst) => (
                  <div
                    key={inst.number}
                    className={`flex items-center justify-between p-2 rounded-lg ${
                      inst.paid ? "bg-income/10" : "bg-muted"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {inst.paid ? (
                        <div className="w-6 h-6 rounded-full bg-income/20 flex items-center justify-center">
                          <Check className="h-4 w-4 text-income" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-muted-foreground/20 flex items-center justify-center">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-sm">
                          Parcela {inst.number}/{commitment.totalCount}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Vencimento: {format(inst.dueDate, "dd/MM/yyyy")}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(inst.amount)}</p>
                      {inst.paid && (
                        <Badge variant="outline" className="text-xs text-income border-income">
                          Paga
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
