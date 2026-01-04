import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useFinance } from "@/contexts/FinanceContext";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, AlertCircle, Calendar, Wallet, History } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SalaryInput } from "@/components/budget/SalaryInput";
import { WalletPieChart } from "@/components/budget/WalletPieChart";
import { BudgetAreaConfig } from "@/components/budget/BudgetAreaConfig";
import { AreaDetailsDialog } from "@/components/budget/AreaDetailsDialog";
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

  // Initialize default areas on first access
  useEffect(() => {
    if (!isLoadingAreas && budgetAreas.length === 0 && !isInitializing) {
      initializeDefaultAreas();
    }
  }, [isLoadingAreas, budgetAreas.length, isInitializing, initializeDefaultAreas]);

  // Calculate salary
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

  // Budget allocation calculations
  const { allocations, totalPlanned, totalActual, totalVariance, isBalanced } = useBudgetAllocation({
    transactions,
    budgetAreas,
    categories,
    salary: effectiveSalary,
    selectedMonth,
    selectedYear,
  });

  // Historical analysis (existing functionality)
  const expenseCategories = categories.filter(c => c.type === "expense");

  const historicalAnalysis = useMemo(() => {
    const analysis: Record<string, { total: number; count: number; average: number }> = {};
    
    expenseCategories.forEach(category => {
      const last3MonthsTransactions = transactions.filter(t => {
        const transDate = new Date(t.date);
        const monthsAgo = 3;
        const thresholdDate = new Date();
        thresholdDate.setMonth(thresholdDate.getMonth() - monthsAgo);
        
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
              <SelectTrigger className="w-[140px]">
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
              <SelectTrigger className="w-[100px]">
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
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="wallet" className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Minha Carteira
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Análise Histórica
            </TabsTrigger>
          </TabsList>

          <TabsContent value="wallet" className="space-y-6">
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Salário Base</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-income">{formatCurrency(effectiveSalary)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {settings?.salaryAutoCalculate !== false ? "Calculado automaticamente" : "Definido manualmente"}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Planejado</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{formatCurrency(totalPlanned)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isBalanced ? "100% distribuído" : "Distribuição incompleta"}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Real</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    {totalVariance >= 0 ? (
                      <TrendingUp className="h-5 w-5 text-destructive" />
                    ) : (
                      <TrendingDown className="h-5 w-5 text-income" />
                    )}
                    <p className="text-2xl font-bold">{formatCurrency(totalActual)}</p>
                  </div>
                  <p className={`text-xs mt-1 ${totalVariance >= 0 ? 'text-destructive' : 'text-income'}`}>
                    {totalVariance >= 0 ? '+' : ''}{formatCurrency(totalVariance)} do planejado
                  </p>
                </CardContent>
              </Card>
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

          <TabsContent value="history" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Orçamento Estimado</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{formatCurrency(totalEstimated)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Média dos últimos 3 meses</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Gasto Atual</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-expense">{formatCurrency(totalCurrent)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {months[selectedMonth]} {selectedYear}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Variação</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    {totalVarianceHistorical >= 0 ? (
                      <TrendingUp className="h-5 w-5 text-destructive" />
                    ) : (
                      <TrendingDown className="h-5 w-5 text-income" />
                    )}
                    <p className={`text-3xl font-bold ${totalVarianceHistorical >= 0 ? 'text-destructive' : 'text-income'}`}>
                      {formatCurrency(Math.abs(totalVarianceHistorical))}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {totalVariancePercentage > 0 ? '+' : ''}{totalVariancePercentage.toFixed(1)}% do orçamento
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Projeção por Categoria</CardTitle>
                <CardDescription>
                  Compare seus gastos atuais com a média histórica
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {budgetProjection.map((item) => {
                  const progressValue = item.estimated > 0 
                    ? Math.min((item.current / item.estimated) * 100, 100) 
                    : 0;
                  
                  return (
                    <div key={item.category.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{item.category.name}</h4>
                            {item.isOverBudget && (
                              <AlertCircle className="h-4 w-4 text-destructive" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {item.percentageOfTotal.toFixed(1)}% do orçamento total
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(item.current)}</p>
                          <p className="text-xs text-muted-foreground">
                            de {formatCurrency(item.estimated)}
                          </p>
                        </div>
                      </div>
                      <Progress 
                        value={progressValue} 
                        className={item.isOverBudget ? "[&>div]:bg-destructive" : ""} 
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
              </CardContent>
            </Card>

            <Card className="bg-muted/50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Como funciona o Orçamento?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>
                  • O orçamento é calculado automaticamente com base na <strong>média dos seus gastos dos últimos 3 meses</strong>.
                </p>
                <p>
                  • Cada categoria mostra quanto você gastou em média e compara com o gasto atual do mês.
                </p>
                <p>
                  • Categorias marcadas com <AlertCircle className="h-3 w-3 inline text-destructive" /> estão acima da média histórica.
                </p>
                <p>
                  • Use esta ferramenta para identificar onde você pode economizar e planejar melhor seus gastos futuros.
                </p>
              </CardContent>
            </Card>
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
