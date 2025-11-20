import { useMemo } from "react";
import { Header } from "@/components/finance/Header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useFinance } from "@/contexts/FinanceContext";
import { 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  CheckCircle2,
  Target,
  Calendar,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Bell,
  X
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { startOfMonth, endOfMonth, subMonths, format, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

const Dashboard = () => {
  const { transactions, categories, goals, alerts, markAlertAsRead, clearAllAlerts } = useFinance();

  const insights = useMemo(() => {
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    // Transações do mês atual
    const currentMonthTransactions = transactions.filter((t) =>
      isWithinInterval(new Date(t.date), { start: currentMonthStart, end: currentMonthEnd })
    );

    // Transações do mês passado
    const lastMonthTransactions = transactions.filter((t) =>
      isWithinInterval(new Date(t.date), { start: lastMonthStart, end: lastMonthEnd })
    );

    const currentIncome = currentMonthTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);

    const currentExpense = currentMonthTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    const lastIncome = lastMonthTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);

    const lastExpense = lastMonthTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    const incomeChange = lastIncome > 0 ? ((currentIncome - lastIncome) / lastIncome) * 100 : 0;
    const expenseChange = lastExpense > 0 ? ((currentExpense - lastExpense) / lastExpense) * 100 : 0;

    // Categoria com mais gastos
    const expensesByCategory: Record<string, number> = {};
    currentMonthTransactions
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        expensesByCategory[t.categoryId] = (expensesByCategory[t.categoryId] || 0) + t.amount;
      });

    const topCategory = Object.entries(expensesByCategory).sort((a, b) => b[1] - a[1])[0];
    const topCategoryName = topCategory
      ? categories.find((c) => c.id === topCategory[0])?.name
      : null;

    // Análise de gastos incomuns
    const avgLastMonthExpense = lastExpense / 30;
    const unusualExpenses = currentMonthTransactions
      .filter((t) => t.type === "expense" && t.amount > avgLastMonthExpense * 2)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3);

    // Previsão de saldo
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysPassed = now.getDate();
    const avgDailyExpense = currentExpense / daysPassed;
    const projectedMonthExpense = avgDailyExpense * daysInMonth;
    const projectedBalance = currentIncome - projectedMonthExpense;

    return {
      currentIncome,
      currentExpense,
      currentBalance: currentIncome - currentExpense,
      incomeChange,
      expenseChange,
      topCategoryName,
      topCategoryAmount: topCategory ? topCategory[1] : 0,
      unusualExpenses,
      projectedBalance,
      projectedMonthExpense,
    };
  }, [transactions, categories]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const activeGoals = goals.filter((g) => g.status === "active");
  const unreadAlerts = alerts.filter((a) => !a.read);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Visão geral das suas finanças e insights inteligentes
          </p>
        </div>

        {/* Alertas */}
        {unreadAlerts.length > 0 && (
          <Card className="border-primary/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">
                    Notificações ({unreadAlerts.length})
                  </CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllAlerts}
                >
                  Limpar Todas
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {unreadAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3 rounded-lg border flex items-start justify-between ${
                    alert.type === "success"
                      ? "bg-income/10 border-income/20"
                      : alert.type === "warning"
                      ? "bg-expense/10 border-expense/20"
                      : "bg-primary/10 border-primary/20"
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {alert.type === "success" ? (
                        <CheckCircle2 className="h-4 w-4 text-income" />
                      ) : alert.type === "warning" ? (
                        <AlertCircle className="h-4 w-4 text-expense" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-primary" />
                      )}
                      <p className="font-semibold text-sm">{alert.title}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">{alert.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(alert.createdAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => markAlertAsRead(alert.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Resumo Mensal */}
        <div className="grid gap-6 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-income" />
                Receitas (mês)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-income">
                {formatCurrency(insights.currentIncome)}
              </p>
              <div className="flex items-center gap-1 mt-1">
                {insights.incomeChange >= 0 ? (
                  <ArrowUpRight className="h-4 w-4 text-income" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-expense" />
                )}
                <span className={`text-xs ${insights.incomeChange >= 0 ? "text-income" : "text-expense"}`}>
                  {Math.abs(insights.incomeChange).toFixed(1)}% vs mês anterior
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-expense" />
                Despesas (mês)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-expense">
                {formatCurrency(insights.currentExpense)}
              </p>
              <div className="flex items-center gap-1 mt-1">
                {insights.expenseChange >= 0 ? (
                  <ArrowUpRight className="h-4 w-4 text-expense" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-income" />
                )}
                <span className={`text-xs ${insights.expenseChange >= 0 ? "text-expense" : "text-income"}`}>
                  {Math.abs(insights.expenseChange).toFixed(1)}% vs mês anterior
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Saldo Atual
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${insights.currentBalance >= 0 ? "text-income" : "text-expense"}`}>
                {formatCurrency(insights.currentBalance)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Este mês
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Projeção
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${insights.projectedBalance >= 0 ? "text-income" : "text-expense"}`}>
                {formatCurrency(insights.projectedBalance)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Fim do mês
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Insights */}
          <Card>
            <CardHeader>
              <CardTitle>Insights Inteligentes</CardTitle>
              <CardDescription>Análise automática dos seus gastos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {insights.topCategoryName && (
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-5 w-5 text-primary" />
                    <p className="font-semibold">Categoria com mais gastos</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Você gastou <span className="font-bold text-expense">{formatCurrency(insights.topCategoryAmount)}</span> em{" "}
                    <span className="font-bold">{insights.topCategoryName}</span> este mês.
                  </p>
                </div>
              )}

              {insights.unusualExpenses.length > 0 && (
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-5 w-5 text-expense" />
                    <p className="font-semibold">Gastos Incomuns</p>
                  </div>
                  <div className="space-y-2">
                    {insights.unusualExpenses.map((t) => (
                      <div key={t.id} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t.description}</span>
                        <span className="font-bold text-expense">{formatCurrency(t.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {insights.projectedMonthExpense > 0 && (
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    <p className="font-semibold">Previsão de Gastos</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Com base no seu ritmo atual, você deve gastar cerca de{" "}
                    <span className="font-bold text-expense">{formatCurrency(insights.projectedMonthExpense)}</span> até o fim do mês.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Metas Ativas */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Metas em Andamento</CardTitle>
                <Target className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeGoals.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma meta ativa. Crie uma meta para começar!
                </p>
              ) : (
                activeGoals.slice(0, 3).map((goal) => {
                  const progress = (goal.currentAmount / goal.targetAmount) * 100;
                  return (
                    <div key={goal.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">{goal.name}</p>
                        <Badge variant="secondary">{progress.toFixed(0)}%</Badge>
                      </div>
                      <Progress value={progress} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{formatCurrency(goal.currentAmount)}</span>
                        <span>{formatCurrency(goal.targetAmount)}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
