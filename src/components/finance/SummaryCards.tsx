import { ArrowUpCircle, ArrowDownCircle, DollarSign } from "lucide-react";
import { Card } from "@/components/ui/card";

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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card className="p-6 border-none shadow-md hover:shadow-lg transition-shadow">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Receitas</p>
            <p className="text-3xl font-bold text-income">{formatCurrency(totalIncome)}</p>
          </div>
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-income-light">
            <ArrowUpCircle className="w-6 h-6 text-income" />
          </div>
        </div>
      </Card>

      <Card className="p-6 border-none shadow-md hover:shadow-lg transition-shadow">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Despesas</p>
            <p className="text-3xl font-bold text-expense">{formatCurrency(totalExpense)}</p>
          </div>
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-expense-light">
            <ArrowDownCircle className="w-6 h-6 text-expense" />
          </div>
        </div>
      </Card>

      <Card className="p-6 border-none shadow-md hover:shadow-lg transition-shadow bg-gradient-to-br from-primary/5 to-primary/10">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Saldo</p>
            <p className={`text-3xl font-bold ${balance >= 0 ? 'text-income' : 'text-expense'}`}>
              {formatCurrency(balance)}
            </p>
          </div>
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/20">
            <DollarSign className="w-6 h-6 text-primary" />
          </div>
        </div>
      </Card>
    </div>
  );
};
