import { useState } from "react";
import { ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Transaction, Category, Bank } from "@/types/finance";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TransactionListProps {
  transactions: Transaction[];
  categories: Category[];
  banks: Bank[];
}

export const TransactionList = ({ transactions, categories, banks }: TransactionListProps) => {
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all");
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const filterButtons = [
    { label: "Todas", value: "all" as const },
    { label: "Receitas", value: "income" as const },
    { label: "Despesas", value: "expense" as const },
  ];

  return (
    <Card className="p-6 border-none shadow-md">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">Transações Recentes</h2>
          <div className="flex gap-2">
            {filterButtons.map((button) => (
              <Button
                key={button.value}
                variant={filterType === button.value ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterType(button.value)}
                className="transition-all"
              >
                {button.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {transactions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhuma transação encontrada</p>
          ) : (
            transactions
              .filter((t) => filterType === "all" || t.type === filterType)
              .map((transaction) => {
                const category = categories.find(c => c.id === transaction.categoryId);
                const bank = banks.find(b => b.id === transaction.bankId);
                return (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full ${
                      transaction.type === "income" ? "bg-income-light" : "bg-expense-light"
                    }`}
                  >
                    {transaction.type === "income" ? (
                      <ArrowUpCircle className="w-5 h-5 text-income" />
                    ) : (
                      <ArrowDownCircle className="w-5 h-5 text-expense" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{transaction.description}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>
                        {category?.name}
                        {transaction.subcategory && ` • ${transaction.subcategory}`}
                      </span>
                      <span>•</span>
                      <span>{format(transaction.date, "dd MMM yyyy", { locale: ptBR })}</span>
                      {bank && (
                        <>
                          <span>•</span>
                          <div className="flex items-center gap-1">
                            <div 
                              className="w-2 h-2 rounded-full" 
                              style={{ backgroundColor: bank.color }}
                            />
                            <span>{bank.name}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <p
                  className={`text-lg font-semibold ${
                    transaction.type === "income" ? "text-income" : "text-expense"
                  }`}
                >
                  {transaction.type === "income" ? "+" : "-"} {formatCurrency(transaction.amount)}
                </p>
              </div>
                );
              })
          )}
        </div>
      </div>
    </Card>
  );
};
