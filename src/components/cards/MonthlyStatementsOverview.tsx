import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, CreditCard, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { format, startOfMonth, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Bank, CardStatementStatus } from "@/types/finance";

interface MonthlyStatementsOverviewProps {
  banks: Bank[];
  onCardClick?: (card: { id: string; name: string; bankId: string; bankName: string }) => void;
}

interface StatementData {
  cardId: string;
  cardName: string;
  cardColor: string;
  bankId: string;
  bankName: string;
  totalAmount: number;
  paidAmount: number;
  status: CardStatementStatus;
}

const statusLabels: Record<CardStatementStatus, string> = {
  open: "Aberta",
  closed: "Fechada",
  paid: "Paga",
  partial: "Parcial",
};

const statusColors: Record<CardStatementStatus, string> = {
  open: "bg-yellow-500/20 text-yellow-500",
  closed: "bg-muted text-muted-foreground",
  paid: "bg-green-500/20 text-green-500",
  partial: "bg-orange-500/20 text-orange-500",
};

export const MonthlyStatementsOverview = ({ banks, onCardClick }: MonthlyStatementsOverviewProps) => {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));

  // Get all cards from all banks
  const allCards = useMemo(() => {
    return banks.flatMap(bank => 
      (bank.cards || []).map(card => ({
        ...card,
        bankId: bank.id,
        bankName: bank.name,
      }))
    );
  }, [banks]);

  const cardIds = allCards.map(c => c.id);

  // Fetch statements for all cards for the current month
  const { data: statementsData = [], isLoading } = useQuery({
    queryKey: ['monthly-statements-overview', format(currentMonth, 'yyyy-MM'), cardIds],
    queryFn: async () => {
      if (cardIds.length === 0) return [];

      const referenceMonthStr = format(currentMonth, 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('card_statements')
        .select('*')
        .in('card_id', cardIds)
        .eq('reference_month', referenceMonthStr);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user && cardIds.length > 0,
  });

  // Map statements to cards with calculated totals
  const statements: StatementData[] = useMemo(() => {
    return allCards.map(card => {
      const statement = statementsData.find(s => s.card_id === card.id);
      
      return {
        cardId: card.id,
        cardName: card.name,
        cardColor: card.color,
        bankId: card.bankId,
        bankName: card.bankName,
        totalAmount: statement ? Number(statement.total_amount) : 0,
        paidAmount: statement ? Number(statement.paid_amount) : 0,
        status: (statement?.status as CardStatementStatus) || 'open',
      };
    });
  }, [allCards, statementsData]);

  // Calculate totals
  const totalAmount = statements.reduce((sum, s) => sum + s.totalAmount, 0);
  const totalPaid = statements.reduce((sum, s) => sum + s.paidAmount, 0);
  const totalPending = totalAmount - totalPaid;

  // Group by bank
  const statementsByBank = useMemo(() => {
    const grouped: Record<string, { bankName: string; bankId: string; statements: StatementData[] }> = {};
    
    statements.forEach(statement => {
      if (!grouped[statement.bankId]) {
        grouped[statement.bankId] = {
          bankId: statement.bankId,
          bankName: statement.bankName,
          statements: [],
        };
      }
      grouped[statement.bankId].statements.push(statement);
    });
    
    return Object.values(grouped);
  }, [statements]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const handlePrevMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));

  if (allCards.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Resumo de Faturas
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[120px] text-center capitalize">
              {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
            </span>
            <Button variant="ghost" size="icon" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <p className="text-xs text-muted-foreground mb-1">Total Faturas</p>
            <p className="text-lg font-bold">{formatCurrency(totalAmount)}</p>
          </div>
          <div className="p-3 rounded-lg bg-green-500/10 text-center">
            <p className="text-xs text-muted-foreground mb-1">Total Pago</p>
            <p className="text-lg font-bold text-green-500">{formatCurrency(totalPaid)}</p>
          </div>
          <div className="p-3 rounded-lg bg-orange-500/10 text-center">
            <p className="text-xs text-muted-foreground mb-1">Pendente</p>
            <p className="text-lg font-bold text-orange-500">{formatCurrency(totalPending)}</p>
          </div>
        </div>

        {/* Progress Bar */}
        {totalAmount > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progresso de Pagamento</span>
              <span>{Math.round((totalPaid / totalAmount) * 100)}%</span>
            </div>
            <Progress value={(totalPaid / totalAmount) * 100} className="h-2" />
          </div>
        )}

        {/* Statements by Bank */}
        <div className="space-y-4">
          {statementsByBank.map(({ bankId, bankName, statements }) => {
            const bankTotal = statements.reduce((sum, s) => sum + s.totalAmount, 0);
            const bankPaid = statements.reduce((sum, s) => sum + s.paidAmount, 0);
            
            return (
              <div key={bankId} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{bankName}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Total: </span>
                    <span className="font-medium">{formatCurrency(bankTotal)}</span>
                    {bankPaid > 0 && (
                      <span className="text-green-500 ml-2">
                        ({formatCurrency(bankPaid)} pago)
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="grid gap-2 pl-6">
                  {statements.map(statement => (
                    <div
                      key={statement.cardId}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => onCardClick?.({
                        id: statement.cardId,
                        name: statement.cardName,
                        bankId: statement.bankId,
                        bankName: statement.bankName,
                      })}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: statement.cardColor }}
                        />
                        <span className="text-sm">{statement.cardName}</span>
                        <Badge variant="secondary" className={statusColors[statement.status]}>
                          {statusLabels[statement.status]}
                        </Badge>
                      </div>
                      <div className="text-sm font-medium">
                        {statement.paidAmount > 0 && statement.paidAmount < statement.totalAmount ? (
                          <span>
                            <span className="text-green-500">{formatCurrency(statement.paidAmount)}</span>
                            <span className="text-muted-foreground"> / </span>
                            {formatCurrency(statement.totalAmount)}
                          </span>
                        ) : (
                          formatCurrency(statement.totalAmount)
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {isLoading && (
          <div className="text-center py-4 text-muted-foreground text-sm">
            Carregando...
          </div>
        )}

        {!isLoading && statements.length === 0 && (
          <div className="text-center py-4 text-muted-foreground text-sm">
            Nenhum cartão cadastrado.
          </div>
        )}
      </CardContent>
    </Card>
  );
};
