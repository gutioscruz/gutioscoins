import { useState, useMemo } from "react";
import { startOfMonth, endOfMonth } from "date-fns";
import { SummaryCards } from "@/components/finance/SummaryCards";
import { TransactionList } from "@/components/finance/TransactionList";
import { MonthlyChart } from "@/components/finance/MonthlyChart";
import { SubcategoryChart } from "@/components/finance/SubcategoryChart";
import { AddTransactionDialog } from "@/components/finance/AddTransactionDialog";
import { EditTransactionDialog } from "@/components/finance/EditTransactionDialog";
import { PeriodFilter } from "@/components/finance/PeriodFilter";
import { BatchTransactionDialog } from "@/components/finance/BatchTransactionDialog";
import { useTransactions } from "@/hooks/useTransactions";
import { useCategories } from "@/hooks/useCategories";
import { useBanks } from "@/hooks/useBanks";
import { Transaction } from "@/types/finance";
import { ConfirmDialog } from "@/components/ConfirmDialog";

const Transactions = () => {
  const [startDate, setStartDate] = useState<Date | undefined>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date | undefined>(endOfMonth(new Date()));
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);

  // Server-side filtered transactions
  const { 
    transactions, 
    isLoading: isLoadingTransactions, 
    addTransaction, 
    addBatchTransactions,
    updateTransaction, 
    deleteTransaction 
  } = useTransactions({ startDate, endDate });
  
  const { categories, isLoading: isLoadingCategories } = useCategories();
  const { banks, isLoading: isLoadingBanks } = useBanks();

  const totalIncome = useMemo(() => 
    transactions.filter(t => t.type === "income").reduce((sum, t) => sum + t.amount, 0),
    [transactions]
  );
  const totalExpense = useMemo(() =>
    transactions.filter(t => t.type === "expense").reduce((sum, t) => sum + t.amount, 0),
    [transactions]
  );
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

  const handleBatchAdd = async (batchTransactions: any[]) => {
    await addBatchTransactions({ 
      transactions: batchTransactions, 
      categories, 
      banks 
    });
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-3xl font-bold">Transações</h1>
          <div className="flex flex-wrap gap-2 items-center">
            <PeriodFilter 
              startDate={startDate} 
              endDate={endDate} 
              onPeriodChange={(start, end) => {
                setStartDate(start);
                setEndDate(end);
              }} 
            />
            <BatchTransactionDialog 
              onBatchAdd={handleBatchAdd}
              categories={categories}
              banks={banks}
            />
            <AddTransactionDialog onAddTransaction={addTransaction} categories={categories} banks={banks} />
          </div>
        </div>

        <SummaryCards totalIncome={totalIncome} totalExpense={totalExpense} balance={balance} />

        <div className="grid gap-8 md:grid-cols-2">
          <TransactionList 
            transactions={transactions} 
            categories={categories} 
            banks={banks}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
          <div className="space-y-8">
            <MonthlyChart transactions={transactions} categories={categories} />
            <SubcategoryChart transactions={transactions} categories={categories} />
          </div>
        </div>

        <EditTransactionDialog
          transaction={editingTransaction}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onUpdateTransaction={(id, transaction) => updateTransaction({ id, transaction })}
          categories={categories}
          banks={banks}
        />

        <ConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Confirmar Exclusão"
          description="Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita."
          onConfirm={confirmDelete}
          confirmText="Excluir"
        />
      </main>
    </div>
  );
};
export default Transactions;