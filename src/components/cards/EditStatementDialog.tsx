import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CardStatement, CardStatementStatus } from '@/types/finance';
import { useCardStatements } from '@/hooks/useCardStatements';

interface EditStatementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  statement: CardStatement;
  cardId: string;
}

const statusOptions: { value: CardStatementStatus; label: string }[] = [
  { value: 'open', label: 'Aberta' },
  { value: 'closed', label: 'Fechada' },
  { value: 'paid', label: 'Paga' },
  { value: 'partial', label: 'Parcialmente Paga' },
];

export const EditStatementDialog = ({
  open,
  onOpenChange,
  statement,
  cardId,
}: EditStatementDialogProps) => {
  const [closingDate, setClosingDate] = useState<Date>(statement.closingDate);
  const [dueDate, setDueDate] = useState<Date>(statement.dueDate);
  const [status, setStatus] = useState<CardStatementStatus>(statement.status);

  const { updateStatement, isUpdatingStatement } = useCardStatements(cardId);

  useEffect(() => {
    if (statement) {
      setClosingDate(statement.closingDate);
      setDueDate(statement.dueDate);
      setStatus(statement.status);
    }
  }, [statement]);

  const handleSubmit = () => {
    updateStatement({
      statementId: statement.id,
      data: {
        closingDate,
        dueDate,
        status,
      },
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Fatura</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Mês de Referência (somente leitura) */}
          <div className="space-y-2">
            <Label>Mês de Referência</Label>
            <p className="text-sm text-muted-foreground capitalize">
              {format(statement.referenceMonth, "MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>

          {/* Data de Fechamento */}
          <div className="space-y-2">
            <Label>Data de Fechamento</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !closingDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {closingDate ? format(closingDate, 'dd/MM/yyyy') : 'Selecione'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={closingDate}
                  onSelect={(date) => date && setClosingDate(date)}
                  locale={ptBR}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Data de Vencimento */}
          <div className="space-y-2">
            <Label>Data de Vencimento</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !dueDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, 'dd/MM/yyyy') : 'Selecione'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={(date) => date && setDueDate(date)}
                  locale={ptBR}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(val) => setStatus(val as CardStatementStatus)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Total e Pago (somente leitura) */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t">
            <div>
              <Label className="text-muted-foreground text-xs">Total da Fatura</Label>
              <p className="font-medium">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(statement.totalAmount)}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Valor Pago</Label>
              <p className="font-medium">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(statement.paidAmount)}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isUpdatingStatement}>
            {isUpdatingStatement ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};