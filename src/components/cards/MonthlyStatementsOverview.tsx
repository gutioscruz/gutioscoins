import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, CreditCard, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { format, startOfMonth, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Bank, CardStatementStatus } from "@/types/finance";
import { formatCurrency } from "@/lib/utils";

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
  paid: "bg-income/20 text-income",
  partial: "bg-orange-500/20 text-orange-500",
};

export const MonthlyStatementsOverview = ({ banks, onCardClick }: MonthlyStatementsOverviewProps) => {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));

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

  const totalAmount = statements.reduce((sum, s) => sum + s.totalAmount, 0);
  const totalPaid = statements.reduce((sum, s) => sum + s.paidAmount, 0);
  const totalPending = totalAmount - totalPaid;

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

  const handlePrevMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));

  if (allCards.length === 0) return null;

  return (
    <div className="rounded-2xl bg-card/60 backdrop-blur-sm border-none shadow-sm p-6 space-y-6 transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-primary/10">
            <CreditCard className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">Resumo de Faturas</h3>
            <p className="text-xs text-muted-foreground capitalize">
              {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-accent/30" onClick={handlePrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-accent/30" onClick={handleNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary mini cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-2xl bg-muted/30 text-center">
          <p className="text-xs text-muted-foreground mb-1">Total</p>
          <p className="text-base font-bold text-foreground">{formatCurrency(totalAmount)}</p>
        </div>
        <div className="p-3 rounded-2xl bg-income/10 text-center">
          <p className="text-xs text-muted-foreground mb-1">Pago</p>
          <p className="text-base font-bold text-income">{formatCurrency(totalPaid)}</p>
        </div>
        <div className="p-3 rounded-2xl bg-muted/30 text-center">
          <p className="text-xs text-muted-foreground mb-1">Pendente</p>
          <p className="text-base font-bold text-foreground">{formatCurrency(totalPending)}</p>
        </div>
      </div>

      {/* Progress */}
      {totalAmount > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progresso</span>
            <span>{Math.round((totalPaid / totalAmount) * 100)}%</span>
          </div>
          <Progress value={(totalPaid / totalAmount) * 100} className="h-1.5" />
        </div>
      )}

      {/* Card list by bank - borderless */}
      <div className="space-y-4">
        {statementsByBank.map(({ bankId, bankName, statements }) => (
          <div key={bankId} className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{bankName}</span>
            </div>
            
            <div className="flex flex-col gap-1">
              {statements.map(statement => (
                <div
                  key={statement.cardId}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-accent/50 transition-all duration-300 cursor-pointer"
                  onClick={() => onCardClick?.({
                    id: statement.cardId,
                    name: statement.cardName,
                    bankId: statement.bankId,
                    bankName: statement.bankName,
                  })}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${statement.cardColor}20` }}
                  >
                    <CreditCard className="w-4 h-4" style={{ color: statement.cardColor }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{statement.cardName}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 h-4 border-none ${statusColors[statement.status]}`}>
                        {statusLabels[statement.status]}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-foreground tabular-nums">
                      {formatCurrency(statement.totalAmount)}
                    </p>
                    {statement.paidAmount > 0 && statement.paidAmount < statement.totalAmount && (
                      <p className="text-xs text-income tabular-nums">{formatCurrency(statement.paidAmount)} pago</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {isLoading && (
        <div className="text-center py-4 text-muted-foreground text-sm">Carregando...</div>
      )}
      {!isLoading && statements.length === 0 && (
        <div className="text-center py-4 text-muted-foreground text-sm">Nenhum cartão cadastrado.</div>
      )}
    </div>
  );
};
