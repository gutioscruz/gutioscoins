import { useState, useMemo } from "react";
import { startOfMonth, endOfMonth } from "date-fns";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SummaryCards } from "@/components/finance/SummaryCards";
import { TransactionList } from "@/components/finance/TransactionList";
import { InteractivePieChart } from "@/components/finance/InteractivePieChart";
import { CategoryDetailsDialog } from "@/components/finance/CategoryDetailsDialog";
import { AddTransactionDialog } from "@/components/finance/AddTransactionDialog";
import { EditTransactionDialog } from "@/components/finance/EditTransactionDialog";
import { PeriodFilter } from "@/components/finance/PeriodFilter";
import { BatchTransactionDialog } from "@/components/finance/BatchTransactionDialog";
import { QuickEntryDialog } from "@/components/finance/QuickEntryDialog";
import { useTransactions } from "@/hooks/useTransactions";
import { useCategories } from "@/hooks/useCategories";
import { useBanks } from "@/hooks/useBanks";
import { Transaction } from "@/types/finance";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TransactionType } from "@/types/finance";
import { toast } from "sonner";

interface SelectedCategory {
  name: string;
  color: string;
  categoryId?: string;
  subcategory?: string;
}

const Transactions = () => {
  const [startDate, setStartDate] = useState<Date | undefined>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date | undefined>(endOfMonth(new Date()));
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
  
  // Chart interaction state
  const [categoryDetailsOpen, setCategoryDetailsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<SelectedCategory | null>(null);
  const [activeCategoryIndex, setActiveCategoryIndex] = useState<number | undefined>(undefined);
  const [activeSubcategoryIndex, setActiveSubcategoryIndex] = useState<number | undefined>(undefined);

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

  const handleQuickBatchAdd = async (transactions: Array<{
    description: string;
    amount: number;
    type: TransactionType;
    categoryId: string;
    bankId: string;
    date: Date;
    isInstallment: boolean;
  }>) => {
    for (const tx of transactions) {
      await addTransaction({
        description: tx.description,
        amount: tx.amount,
        type: tx.type,
        categoryId: tx.categoryId,
        bankId: tx.bankId,
        date: tx.date,
        isInstallment: tx.isInstallment,
        installmentNumber: undefined,
        installmentCount: undefined,
      });
    }
  };

  const handleCategorySliceClick = (item: { name: string; color: string; categoryId?: string; subcategory?: string }) => {
    setSelectedCategory({
      name: item.name,
      color: item.color,
      categoryId: item.categoryId,
      subcategory: item.subcategory,
    });
    setCategoryDetailsOpen(true);
  };

  const handleEditFromDialog = (transaction: Transaction) => {
    setCategoryDetailsOpen(false);
    handleEdit(transaction);
  };

  const handleDeleteFromDialog = (id: string) => {
    setCategoryDetailsOpen(false);
    handleDelete(id);
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
      <main className="container mx-auto px-4 py-8 space-y-6">
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
            <QuickEntryDialog 
              onBatchAdd={handleQuickBatchAdd}
              categories={categories}
              banks={banks}
            />
          </div>
        </div>

        <SummaryCards totalIncome={totalIncome} totalExpense={totalExpense} balance={balance} />

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <TransactionList 
              transactions={transactions} 
              categories={categories} 
              banks={banks}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </div>
          <div className="space-y-6">
            <InteractivePieChart
              transactions={transactions}
              categories={categories}
              type="category"
              onSliceClick={handleCategorySliceClick}
              activeIndex={activeCategoryIndex}
              onActiveIndexChange={setActiveCategoryIndex}
            />
            <InteractivePieChart
              transactions={transactions}
              categories={categories}
              type="subcategory"
              onSliceClick={handleCategorySliceClick}
              activeIndex={activeSubcategoryIndex}
              onActiveIndexChange={setActiveSubcategoryIndex}
            />
          </div>
        </div>

        {selectedCategory && (
          <CategoryDetailsDialog
            open={categoryDetailsOpen}
            onOpenChange={setCategoryDetailsOpen}
            categoryName={selectedCategory.name}
            categoryColor={selectedCategory.color}
            categoryId={selectedCategory.categoryId}
            subcategory={selectedCategory.subcategory}
            transactions={transactions}
            categories={categories}
            banks={banks}
            onEdit={handleEditFromDialog}
            onDelete={handleDeleteFromDialog}
          />
        )}

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

        {/* Floating Action Button */}
        <div className="fixed bottom-6 right-6 z-50">
          <AddTransactionDialog 
            onAddTransaction={addTransaction} 
            categories={categories} 
            banks={banks} 
          />
        </div>
      </main>
    </div>
  );
};

export default Transactions;
