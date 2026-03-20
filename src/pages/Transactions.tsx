import { useState, useMemo } from "react";
import { startOfMonth, endOfMonth } from "date-fns";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Transaction, TransactionType } from "@/types/finance";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { List, PieChart } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

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
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [filterType, setFilterType] = useState<string>("all");
  const [selectedBank, setSelectedBank] = useState<string>("");

  const [categoryDetailsOpen, setCategoryDetailsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<SelectedCategory | null>(null);
  const [activeCategoryIndex, setActiveCategoryIndex] = useState<number | undefined>(undefined);

  const {
    transactions,
    isLoading: isLoadingTransactions,
    addTransaction,
    addBatchTransactions,
    updateTransaction,
    deleteTransaction,
  } = useTransactions({ startDate, endDate });

  const { categories, isLoading: isLoadingCategories } = useCategories();
  const { banks, isLoading: isLoadingBanks } = useBanks();

  const totalIncome = useMemo(
    () => transactions.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0),
    [transactions]
  );
  const totalExpense = useMemo(
    () => transactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0),
    [transactions]
  );
  const balance = totalIncome - totalExpense;
  const isLoading = isLoadingTransactions || isLoadingCategories || isLoadingBanks;

  const barChartData = useMemo(() => [
    { name: "Receitas", value: totalIncome, fill: "hsl(var(--income))" },
    { name: "Despesas", value: totalExpense, fill: "hsl(var(--expense))" },
  ], [totalIncome, totalExpense]);

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
    await addBatchTransactions({ transactions: batchTransactions, categories, banks });
  };

  const handleQuickBatchAdd = async (
    txs: Array<{
      description: string;
      amount: number;
      type: TransactionType;
      categoryId: string;
      bankId: string;
      date: Date;
      isInstallment: boolean;
    }>
  ) => {
    for (const tx of txs) {
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
    setSelectedCategory(item);
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
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
            <BatchTransactionDialog onBatchAdd={handleBatchAdd} categories={categories} banks={banks} />
            <QuickEntryDialog onBatchAdd={handleQuickBatchAdd} categories={categories} banks={banks} />
          </div>
        </div>

        <SummaryCards totalIncome={totalIncome} totalExpense={totalExpense} balance={balance} />

        <Tabs defaultValue="list" className="w-full">
          <TabsList className="bg-muted/50 backdrop-blur-sm rounded-xl p-1 h-auto">
            <TabsTrigger value="list" className="rounded-lg px-4 py-2 text-sm gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <List className="w-4 h-4" />
              Lista
            </TabsTrigger>
            <TabsTrigger value="charts" className="rounded-lg px-4 py-2 text-sm gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <PieChart className="w-4 h-4" />
              Gráficos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="mt-4">
            <TransactionList
              transactions={transactions}
              categories={categories}
              banks={banks}
              onEdit={handleEdit}
              onDelete={handleDelete}
              sortOrder={sortOrder}
              onSortOrderChange={setSortOrder}
              filterType={filterType}
              onFilterTypeChange={setFilterType}
              selectedBank={selectedBank}
              onBankChange={setSelectedBank}
            />
          </TabsContent>

          <TabsContent value="charts" className="mt-4 space-y-6">
            {/* Bar chart: Income vs Expense */}
            <div className="p-6 rounded-2xl bg-card/60 backdrop-blur-sm shadow-sm">
              <h3 className="text-lg font-semibold mb-1">Receitas vs Despesas</h3>
              <p className="text-xs text-muted-foreground mb-4">Comparativo do período selecionado</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barChartData} barCategoryGap="30%">
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => formatCurrency(v)} width={90} />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), ""]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "12px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {barChartData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pie chart: Expenses by category */}
            <InteractivePieChart
              transactions={transactions}
              categories={categories}
              type="category"
              onSliceClick={handleCategorySliceClick}
              activeIndex={activeCategoryIndex}
              onActiveIndexChange={setActiveCategoryIndex}
            />
          </TabsContent>
        </Tabs>

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

        <div className="fixed bottom-6 right-6 z-50">
          <AddTransactionDialog onAddTransaction={addTransaction} categories={categories} banks={banks} />
        </div>
      </main>
    </div>
  );
};

export default Transactions;
