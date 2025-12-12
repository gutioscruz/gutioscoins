import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CreditCard, AlertCircle, Wallet } from 'lucide-react';
import { useCardStatements } from '@/hooks/useCardStatements';
import { Card, Bank, CardStatement } from '@/types/finance';

interface PayStatementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  statement: CardStatement;
  card: Card;
  banks: Bank[];
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const PayStatementDialog = ({
  open,
  onOpenChange,
  statement,
  card,
  banks,
}: PayStatementDialogProps) => {
  const remainingAmount = statement.totalAmount - statement.paidAmount;
  
  const [paymentType, setPaymentType] = useState<'full' | 'partial'>('full');
  const [partialAmount, setPartialAmount] = useState(remainingAmount.toString());
  const [selectedBankId, setSelectedBankId] = useState<string>('');

  const { payStatement, isPayingStatement } = useCardStatements(card.id);

  // Filter only checking/savings accounts (not credit cards)
  const availableBanks = banks.filter(b => b.type !== 'credit');

  const handlePay = () => {
    if (!selectedBankId) return;

    const amount = paymentType === 'full' 
      ? remainingAmount 
      : parseFloat(partialAmount) || 0;

    if (amount <= 0) return;
    if (amount > remainingAmount) return;

    payStatement({
      statementId: statement.id,
      amount,
      bankId: selectedBankId,
      cardId: card.id,
      referenceMonth: statement.referenceMonth,
    });

    onOpenChange(false);
  };

  const selectedBank = availableBanks.find(b => b.id === selectedBankId);
  const paymentAmount = paymentType === 'full' 
    ? remainingAmount 
    : parseFloat(partialAmount) || 0;
  
  const hasSufficientBalance = selectedBank 
    ? (selectedBank.balance || 0) >= paymentAmount 
    : true;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Pagar Fatura
          </DialogTitle>
          <DialogDescription>
            Fatura de {format(statement.referenceMonth, "MMMM 'de' yyyy", { locale: ptBR })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Card Info */}
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <div 
              className="p-2 rounded-lg"
              style={{ backgroundColor: `${card.color}20` }}
            >
              <CreditCard className="h-5 w-5" style={{ color: card.color }} />
            </div>
            <div>
              <p className="font-medium">{card.name}</p>
              <p className="text-sm text-muted-foreground">
                Valor restante: {formatCurrency(remainingAmount)}
              </p>
            </div>
          </div>

          {/* Payment Type */}
          <div className="space-y-3">
            <Label>Tipo de Pagamento</Label>
            <RadioGroup 
              value={paymentType} 
              onValueChange={(value) => setPaymentType(value as 'full' | 'partial')}
              className="space-y-2"
            >
              <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="full" id="full" />
                <Label htmlFor="full" className="flex-1 cursor-pointer">
                  <span className="font-medium">Pagamento Total</span>
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(remainingAmount)}
                  </p>
                </Label>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="partial" id="partial" />
                <Label htmlFor="partial" className="flex-1 cursor-pointer">
                  <span className="font-medium">Pagamento Parcial</span>
                </Label>
              </div>
            </RadioGroup>

            {paymentType === 'partial' && (
              <div className="space-y-2 pl-6">
                <Label htmlFor="amount">Valor do Pagamento</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={remainingAmount}
                  value={partialAmount}
                  onChange={(e) => setPartialAmount(e.target.value)}
                  placeholder="0,00"
                />
              </div>
            )}
          </div>

          {/* Bank Selection */}
          <div className="space-y-2">
            <Label htmlFor="bank">Pagar com</Label>
            <Select value={selectedBankId} onValueChange={setSelectedBankId}>
              <SelectTrigger id="bank">
                <SelectValue placeholder="Selecione a conta" />
              </SelectTrigger>
              <SelectContent>
                {availableBanks.map((bank) => (
                  <SelectItem key={bank.id} value={bank.id}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: bank.color }}
                      />
                      <span>{bank.name}</span>
                      <span className="text-muted-foreground">
                        - {formatCurrency(bank.balance || 0)}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Insufficient Balance Warning */}
          {selectedBankId && !hasSufficientBalance && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Saldo insuficiente nesta conta. Saldo: {formatCurrency(selectedBank?.balance || 0)}
              </AlertDescription>
            </Alert>
          )}

          {/* Info Alert */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Ao pagar, o limite usado do cartão será liberado e uma transação de débito será criada na conta selecionada.
            </AlertDescription>
          </Alert>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handlePay}
              disabled={
                !selectedBankId || 
                paymentAmount <= 0 || 
                paymentAmount > remainingAmount ||
                !hasSufficientBalance ||
                isPayingStatement
              }
            >
              {isPayingStatement ? 'Processando...' : `Pagar ${formatCurrency(paymentAmount)}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
