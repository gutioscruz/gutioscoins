import { useState, useMemo } from "react";
import { startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { SummaryCards } from "@/components/finance/SummaryCards";
import { TransactionList } from "@/components/finance/TransactionList";
import { MonthlyChart } from "@/components/finance/MonthlyChart";
import { SubcategoryChart } from "@/components/finance/SubcategoryChart";
import { AddTransactionDialog } from "@/components/finance/AddTransactionDialog";
import { EditTransactionDialog } from "@/components/finance/EditTransactionDialog";
import { PeriodFilter } from "@/components/finance/PeriodFilter";
import { useFinance } from "@/contexts/FinanceContext";
import { Transaction } from "@/types/finance";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
const Transactions = () => {
  const {
    transactions,
    categories,
    banks,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    isLoadingTransactions,
    isLoadingCategories,
    isLoadingBanks
  } = useFinance();
  const [startDate, setStartDate] = useState<Date | undefined>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date | undefined>(endOfMonth(new Date()));
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
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

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setEditDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setTransactionToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (transactionToDelete) {
      deleteTransaction(transactionToDelete);
      setDeleteDialogOpen(false);
      setTransactionToDelete(null);
    }
  };
  
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
          <TransactionList 
            transactions={filteredTransactions} 
            categories={categories} 
            banks={banks}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
          <div className="space-y-8">
            <MonthlyChart transactions={filteredTransactions} categories={categories} />
            <SubcategoryChart transactions={filteredTransactions} categories={categories} />
          </div>
        </div>

        <EditTransactionDialog
          transaction={editingTransaction}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onUpdateTransaction={updateTransaction}
          categories={categories}
          banks={banks}
        />

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>;
};
export default Transactions;