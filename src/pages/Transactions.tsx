import { useState, useMemo } from "react";
import { startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { SummaryCards } from "@/components/finance/SummaryCards";
import { TransactionList } from "@/components/finance/TransactionList";
import { MonthlyChart } from "@/components/finance/MonthlyChart";
import { AddTransactionDialog } from "@/components/finance/AddTransactionDialog";
import { PeriodFilter } from "@/components/finance/PeriodFilter";
import { useFinance } from "@/contexts/FinanceContext";
const Transactions = () => {
  const {
    transactions,
    categories,
    banks,
    addTransaction,
    isLoadingTransactions,
    isLoadingCategories,
    isLoadingBanks
  } = useFinance();
  const [startDate, setStartDate] = useState<Date | undefined>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date | undefined>(endOfMonth(new Date()));
  const filteredTransactions = useMemo(() => {
    if (!startDate || !endDate) return transactions;
    return transactions.filter(t => isWithinInterval(new Date(t.date), {
      start: startDate,
      end: endDate
    }));
  }, [transactions, startDate, endDate]);
  const totalIncome = filteredTransactions.filter(t => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = filteredTransactions.filter(t => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
  const balance = totalIncome - totalExpense;
  
  const isLoading = isLoadingTransactions || isLoadingCategories || isLoadingBanks;
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-3xl font-bold">Transações</h1>
          <div className="flex flex-wrap gap-2 items-center">
            <PeriodFilter startDate={startDate} endDate={endDate} onPeriodChange={(start, end) => {
            setStartDate(start);
            setEndDate(end);
          }} />
            <AddTransactionDialog onAddTransaction={addTransaction} categories={categories} banks={banks} />
          </div>
        </div>

        <SummaryCards totalIncome={totalIncome} totalExpense={totalExpense} balance={balance} />

        <div className="grid gap-8 md:grid-cols-2">
          <TransactionList transactions={filteredTransactions} categories={categories} banks={banks} />
          <MonthlyChart transactions={filteredTransactions} categories={categories} />
        </div>
      </main>
    </div>;
};
export default Transactions;