import { useState, useEffect } from "react";
import { ArrowUpCircle, ArrowDownCircle, Pencil, Trash2, LayoutGrid, Table as TableIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Transaction, Category, Bank } from "@/types/finance";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TransactionTable } from "./TransactionTable";

interface TransactionListProps {
  transactions: Transaction[];
  categories: Category[];
  banks: Bank[];
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (id: string) => void;
}

type ViewMode = "cards" | "table";

export const TransactionList = ({ transactions, categories, banks, onEdit, onDelete }: TransactionListProps) => {
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all");
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem("transactionViewMode");
    return (saved as ViewMode) || "cards";
  });

  useEffect(() => {
    localStorage.setItem("transactionViewMode", viewMode);
  }, [viewMode]);

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

  const filteredTransactions = transactions.filter(
    (t) => filterType === "all" || t.type === filterType
  );

  return (
    <Card className="p-6 border-none shadow-md">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-foreground">Transações Recentes</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex gap-1">
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
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
              <TabsList className="h-8">
                <TabsTrigger value="cards" className="px-2 h-7">
                  <LayoutGrid className="h-4 w-4" />
                </TabsTrigger>
                <TabsTrigger value="table" className="px-2 h-7">
                  <TableIcon className="h-4 w-4" />
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {viewMode === "table" ? (
          <TransactionTable
            transactions={transactions}
            categories={categories}
            banks={banks}
            filterType={filterType}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ) : (
          <div className="space-y-3">
            {filteredTransactions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhuma transação encontrada</p>
            ) : (
              filteredTransactions.map((transaction) => {
                const category = categories.find(c => c.id === transaction.categoryId);
                const bank = banks.find(b => b.id === transaction.bankId);
                
                return (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors group"
                  >
                    <div className="flex items-center gap-4 flex-1">
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
                      <div className="flex-1">
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
                          {transaction.isInstallment && transaction.installmentNumber && transaction.installmentCount && (
                            <>
                              <span>•</span>
                              <span className="text-xs font-medium">
                                {transaction.installmentNumber}/{transaction.installmentCount}x
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <p
                        className={`text-lg font-semibold ${
                          transaction.type === "income" ? "text-income" : "text-expense"
                        }`}
                      >
                        {transaction.type === "income" ? "+" : "-"} {formatCurrency(transaction.amount)}
                      </p>
                      {(onEdit || onDelete) && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {onEdit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => onEdit(transaction)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {onDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-destructive"
                              onClick={() => onDelete(transaction.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </Card>
  );
};
