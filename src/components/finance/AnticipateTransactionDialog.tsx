import { useState, useMemo } from "react";
import { FastForward, Calendar, Wallet } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Transaction, Bank } from "@/types/finance";
import { useInstallments } from "@/hooks/useInstallments";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AnticipateTransactionDialogProps {
  transaction: Transaction;
  banks: Bank[];
  trigger?: React.ReactNode;
}

export const AnticipateTransactionDialog = ({
  transaction,
  banks,
  trigger,
}: AnticipateTransactionDialogProps) => {
  const [open, setOpen] = useState(false);
  const [selectedBankId, setSelectedBankId] = useState<string>("");
  const [anticipationDate, setAnticipationDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd")
  );
  const [installmentsToAnticipate, setInstallmentsToAnticipate] = useState(1);
  const [discount, setDiscount] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { installmentGroups, anticipateMultipleInstallments, banks: allBanks } = useInstallments();

  // Find the installment group for this transaction
  const installmentGroup = useMemo(() => {
    const groupId = transaction.parentTransactionId || transaction.id;
    return installmentGroups.find((g) => g.id === groupId);
  }, [installmentGroups, transaction]);

  // Get pending installments starting from current one
  const pendingInstallments = useMemo(() => {
    if (!installmentGroup) return [];
    return installmentGroup.installments
      .filter((i) => !i.isPaid)
      .sort((a, b) => a.installmentNumber - b.installmentNumber);
  }, [installmentGroup]);

  const maxInstallments = pendingInstallments.length;

  const totalAmount = useMemo(() => {
    return pendingInstallments
      .slice(0, installmentsToAnticipate)
      .reduce((sum, i) => sum + i.amount, 0);
  }, [pendingInstallments, installmentsToAnticipate]);

  const discountValue = parseFloat(discount) || 0;
  const finalAmount = Math.max(0, totalAmount - discountValue);

  const handleSubmit = async () => {
    if (!selectedBankId) return;

    setIsSubmitting(true);
    try {
      const installmentIds = pendingInstallments
        .slice(0, installmentsToAnticipate)
        .map((i) => i.id);

      await anticipateMultipleInstallments.mutateAsync({
        installmentIds,
        bankId: selectedBankId,
        anticipationDate: new Date(anticipationDate),
      });

      setOpen(false);
      resetForm();
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedBankId("");
    setAnticipationDate(format(new Date(), "yyyy-MM-dd"));
    setInstallmentsToAnticipate(1);
    setDiscount("");
  };

  // Only show for installment transactions with pending installments
  if (!transaction.isInstallment || maxInstallments === 0) {
    return null;
  }

  const availableBanks = banks.length > 0 ? banks : (allBanks || []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                <FastForward className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Antecipar parcelas</p>
            </TooltipContent>
          </Tooltip>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FastForward className="h-5 w-5" />
            Antecipar Parcelas
          </DialogTitle>
          <DialogDescription>
            {installmentGroup?.description || transaction.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current status */}
          <div className="rounded-lg bg-muted/50 p-3">
            <div className="text-sm text-muted-foreground">
              Parcela atual: {transaction.installmentNumber}/{transaction.installmentCount}
            </div>
            <div className="text-sm text-muted-foreground">
              Parcelas pendentes: {maxInstallments}
            </div>
          </div>

          {/* Number of installments to anticipate */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Quantas parcelas antecipar?</Label>
              <span className="text-lg font-semibold">{installmentsToAnticipate}</span>
            </div>
            <Slider
              value={[installmentsToAnticipate]}
              onValueChange={([value]) => setInstallmentsToAnticipate(value)}
              min={1}
              max={maxInstallments}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1 parcela</span>
              <span>{maxInstallments} parcelas</span>
            </div>
          </div>

          {/* Bank selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Débito da conta
            </Label>
            <Select value={selectedBankId} onValueChange={setSelectedBankId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o banco" />
              </SelectTrigger>
              <SelectContent>
                {availableBanks.map((bank) => (
                  <SelectItem key={bank.id} value={bank.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: bank.color }}
                      />
                      {bank.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Anticipation date */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Data da antecipação
            </Label>
            <Input
              type="date"
              value={anticipationDate}
              onChange={(e) => setAnticipationDate(e.target.value)}
            />
          </div>

          {/* Discount */}
          <div className="space-y-2">
            <Label>Desconto (opcional)</Label>
            <Input
              type="number"
              placeholder="0,00"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              min={0}
              step={0.01}
            />
          </div>

          {/* Summary */}
          <div className="rounded-lg border bg-card p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Valor original:</span>
              <span>{formatCurrency(totalAmount)}</span>
            </div>
            {discountValue > 0 && (
              <div className="flex justify-between text-sm text-income">
                <span>Desconto:</span>
                <span>- {formatCurrency(discountValue)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-lg pt-2 border-t">
              <span>Total a pagar:</span>
              <span className="text-expense">{formatCurrency(finalAmount)}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedBankId || isSubmitting}
          >
            {isSubmitting ? "Processando..." : "Confirmar Antecipação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
