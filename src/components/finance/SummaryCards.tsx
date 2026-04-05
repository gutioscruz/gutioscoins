import { ArrowUpCircle, ArrowDownCircle, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface SummaryCardsProps {
  totalIncome: number;
  totalExpense: number;
  balance: number;
}

export const SummaryCards = ({ totalIncome, totalExpense, balance }: SummaryCardsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="group p-6 rounded-3xl bg-card/60 backdrop-blur-md border border-white/5 shadow-sm transition-all duration-500 ease-out hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:-translate-y-1">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/70">Receitas</p>
            <p className="text-3xl font-bold text-income tabular-nums tracking-tight">{formatCurrency(totalIncome)}</p>
          </div>
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-income/10 group-hover:scale-110 group-hover:bg-income/20 transition-all duration-300">
            <ArrowUpCircle className="w-6 h-6 text-income" />
          </div>
        </div>
      </div>

      <div className="group p-6 rounded-3xl bg-card/60 backdrop-blur-md border border-white/5 shadow-sm transition-all duration-500 ease-out hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:-translate-y-1">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/70">Despesas</p>
            <p className="text-3xl font-bold text-foreground tabular-nums tracking-tight">{formatCurrency(totalExpense)}</p>
          </div>
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-muted/50 group-hover:scale-110 group-hover:bg-muted/80 transition-all duration-300">
            <ArrowDownCircle className="w-6 h-6 text-muted-foreground" />
          </div>
        </div>
      </div>

      <div className="group p-6 rounded-3xl bg-card/60 backdrop-blur-md border border-white/5 shadow-sm transition-all duration-500 ease-out hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:-translate-y-1">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/70">Saldo</p>
            <p className={`text-3xl font-bold tabular-nums tracking-tight ${balance >= 0 ? 'text-income' : 'text-destructive'}`}>
              {formatCurrency(balance)}
            </p>
          </div>
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 group-hover:scale-110 group-hover:bg-primary/20 transition-all duration-300">
            <DollarSign className="w-6 h-6 text-primary" />
          </div>
        </div>
      </div>
    </div>
  );
};
