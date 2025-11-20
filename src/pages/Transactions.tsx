import { Header } from "@/components/finance/Header";
import { SummaryCards } from "@/components/finance/SummaryCards";
import { TransactionList } from "@/components/finance/TransactionList";
import { MonthlyChart } from "@/components/finance/MonthlyChart";
import { AddTransactionDialog } from "@/components/finance/AddTransactionDialog";
import { useFinance } from "@/contexts/FinanceContext";

const Transactions = () => {
  const { transactions, categories, banks, addTransaction } = useFinance();

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
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Controle Financeiro</h1>
          <AddTransactionDialog 
            onAddTransaction={addTransaction}
            categories={categories}
            banks={banks}
          />
        </div>

        <SummaryCards
          totalIncome={totalIncome}
          totalExpense={totalExpense}
          balance={balance}
        />

        <div className="grid gap-8 md:grid-cols-2">
          <TransactionList 
            transactions={transactions}
            categories={categories}
            banks={banks}
          />
          <MonthlyChart 
            transactions={transactions}
            categories={categories}
          />
        </div>
      </main>
    </div>
  );
};

export default Transactions;
