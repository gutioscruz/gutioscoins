import { useState, useEffect, useMemo } from "react";
import { CheckCircle2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loan, LoanPayment } from "@/types/finance";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface BulkMarkPaidDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loan: Loan | null;
  onConfirm: (data: {
    loanId: string;
    payments: Array<{ id: string; paid: boolean; paidDate: Date | null }>;
  }) => void;
  isLoading?: boolean;
}

interface PaymentState {
  id: string;
  checked: boolean;
  paidDate: string;
  originalPaid: boolean;
}

export const BulkMarkPaidDialog = ({
  open,
  onOpenChange,
  loan,
  onConfirm,
  isLoading = false,
}: BulkMarkPaidDialogProps) => {
  const [paymentStates, setPaymentStates] = useState<PaymentState[]>([]);

  const sortedPayments = useMemo(() => {
    if (!loan) return [];
    return [...loan.payments].sort((a, b) => a.installmentNumber - b.installmentNumber);
  }, [loan]);

  useEffect(() => {
    if (loan && open) {
      const today = new Date();
      setPaymentStates(
        sortedPayments.map((p) => ({
          id: p.id,
          checked: p.paid,
          paidDate: p.paid && p.paidDate
            ? format(new Date(p.paidDate), "yyyy-MM-dd")
            : !p.paid && new Date(p.dueDate) <= today
              ? format(new Date(p.dueDate), "yyyy-MM-dd")
              : "",
          originalPaid: p.paid,
        }))
      );
    }
  }, [loan, open, sortedPayments]);

  const togglePayment = (idx: number) => {
    setPaymentStates((prev) => {
      const next = [...prev];
      next[idx] = {
        ...next[idx],
        checked: !next[idx].checked,
        paidDate: !next[idx].checked && !next[idx].paidDate
          ? format(new Date(), "yyyy-MM-dd")
          : next[idx].paidDate,
      };
      return next;
    });
  };

  const setPaymentDate = (idx: number, date: string) => {
    setPaymentStates((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], paidDate: date };
      return next;
    });
  };

  const hasChanges = paymentStates.some(
    (ps, i) => ps.checked !== sortedPayments[i]?.paid
  );

  const handleConfirm = () => {
    if (!loan) return;
    const changedPayments = paymentStates
      .filter((ps, i) => ps.checked !== sortedPayments[i]?.paid)
      .map((ps) => ({
        id: ps.id,
        paid: ps.checked,
        paidDate: ps.checked && ps.paidDate
          ? new Date(ps.paidDate + "T00:00:00.000Z")
          : null,
      }));

    onConfirm({ loanId: loan.id, payments: changedPayments });
  };

  const selectAllOverdue = () => {
    const today = new Date();
    setPaymentStates((prev) =>
      prev.map((ps, i) => {
        const payment = sortedPayments[i];
        if (!payment) return ps;
        const isOverdue = new Date(payment.dueDate) <= today;
        if (isOverdue && !ps.checked) {
          return {
            ...ps,
            checked: true,
            paidDate: ps.paidDate || format(new Date(payment.dueDate), "yyyy-MM-dd"),
          };
        }
        return ps;
      })
    );
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  if (!loan) return null;

  const checkedCount = paymentStates.filter((p) => p.checked).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] rounded-3xl bg-card/95 backdrop-blur-xl border-white/10">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Atualizar Histórico — {loan.name}
          </DialogTitle>
          <DialogDescription>
            Marque as parcelas já pagas e informe a data do pagamento. Sem criação de transação financeira.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between py-2">
          <p className="text-sm text-muted-foreground">
            <span className="font-bold text-foreground">{checkedCount}</span> de {sortedPayments.length} marcadas
          </p>
          <Button variant="outline" size="sm" className="rounded-xl text-xs" onClick={selectAllOverdue}>
            Marcar vencidas
          </Button>
        </div>

        <ScrollArea className="max-h-[400px] pr-4">
          <div className="space-y-2">
            {sortedPayments.map((payment, idx) => {
              const state = paymentStates[idx];
              if (!state) return null;
              const isOverdue = new Date(payment.dueDate) < new Date() && !state.checked;

              return (
                <div
                  key={payment.id}
                  className={`flex items-center gap-3 p-3 rounded-2xl transition-colors ${
                    state.checked
                      ? "bg-primary/10 ring-1 ring-primary/20"
                      : isOverdue
                        ? "bg-destructive/10 ring-1 ring-destructive/20"
                        : "bg-muted/30"
                  }`}
                >
                  <Checkbox
                    checked={state.checked}
                    onCheckedChange={() => togglePayment(idx)}
                    className="shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      Parcela {payment.installmentNumber}/{loan.installments}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Vence {format(new Date(payment.dueDate), "dd/MM/yyyy", { locale: ptBR })}
                      {" · "}
                      <span className="font-semibold tabular-nums">{formatCurrency(payment.amount)}</span>
                    </p>
                  </div>
                  {state.checked && (
                    <div className="shrink-0 flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        type="date"
                        value={state.paidDate}
                        onChange={(e) => setPaymentDate(idx, e.target.value)}
                        className="w-[130px] h-8 text-xs rounded-lg"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!hasChanges || isLoading}
            className="rounded-xl"
          >
            {isLoading ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};