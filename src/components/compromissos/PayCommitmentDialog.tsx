import { useState, useMemo } from "react";
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
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Commitment } from "@/hooks/useCommitments";
import { Bank } from "@/types/finance";

interface PayCommitmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commitment: Commitment | null;
  banks: Bank[];
  onConfirm: (data: {
    commitment: Commitment;
    count: number;
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
  onConfirm,
  isLoading = false,
}: PayCommitmentDialogProps) => {
  const [count, setCount] = useState(1);
  const [bankId, setBankId] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [discount, setDiscount] = useState("");
  const [createTransaction, setCreateTransaction] = useState(false);

  const maxCount = commitment?.remainingCount || 1;
  
  const totalAmount = useMemo(() => {
    if (!commitment) return 0;
    return commitment.monthlyAmount * count;
  }, [commitment, count]);

  const discountValue = parseFloat(discount) || 0;
  const finalAmount = totalAmount - discountValue;

  const handleSubmit = () => {
    if (!commitment) return;
    // bankId is only required when createTransaction is true
    if (createTransaction && !bankId) return;

    onConfirm({
      commitment,
      count,
      bankId: createTransaction ? bankId : "",
      paymentDate: new Date(paymentDate),
      discount: discountValue,
      createTransaction,
    });
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setCount(1);
      setBankId("");
      setPaymentDate(new Date().toISOString().split("T")[0]);
      setDiscount("");
      setCreateTransaction(false);
    }
    onOpenChange(isOpen);
  };

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

        <div className="space-y-6">
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

          {/* Count Selector */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Quantas parcelas pagar?</Label>
              <span className="text-lg font-bold">{count}</span>
            </div>
            <Slider
              value={[count]}
              onValueChange={(value) => setCount(value[0])}
              min={1}
              max={maxCount}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1 parcela</span>
              <span>{maxCount} parcelas (todas)</span>
            </div>
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

          {/* Bank Selection - only shown when createTransaction is true */}
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

          {/* Discount (optional) */}
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
              <span>Valor das parcelas ({count}x)</span>
              <span>{formatCurrency(totalAmount)}</span>
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
            disabled={(createTransaction && !bankId) || isLoading}
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
