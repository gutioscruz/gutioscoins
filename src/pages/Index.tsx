import { useState } from "react";
import { Header } from "@/components/finance/Header";
import { SummaryCards } from "@/components/finance/SummaryCards";
import { TransactionList } from "@/components/finance/TransactionList";
import { MonthlyChart } from "@/components/finance/MonthlyChart";
import { AddTransactionDialog } from "@/components/finance/AddTransactionDialog";
import { Transaction } from "@/types/finance";

const Index = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: "1",
      description: "Salário",
      amount: 5000,
      type: "income",
      category: "Salário",
      date: new Date("2025-01-15"),
    },
    {
      id: "2",
      description: "Supermercado",
      amount: 450,
      type: "expense",
      category: "Alimentação",
      date: new Date("2025-01-18"),
    },
    {
      id: "3",
      description: "Uber",
      amount: 85,
      type: "expense",
      category: "Transporte",
      date: new Date("2025-01-19"),
    },
    {
      id: "4",
      description: "Freelance Design",
      amount: 1200,
      type: "income",
      category: "Freelance",
      date: new Date("2025-01-20"),
    },
    {
      id: "5",
      description: "Cinema",
      amount: 60,
      type: "expense",
      category: "Lazer",
      date: new Date("2025-01-21"),
    },
  ]);

  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all");

  const addTransaction = (transaction: Omit<Transaction, "id">) => {
    const newTransaction: Transaction = {
      ...transaction,
      id: Date.now().toString(),
    };
    setTransactions([newTransaction, ...transactions]);
  };

  const filteredTransactions = transactions.filter((transaction) => {
    if (filterType === "all") return true;
    return transaction.type === filterType;
  });

  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalIncome - totalExpense;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard Financeiro</h1>
            <p className="text-muted-foreground mt-1">Acompanhe suas finanças em tempo real</p>
          </div>
          <AddTransactionDialog onAddTransaction={addTransaction} />
        </div>

        <SummaryCards 
          totalIncome={totalIncome}
          totalExpense={totalExpense}
          balance={balance}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <TransactionList 
              transactions={filteredTransactions}
              filterType={filterType}
              onFilterChange={setFilterType}
            />
          </div>
          
          <div>
            <MonthlyChart transactions={transactions} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
