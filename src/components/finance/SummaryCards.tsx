import { ArrowUpCircle, ArrowDownCircle, DollarSign } from "lucide-react";

interface SummaryCardsProps {
  totalIncome: number;
  totalExpense: number;
  balance: number;
}

export const SummaryCards = ({ totalIncome, totalExpense, balance }: SummaryCardsProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="p-5 rounded-2xl bg-card/60 backdrop-blur-sm shadow-sm transition-all hover:shadow-md">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <p className="text-xs font-medium tracking-wide uppercase text-muted-foreground">Receitas</p>
            <p className="text-2xl font-bold text-income tabular-nums">{formatCurrency(totalIncome)}</p>
          </div>
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-income/10">
            <ArrowUpCircle className="w-5 h-5 text-income" />
          </div>
        </div>
      </div>

      <div className="p-5 rounded-2xl bg-card/60 backdrop-blur-sm shadow-sm transition-all hover:shadow-md">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <p className="text-xs font-medium tracking-wide uppercase text-muted-foreground">Despesas</p>
            <p className="text-2xl font-bold text-expense tabular-nums">{formatCurrency(totalExpense)}</p>
          </div>
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-expense/10">
            <ArrowDownCircle className="w-5 h-5 text-expense" />
          </div>
        </div>
      </div>

      <div className="p-5 rounded-2xl bg-card/60 backdrop-blur-sm shadow-sm transition-all hover:shadow-md">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <p className="text-xs font-medium tracking-wide uppercase text-muted-foreground">Saldo</p>
            <p className={`text-2xl font-bold tabular-nums ${balance >= 0 ? 'text-income' : 'text-expense'}`}>
              {formatCurrency(balance)}
            </p>
          </div>
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
            <DollarSign className="w-5 h-5 text-primary" />
          </div>
        </div>
      </div>
    </div>
  );
};
