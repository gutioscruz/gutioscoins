import { useMemo, useState, useEffect } from "react";
import { useFinance } from "@/contexts/FinanceContext";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, AlertCircle, Calendar, Wallet, History, BarChart3 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SalaryInput } from "@/components/budget/SalaryInput";
import { WalletPieChart } from "@/components/budget/WalletPieChart";
import { BudgetAreaConfig } from "@/components/budget/BudgetAreaConfig";
import { AreaDetailsDialog } from "@/components/budget/AreaDetailsDialog";
import { BudgetVsActualTab } from "@/components/budget/BudgetVsActualTab";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useBudgetAreas } from "@/hooks/useBudgetAreas";
import { useBudgetAllocation } from "@/hooks/useBudgetAllocation";
import { formatCurrency } from "@/lib/utils";
import type { BudgetAreaAllocation } from "@/types/finance";

const Budget = () => {
  const { transactions, categories } = useFinance();
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedAllocation, setSelectedAllocation] = useState<BudgetAreaAllocation | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { settings, isLoading: isLoadingSettings, updateSalary, isUpdating } = useUserSettings();
  const {
    budgetAreas,
    isLoading: isLoadingAreas,
    initializeDefaultAreas,
    isInitializing,
    updateAllPercentages,
    isSaving,
    addCategoryToArea,
    removeCategoryFromArea,
  } = useBudgetAreas();

  useEffect(() => {
    if (!isLoadingAreas && budgetAreas.length === 0 && !isInitializing) {
      initializeDefaultAreas();
    }
  }, [isLoadingAreas, budgetAreas.length, isInitializing, initializeDefaultAreas]);

  const calculatedSalary = useMemo(() => {
    return transactions
      .filter((t) => {
        const transDate = new Date(t.date);
        return (
          t.type === "income" &&
          transDate.getMonth() === selectedMonth &&
          transDate.getFullYear() === selectedYear
        );
      })
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions, selectedMonth, selectedYear]);

  const effectiveSalary = settings?.salaryAutoCalculate !== false
    ? calculatedSalary
    : settings?.monthlySalary || 0;

  const { allocations, totalPlanned, totalActual, totalVariance, isBalanced } = useBudgetAllocation({
    transactions,
    budgetAreas,
    categories,
    salary: effectiveSalary,
    selectedMonth,
    selectedYear,
  });

  const expenseCategories = categories.filter(c => c.type === "expense");

  const historicalAnalysis = useMemo(() => {
    const analysis: Record<string, { total: number; count: number; average: number }> = {};
    
    expenseCategories.forEach(category => {
      const last3MonthsTransactions = transactions.filter(t => {
        const transDate = new Date(t.date);
        const thresholdDate = new Date();
        thresholdDate.setMonth(thresholdDate.getMonth() - 3);
        
        return t.type === "expense" && 
               t.categoryId === category.id && 
               transDate >= thresholdDate &&
               transDate < new Date();
      });

      const total = last3MonthsTransactions.reduce((sum, t) => sum + t.amount, 0);
      const count = last3MonthsTransactions.length;
      const average = count > 0 ? total / 3 : 0;

      analysis[category.id] = { total, count, average };
    });

    return analysis;
  }, [transactions, expenseCategories]);

  const currentMonthExpenses = useMemo(() => {
    const expenses: Record<string, number> = {};
    
    expenseCategories.forEach(category => {
      const monthTransactions = transactions.filter(t => {
        const transDate = new Date(t.date);
        return t.type === "expense" && 
               t.categoryId === category.id &&
               transDate.getMonth() === selectedMonth &&
               transDate.getFullYear() === selectedYear;
      });

      expenses[category.id] = monthTransactions.reduce((sum, t) => sum + t.amount, 0);
    });

    return expenses;
  }, [transactions, expenseCategories, selectedMonth, selectedYear]);

  const budgetProjection = useMemo(() => {
    const totalHistoricalAverage = Object.values(historicalAnalysis).reduce(
      (sum, cat) => sum + cat.average, 
      0
    );

    return expenseCategories.map(category => {
      const historical = historicalAnalysis[category.id];
      const current = currentMonthExpenses[category.id] || 0;
      const estimated = historical.average;
      const percentageOfTotal = totalHistoricalAverage > 0 
        ? (estimated / totalHistoricalAverage) * 100 
        : 0;
      const variance = current - estimated;
      const variancePercentage = estimated > 0 ? (variance / estimated) * 100 : 0;

      return {
        category,
        estimated,
        current,
        variance,
        variancePercentage,
        percentageOfTotal,
        isOverBudget: current > estimated,
      };
    }).sort((a, b) => b.estimated - a.estimated);
  }, [expenseCategories, historicalAnalysis, currentMonthExpenses]);

  const totalEstimated = budgetProjection.reduce((sum, item) => sum + item.estimated, 0);
  const totalCurrent = budgetProjection.reduce((sum, item) => sum + item.current, 0);
  const totalVarianceHistorical = totalCurrent - totalEstimated;
  const totalVariancePercentage = totalEstimated > 0 ? (totalVarianceHistorical / totalEstimated) * 100 : 0;

  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  const handleSliceClick = (allocation: BudgetAreaAllocation) => {
    setSelectedAllocation(allocation);
    setDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Orçamento</h1>
            <p className="text-muted-foreground mt-1">
              Planeje e acompanhe sua distribuição financeira
            </p>
          </div>
          <div className="flex gap-2">
            <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
              <SelectTrigger className="w-[140px] rounded-xl">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((month, index) => (
                  <SelectItem key={index} value={index.toString()}>
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
              <SelectTrigger className="w-[100px] rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="wallet" className="space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-3 rounded-2xl bg-muted/50 p-1">
            <TabsTrigger value="wallet" className="flex items-center gap-2 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Wallet className="h-4 w-4" />
              Minha Carteira
            </TabsTrigger>
            <TabsTrigger value="comparison" className="flex items-center gap-2 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <BarChart3 className="h-4 w-4" />
              Orçado x Realizado
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <History className="h-4 w-4" />
              Análise Histórica
            </TabsTrigger>
          </TabsList>

          <TabsContent value="wallet" className="space-y-6">
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-card/40 backdrop-blur-md border-none shadow-sm p-5 transition-all duration-300 hover:shadow-md">
                <p className="text-xs font-medium tracking-wide uppercase text-muted-foreground mb-2">Salário Base</p>
                <p className="text-2xl font-bold text-income tabular-nums">{formatCurrency(effectiveSalary)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {settings?.salaryAutoCalculate !== false ? "Calculado automaticamente" : "Definido manualmente"}
                </p>
              </div>
              <div className="rounded-2xl bg-card/40 backdrop-blur-md border-none shadow-sm p-5 transition-all duration-300 hover:shadow-md">
                <p className="text-xs font-medium tracking-wide uppercase text-muted-foreground mb-2">Total Planejado</p>
                <p className="text-2xl font-bold tabular-nums">{formatCurrency(totalPlanned)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {isBalanced ? "100% distribuído" : "Distribuição incompleta"}
                </p>
              </div>
              <div className="rounded-2xl bg-card/40 backdrop-blur-md border-none shadow-sm p-5 transition-all duration-300 hover:shadow-md">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-xs font-medium tracking-wide uppercase text-muted-foreground">Total Real</p>
                  {totalVariance >= 0 ? (
                    <TrendingUp className="h-3.5 w-3.5 text-destructive" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5 text-income" />
                  )}
                </div>
                <p className="text-2xl font-bold tabular-nums">{formatCurrency(totalActual)}</p>
                <p className={`text-xs mt-1 ${totalVariance >= 0 ? 'text-destructive' : 'text-income'}`}>
                  {totalVariance >= 0 ? '+' : ''}{formatCurrency(totalVariance)} do planejado
                </p>
              </div>
            </div>

            {/* Main Content */}
            <div className="grid gap-6 lg:grid-cols-2">
              <WalletPieChart
                allocations={allocations}
                salary={effectiveSalary}
                onSliceClick={handleSliceClick}
              />

              <div className="space-y-6">
                <SalaryInput
                  settings={settings}
                  transactions={transactions}
                  selectedMonth={selectedMonth}
                  selectedYear={selectedYear}
                  onSave={updateSalary}
                  isUpdating={isUpdating}
                />

                <BudgetAreaConfig
                  areas={budgetAreas}
                  categories={categories}
                  onSavePercentages={updateAllPercentages}
                  onAddCategory={(areaId, categoryId) => addCategoryToArea({ areaId, categoryId })}
                  onRemoveCategory={removeCategoryFromArea}
                  isSaving={isSaving}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="comparison" className="space-y-6">
            <BudgetVsActualTab
              allocations={allocations}
              totalPlanned={totalPlanned}
              totalActual={totalActual}
              salary={effectiveSalary}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              transactions={transactions}
              categories={categories}
            />
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-card/40 backdrop-blur-md border-none shadow-sm p-5 transition-all duration-300 hover:shadow-md">
                <p className="text-xs font-medium tracking-wide uppercase text-muted-foreground mb-2">Orçamento Estimado</p>
                <p className="text-2xl font-bold tabular-nums">{formatCurrency(totalEstimated)}</p>
                <p className="text-xs text-muted-foreground mt-1">Média dos últimos 3 meses</p>
              </div>
              <div className="rounded-2xl bg-card/40 backdrop-blur-md border-none shadow-sm p-5 transition-all duration-300 hover:shadow-md">
                <p className="text-xs font-medium tracking-wide uppercase text-muted-foreground mb-2">Gasto Atual</p>
                <p className="text-2xl font-bold text-foreground tabular-nums">{formatCurrency(totalCurrent)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {months[selectedMonth]} {selectedYear}
                </p>
              </div>
              <div className="rounded-2xl bg-card/40 backdrop-blur-md border-none shadow-sm p-5 transition-all duration-300 hover:shadow-md">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-xs font-medium tracking-wide uppercase text-muted-foreground">Variação</p>
                  {totalVarianceHistorical >= 0 ? (
                    <TrendingUp className="h-3.5 w-3.5 text-destructive" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5 text-income" />
                  )}
                </div>
                <p className={`text-2xl font-bold tabular-nums ${totalVarianceHistorical >= 0 ? 'text-destructive' : 'text-income'}`}>
                  {formatCurrency(Math.abs(totalVarianceHistorical))}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {totalVariancePercentage > 0 ? '+' : ''}{totalVariancePercentage.toFixed(1)}% do orçamento
                </p>
              </div>
            </div>

            <div className="rounded-3xl bg-card/40 backdrop-blur-md border-none shadow-sm p-6 space-y-5 transition-all duration-300">
              <div>
                <h3 className="text-base font-semibold">Projeção por Categoria</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Compare seus gastos atuais com a média histórica
                </p>
              </div>
              <div className="space-y-6">
                {budgetProjection.map((item) => {
                  const progressValue = item.estimated > 0 
                    ? Math.min((item.current / item.estimated) * 100, 100) 
                    : 0;
                  
                  return (
                    <div key={item.category.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-sm">{item.category.name}</h4>
                            {item.isOverBudget && (
                              <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {item.percentageOfTotal.toFixed(1)}% do orçamento total
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-sm tabular-nums">{formatCurrency(item.current)}</p>
                          <p className="text-xs text-muted-foreground tabular-nums">
                            de {formatCurrency(item.estimated)}
                          </p>
                        </div>
                      </div>
                      <Progress 
                        value={progressValue} 
                        className={`h-1.5 ${item.isOverBudget ? "[&>div]:bg-destructive" : ""}`} 
                      />
                      <div className="flex items-center justify-between text-xs">
                        <span className={item.variance >= 0 ? "text-destructive" : "text-income"}>
                          {item.variance >= 0 ? '+' : ''}{formatCurrency(item.variance)}
                          {' '}({item.variancePercentage >= 0 ? '+' : ''}{item.variancePercentage.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-3xl bg-accent/30 backdrop-blur-md border-none shadow-sm p-6 space-y-3 transition-all duration-300">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Como funciona o Orçamento?</h3>
              </div>
              <div className="space-y-2 text-xs text-muted-foreground">
                <p>• O orçamento é calculado automaticamente com base na <strong className="text-foreground">média dos seus gastos dos últimos 3 meses</strong>.</p>
                <p>• Cada categoria mostra quanto você gastou em média e compara com o gasto atual do mês.</p>
                <p>• Categorias marcadas com <AlertCircle className="h-3 w-3 inline text-destructive" /> estão acima da média histórica.</p>
                <p>• Use esta ferramenta para identificar onde você pode economizar e planejar melhor seus gastos futuros.</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <AreaDetailsDialog
          allocation={selectedAllocation}
          transactions={transactions}
          categories={categories}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      </main>
    </div>
  );
};

export default Budget;
