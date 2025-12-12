import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card as CardUI, CardContent } from '@/components/ui/card';
import { format, subMonths, addMonths, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, CreditCard, Calendar, Receipt, Lock, Unlock } from 'lucide-react';
import { useCardStatements, useStatementTransactions } from '@/hooks/useCardStatements';
import { Card, Bank, CardStatement } from '@/types/finance';
import { PayStatementDialog } from './PayStatementDialog';

interface CardStatementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: Card;
  bank: Bank;
  banks: Bank[];
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  open: { label: 'Aberta', variant: 'secondary' },
  closed: { label: 'Fechada', variant: 'outline' },
  paid: { label: 'Paga', variant: 'default' },
  partial: { label: 'Parcial', variant: 'destructive' },
};

export const CardStatementDialog = ({
  open,
  onOpenChange,
  card,
  bank,
  banks,
}: CardStatementDialogProps) => {
  const [selectedMonth, setSelectedMonth] = useState(startOfMonth(new Date()));
  const [currentStatement, setCurrentStatement] = useState<CardStatement | null>(null);
  const [payDialogOpen, setPayDialogOpen] = useState(false);

  const { 
    statements, 
    isLoading, 
    getOrCreateStatement, 
    closeStatement, 
    reopenStatement 
  } = useCardStatements(card.id);

  const { data: transactions = [], isLoading: isLoadingTransactions } = useStatementTransactions(
    card.id, 
    selectedMonth
  );

  // Load or create statement for selected month
  useEffect(() => {
    const loadStatement = async () => {
      if (!open) return;
      
      try {
        const statement = await getOrCreateStatement({
          cardId: card.id,
          month: selectedMonth,
          closingDay: card.closingDay || 1,
          dueDay: card.dueDay || 10,
        });
        setCurrentStatement(statement);
      } catch (error) {
        console.error('Error loading statement:', error);
      }
    };

    loadStatement();
  }, [open, selectedMonth, card.id, card.closingDay, card.dueDay, getOrCreateStatement]);

  const handlePreviousMonth = () => {
    setSelectedMonth(subMonths(selectedMonth, 1));
  };

  const handleNextMonth = () => {
    setSelectedMonth(addMonths(selectedMonth, 1));
  };

  const handleCloseStatement = () => {
    if (currentStatement) {
      closeStatement(currentStatement.id);
    }
  };

  const handleReopenStatement = () => {
    if (currentStatement) {
      reopenStatement(currentStatement.id);
    }
  };

  const remainingAmount = currentStatement 
    ? currentStatement.totalAmount - currentStatement.paidAmount 
    : 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div 
                className="p-2 rounded-lg"
                style={{ backgroundColor: `${card.color}20` }}
              >
                <CreditCard className="h-5 w-5" style={{ color: card.color }} />
              </div>
              Fatura - {card.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Month Navigation */}
            <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
              <Button variant="ghost" size="icon" onClick={handlePreviousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-medium capitalize">
                {format(selectedMonth, "MMMM 'de' yyyy", { locale: ptBR })}
              </span>
              <Button variant="ghost" size="icon" onClick={handleNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Statement Info */}
            {currentStatement && (
              <div className="grid grid-cols-2 gap-4">
                <CardUI>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Calendar className="h-4 w-4" />
                      <span className="text-xs">Fechamento</span>
                    </div>
                    <p className="font-medium">
                      {format(currentStatement.closingDate, 'dd/MM/yyyy')}
                    </p>
                  </CardContent>
                </CardUI>
                <CardUI>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Calendar className="h-4 w-4" />
                      <span className="text-xs">Vencimento</span>
                    </div>
                    <p className="font-medium">
                      {format(currentStatement.dueDate, 'dd/MM/yyyy')}
                    </p>
                  </CardContent>
                </CardUI>
              </div>
            )}

            {/* Status and Total */}
            {currentStatement && (
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <Badge variant={statusLabels[currentStatement.status]?.variant || 'secondary'}>
                    {statusLabels[currentStatement.status]?.label || currentStatement.status}
                  </Badge>
                  {currentStatement.paidAmount > 0 && currentStatement.status !== 'paid' && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Pago: {formatCurrency(currentStatement.paidAmount)}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">
                    {currentStatement.status === 'paid' ? 'Total Pago' : 'Total da Fatura'}
                  </p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(
                      currentStatement.status === 'paid' 
                        ? currentStatement.paidAmount 
                        : currentStatement.totalAmount
                    )}
                  </p>
                  {remainingAmount > 0 && currentStatement.status !== 'paid' && (
                    <p className="text-sm text-expense">
                      Restante: {formatCurrency(remainingAmount)}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Transactions List */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Receipt className="h-4 w-4 text-muted-foreground" />
                <h4 className="font-medium">Transações da Fatura</h4>
                <span className="text-sm text-muted-foreground">
                  ({transactions.length})
                </span>
              </div>
              
              <ScrollArea className="h-[200px] rounded-lg border">
                {isLoadingTransactions ? (
                  <div className="p-4 text-center text-muted-foreground">
                    Carregando transações...
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    Nenhuma transação neste período
                  </div>
                ) : (
                  <div className="divide-y">
                    {transactions.map((transaction: any) => (
                      <div key={transaction.id} className="flex items-center justify-between p-3 hover:bg-muted/50">
                        <div>
                          <p className="font-medium text-sm">{transaction.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(transaction.date), 'dd/MM/yyyy')} • {transaction.categories?.name}
                          </p>
                        </div>
                        <p className="font-medium text-expense">
                          {formatCurrency(transaction.amount)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Actions */}
            {currentStatement && (
              <div className="flex gap-2 justify-end pt-2 border-t">
                {currentStatement.status === 'open' && (
                  <Button variant="outline" onClick={handleCloseStatement}>
                    <Lock className="h-4 w-4 mr-2" />
                    Fechar Fatura
                  </Button>
                )}
                {(currentStatement.status === 'closed' || currentStatement.status === 'partial') && (
                  <Button variant="outline" onClick={handleReopenStatement}>
                    <Unlock className="h-4 w-4 mr-2" />
                    Reabrir
                  </Button>
                )}
                {currentStatement.status !== 'paid' && remainingAmount > 0 && (
                  <Button onClick={() => setPayDialogOpen(true)}>
                    Pagar Fatura
                  </Button>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {currentStatement && (
        <PayStatementDialog
          open={payDialogOpen}
          onOpenChange={setPayDialogOpen}
          statement={currentStatement}
          card={card}
          banks={banks}
        />
      )}
    </>
  );
};
