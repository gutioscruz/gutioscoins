import { useState, useMemo, useEffect } from "react";
import { CreditCard, Landmark, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Commitment } from "@/hooks/useCommitments";
import { InstallmentGroup } from "@/hooks/useInstallments";
import { Loan } from "@/types/finance";
import { Bank } from "@/types/finance";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PayableItem {
  id: string;
  label: string;
  dateLabel: string;
  amount: number;
}

interface PayCommitmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commitment: Commitment | null;
  banks: Bank[];
  installmentGroup?: InstallmentGroup;
  loan?: Loan;
  onConfirm: (data: {
    commitment: Commitment;
    selectedIds: string[];
    bankId: string;
    paymentDate: Date;
    discount: number;
    createTransaction: boolean;
  }) => void;
  isLoading?: boolean;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export const PayCommitmentDialog = ({
  open,
  onOpenChange,
  commitment,
  banks,
  installmentGroup,
  loan,
  onConfirm,
  isLoading = false,
}: PayCommitmentDialogProps) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bankId, setBankId] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [discount, setDiscount] = useState("");
  const [createTransaction, setCreateTransaction] = useState(false);

  // Build list of payable items from installmentGroup or loan
  const payableItems = useMemo<PayableItem[]>(() => {
    if (commitment?.kind === "installment" && installmentGroup) {
      return installmentGroup.installments
        .filter((i) => !i.isPaid)
        .sort((a, b) => a.installmentNumber - b.installmentNumber)
        .map((i) => ({
          id: i.id,
          label: `Parcela ${i.installmentNumber}/${installmentGroup.totalCount}`,
          dateLabel: format(i.date, "dd/MM/yyyy", { locale: ptBR }),
          amount: i.amount,
        }));
    }
    if (commitment?.kind === "loan" && loan) {
      return (loan.payments || [])
        .filter((p) => !p.paid)
        .sort((a, b) => a.installmentNumber - b.installmentNumber)
        .map((p) => ({
          id: p.id,
          label: `Parcela ${p.installmentNumber}/${loan.installments}`,
          dateLabel: format(p.dueDate, "dd/MM/yyyy", { locale: ptBR }),
          amount: p.amount,
        }));
    }
    return [];
  }, [commitment, installmentGroup, loan]);

  const selectedTotal = useMemo(() => {
    return payableItems
      .filter((item) => selectedIds.has(item.id))
      .reduce((sum, item) => sum + item.amount, 0);
  }, [payableItems, selectedIds]);

  const discountValue = parseFloat(discount) || 0;
  const finalAmount = selectedTotal - discountValue;

  const toggleItem = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(payableItems.map((i) => i.id)));
  };

  const clearAll = () => {
    setSelectedIds(new Set());
  };

  const handleSubmit = () => {
    if (!commitment || selectedIds.size === 0) return;
    if (createTransaction && !bankId) return;

    onConfirm({
      commitment,
      selectedIds: Array.from(selectedIds),
      bankId: createTransaction ? bankId : "",
      paymentDate: new Date(paymentDate),
      discount: discountValue,
      createTransaction,
    });
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setSelectedIds(new Set());
      setBankId("");
      setPaymentDate(new Date().toISOString().split("T")[0]);
      setDiscount("");
      setCreateTransaction(false);
    }
    onOpenChange(isOpen);
  };

  // Reset selection when commitment changes
  useEffect(() => {
    setSelectedIds(new Set());
  }, [commitment?.id]);

  if (!commitment) return null;

  const Icon = commitment.kind === "installment" ? CreditCard : Landmark;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            Pagar {commitment.kind === "installment" ? "Parcelas" : "Prestações"}
          </DialogTitle>
          <DialogDescription>
            {commitment.title} - {commitment.origin}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Status */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Pendentes</p>
              <p className="font-medium">
                {commitment.remainingCount} de {commitment.totalCount}
              </p>
            </div>
            <Badge variant="outline">
              {formatCurrency(commitment.monthlyAmount)}/parcela
            </Badge>
          </div>

          {/* Installment Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Selecione as parcelas</Label>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={selectAll} className="h-7 text-xs">
                  Selecionar Todas
                </Button>
                <Button variant="ghost" size="sm" onClick={clearAll} className="h-7 text-xs">
                  Limpar
                </Button>
              </div>
            </div>

            <ScrollArea className="h-[200px] pr-4 border rounded-lg">
              <div className="space-y-1 p-2">
                {payableItems.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 p-2.5 rounded-md cursor-pointer transition-colors ${
                      selectedIds.has(item.id)
                        ? "bg-primary/10 border border-primary/30"
                        : "hover:bg-muted/50 border border-transparent"
                    }`}
                    onClick={() => toggleItem(item.id)}
                  >
                    <Checkbox
                      checked={selectedIds.has(item.id)}
                      onCheckedChange={() => toggleItem(item.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.dateLabel}</p>
                    </div>
                    <p className="text-sm font-semibold">{formatCurrency(item.amount)}</p>
                  </div>
                ))}
                {payableItems.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma parcela pendente
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Create Transaction Checkbox */}
          <div className="flex items-center space-x-2 p-3 border rounded-lg">
            <Checkbox
              id="createTransaction"
              checked={createTransaction}
              onCheckedChange={(checked) => setCreateTransaction(checked === true)}
            />
            <div className="grid gap-1.5 leading-none">
              <label
                htmlFor="createTransaction"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Registrar transação financeira
              </label>
              <p className="text-xs text-muted-foreground">
                Cria um débito na conta selecionada. Desmarque para apenas marcar como pago.
              </p>
            </div>
          </div>

          {/* Bank Selection */}
          {createTransaction && (
            <div className="space-y-2">
              <Label htmlFor="bank">Débito de qual conta?</Label>
              <Select value={bankId} onValueChange={setBankId}>
                <SelectTrigger id="bank">
                  <SelectValue placeholder="Selecione a conta" />
                </SelectTrigger>
                <SelectContent>
                  {banks.map((bank) => (
                    <SelectItem key={bank.id} value={bank.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: bank.color }}
                        />
                        {bank.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Payment Date */}
          <div className="space-y-2">
            <Label htmlFor="date">Data do Pagamento</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="date"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Discount */}
          <div className="space-y-2">
            <Label htmlFor="discount">Desconto obtido (opcional)</Label>
            <Input
              id="discount"
              type="number"
              step="0.01"
              placeholder="0,00"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
            />
          </div>

          {/* Summary */}
          <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
            <div className="flex justify-between text-sm">
              <span>{selectedIds.size} parcela(s) selecionada(s)</span>
              <span>{formatCurrency(selectedTotal)}</span>
            </div>
            {discountValue > 0 && (
              <div className="flex justify-between text-sm text-income">
                <span>Desconto</span>
                <span>-{formatCurrency(discountValue)}</span>
              </div>
            )}
            <div className="flex justify-between font-medium text-lg pt-2 border-t">
              <span>Total a pagar</span>
              <span>{formatCurrency(finalAmount)}</span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={selectedIds.size === 0 || (createTransaction && !bankId) || isLoading}
          >
            {isLoading
              ? "Processando..."
              : createTransaction
                ? "Confirmar Pagamento"
                : "Marcar como Pago"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
