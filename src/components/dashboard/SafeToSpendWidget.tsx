import { useMemo } from "react";
import { formatCurrency } from "@/lib/utils";
import { ShieldCheck, Info, Calculator, Target } from "lucide-react";
import { useFinance } from "@/contexts/FinanceContext";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { isSameMonth, isSameYear } from "date-fns";

interface SafeToSpendWidgetProps {
  currentMonthIncome: number;
  simulatedIncome?: number | null;
}

export const SafeToSpendWidget = ({ currentMonthIncome, simulatedIncome }: SafeToSpendWidgetProps) => {
  const { banks, recurringTransactions, transactions } = useFinance();

  const data = useMemo(() => {
    // 1. Saldo Líquido Bancário
    const liquidBalance = banks.reduce((sum, bank) => sum + (bank.balance || 0), 0);

    // 2. Faturas de Cartão (Dívida total atual do cartão)
    const cardDebt = banks.reduce((sum, bank) => {
      const bankCardsDebt = bank.cards?.reduce((cardSum, card) => cardSum + (card.used || 0), 0) || 0;
      return sum + bankCardsDebt;
    }, 0);

    // 3. Despesas recorrentes futuras
    const now = new Date();
    const upcomingExpenses = recurringTransactions.reduce((sum, rt) => {
      if (rt.type === "expense" && rt.isActive) {
        // Find if this recurring transaction has already been paid this month
        const hasPaidThisMonth = transactions.some((t) => {
          if (!t.recurringTransactionId) return false;
          if (t.recurringTransactionId !== rt.id) return false;
          const tDate = new Date(t.date);
          return isSameMonth(tDate, now) && isSameYear(tDate, now);
        });

        if (!hasPaidThisMonth) {
          return sum + rt.amount;
        }
      }
      return sum;
    }, 0);

    // 4. Meta de Reserva (20%)
    const income = simulatedIncome ?? currentMonthIncome;
    const savingsTarget = income * 0.20;

    // Cálculo final preditivo
    const safeToSpend = liquidBalance - cardDebt - upcomingExpenses - savingsTarget;

    return {
      liquidBalance,
      cardDebt,
      upcomingExpenses,
      savingsTarget,
      safeToSpend,
    };
  }, [banks, recurringTransactions, transactions, currentMonthIncome, simulatedIncome]);

  return (
    <div className="rounded-3xl bg-card/60 backdrop-blur-md border border-white/10 shadow-[0_0_40px_-10px_rgba(34,197,94,0.15)] p-8 transition-all duration-500 hover:shadow-[0_0_50px_-10px_rgba(34,197,94,0.25)] relative overflow-hidden group">
      {/* Decorative gradient orb */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/15 transition-all duration-500" />
      
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold tracking-widest uppercase text-muted-foreground/80">
              Livre para Gastar Hoje
            </h2>
            <Popover>
              <PopoverTrigger asChild>
                <button className="text-muted-foreground hover:text-foreground transition-colors outline-none focus:ring-2 focus:ring-ring rounded-full p-1 -m-1">
                  <Info className="w-4 h-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-80 p-5 rounded-3xl bg-card/95 backdrop-blur-xl border border-white/10 shadow-2xl space-y-5 z-50">
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-emerald-400" />
                    Como chegamos nesse valor?
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Pegamos todo o dinheiro real que você tem hoje, pagamos suas dívidas e já guardamos sua reserva do futuro para garantir que a meta do mês seja batida.
                  </p>
                </div>
                
                <div className="space-y-2 text-sm tabular-nums">
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>1. Saldo nas Contas</span>
                    <span className="font-medium text-foreground">{formatCurrency(data.liquidBalance)}</span>
                  </div>
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>2. Faturas de Cartões</span>
                    <span className="font-medium text-destructive">-{formatCurrency(data.cardDebt)}</span>
                  </div>
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>3. Assinaturas a Vencer</span>
                    <span className="font-medium text-destructive">-{formatCurrency(data.upcomingExpenses)}</span>
                  </div>
                  
                  <div className="my-2 border-t border-dashed border-white/10" />
                  
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Subtotal Disponível</span>
                    <span className="font-medium text-foreground">
                      {formatCurrency(data.liquidBalance - data.cardDebt - data.upcomingExpenses)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center font-medium">
                    <span className="text-purple-400/90 flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5" />
                      4. Reserva Protegida (20%)
                    </span>
                    <span className="text-purple-400">-{formatCurrency(data.savingsTarget)}</span>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="flex items-baseline gap-2">
            <p className={`text-5xl md:text-6xl font-bold tracking-tighter tabular-nums ${data.safeToSpend >= 0 ? "text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.3)] animate-pulse" : "text-destructive"}`}>
              {formatCurrency(data.safeToSpend)}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            Gastando dentro deste limite as contas batem e a <strong>reserva mensal está garantida</strong>.
          </p>
        </div>
        
        <div className="hidden md:flex items-center justify-center w-24 h-24 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 shrink-0 transform rotate-12 group-hover:rotate-0 transition-transform duration-500">
          <ShieldCheck className="w-10 h-10 text-emerald-400" />
        </div>
      </div>
    </div>
  );
};
