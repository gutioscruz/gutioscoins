import { useMemo } from "react";
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
import { CardSummaryWidget } from "@/components/finance/CardSummaryWidget";

const Dashboard = () => {
  const { transactions, categories, goals, alerts, markAlertAsRead, clearAllAlerts } = useFinance();

  const insights = useMemo(() => {
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    const currentMonthTransactions = transactions.filter((t) =>
      isWithinInterval(new Date(t.date), { start: currentMonthStart, end: currentMonthEnd })
    );

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

    const avgLastMonthExpense = lastExpense / 30;
    const unusualExpenses = currentMonthTransactions
      .filter((t) => t.type === "expense" && t.amount > avgLastMonthExpense * 2)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3);

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
      <main className="container mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Visão geral das suas finanças e insights inteligentes
          </p>
        </div>

        {/* Alertas */}
        {unreadAlerts.length > 0 && (
          <div className="rounded-3xl bg-card/40 backdrop-blur-md border-none shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-9 h-9 rounded-2xl bg-primary/10">
                  <Bell className="h-4 w-4 text-primary" />
                </div>
                <h3 className="text-base font-semibold">
                  Notificações ({unreadAlerts.length})
                </h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:bg-accent/50 rounded-xl"
                onClick={clearAllAlerts}
              >
                Limpar Todas
              </Button>
            </div>
            <div className="space-y-3">
              {unreadAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-2xl flex items-start justify-between transition-all duration-300 ${
                    alert.type === "success"
                      ? "bg-income/5"
                      : alert.type === "warning"
                      ? "bg-destructive/5"
                      : "bg-primary/5"
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {alert.type === "success" ? (
                        <CheckCircle2 className="h-4 w-4 text-income" />
                      ) : alert.type === "warning" ? (
                        <AlertCircle className="h-4 w-4 text-destructive" />
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
                    className="h-7 w-7 p-0 rounded-full hover:bg-accent/50"
                    onClick={() => markAlertAsRead(alert.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Resumo Mensal */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl bg-card/40 backdrop-blur-md border-none shadow-sm p-5 transition-all duration-300 hover:shadow-md">
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs font-medium tracking-wide uppercase text-muted-foreground">Receitas (mês)</p>
              <div className="flex items-center justify-center w-9 h-9 rounded-2xl bg-income/10">
                <DollarSign className="h-4 w-4 text-income" />
              </div>
            </div>
            <p className="text-2xl font-bold text-income tabular-nums">
              {formatCurrency(insights.currentIncome)}
            </p>
            <div className="flex items-center gap-1 mt-2">
              {insights.incomeChange >= 0 ? (
                <ArrowUpRight className="h-3.5 w-3.5 text-income" />
              ) : (
                <ArrowDownRight className="h-3.5 w-3.5 text-destructive" />
              )}
              <span className={`text-xs ${insights.incomeChange >= 0 ? "text-income" : "text-destructive"}`}>
                {Math.abs(insights.incomeChange).toFixed(1)}% vs mês anterior
              </span>
            </div>
          </div>

          <div className="rounded-2xl bg-card/40 backdrop-blur-md border-none shadow-sm p-5 transition-all duration-300 hover:shadow-md">
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs font-medium tracking-wide uppercase text-muted-foreground">Despesas (mês)</p>
              <div className="flex items-center justify-center w-9 h-9 rounded-2xl bg-muted/50">
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground tabular-nums">
              {formatCurrency(insights.currentExpense)}
            </p>
            <div className="flex items-center gap-1 mt-2">
              {insights.expenseChange >= 0 ? (
                <ArrowUpRight className="h-3.5 w-3.5 text-foreground" />
              ) : (
                <ArrowDownRight className="h-3.5 w-3.5 text-income" />
              )}
              <span className={`text-xs ${insights.expenseChange >= 0 ? "text-foreground" : "text-income"}`}>
                {Math.abs(insights.expenseChange).toFixed(1)}% vs mês anterior
              </span>
            </div>
          </div>

          <div className="rounded-2xl bg-card/40 backdrop-blur-md border-none shadow-sm p-5 transition-all duration-300 hover:shadow-md">
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs font-medium tracking-wide uppercase text-muted-foreground">Saldo Atual</p>
              <div className="flex items-center justify-center w-9 h-9 rounded-2xl bg-primary/10">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
            </div>
            <p className={`text-2xl font-bold tabular-nums ${insights.currentBalance >= 0 ? "text-income" : "text-destructive"}`}>
              {formatCurrency(insights.currentBalance)}
            </p>
            <p className="text-xs text-muted-foreground mt-2">Este mês</p>
          </div>

          <div className="rounded-2xl bg-card/40 backdrop-blur-md border-none shadow-sm p-5 transition-all duration-300 hover:shadow-md">
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs font-medium tracking-wide uppercase text-muted-foreground">Projeção</p>
              <div className="flex items-center justify-center w-9 h-9 rounded-2xl bg-accent/50">
                <Calendar className="h-4 w-4 text-accent-foreground" />
              </div>
            </div>
            <p className={`text-2xl font-bold tabular-nums ${insights.projectedBalance >= 0 ? "text-income" : "text-destructive"}`}>
              {formatCurrency(insights.projectedBalance)}
            </p>
            <p className="text-xs text-muted-foreground mt-2">Fim do mês</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Card Summary Widget */}
          <CardSummaryWidget />

          {/* Insights */}
          <div className="rounded-3xl bg-card/40 backdrop-blur-md border-none shadow-sm p-6 space-y-5 transition-all duration-300">
            <div>
              <h3 className="text-base font-semibold text-foreground">Insights Inteligentes</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Análise automática dos seus gastos</p>
            </div>
            <div className="space-y-4">
              {insights.topCategoryName && (
                <div className="p-4 rounded-2xl bg-accent/30">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-4 w-4 text-primary" />
                    <p className="font-semibold text-sm">Categoria com mais gastos</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Você gastou <span className="font-bold text-foreground">{formatCurrency(insights.topCategoryAmount)}</span> em{" "}
                    <span className="font-bold">{insights.topCategoryName}</span> este mês.
                  </p>
                </div>
              )}

              {insights.unusualExpenses.length > 0 && (
                <div className="p-4 rounded-2xl bg-accent/30">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-foreground" />
                    <p className="font-semibold text-sm">Gastos Incomuns</p>
                  </div>
                  <div className="space-y-2">
                    {insights.unusualExpenses.map((t) => (
                      <div key={t.id} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t.description}</span>
                        <span className="font-bold text-foreground tabular-nums">{formatCurrency(t.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {insights.projectedMonthExpense > 0 && (
                <div className="p-4 rounded-2xl bg-accent/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    <p className="font-semibold text-sm">Previsão de Gastos</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Com base no seu ritmo atual, você deve gastar cerca de{" "}
                    <span className="font-bold text-foreground">{formatCurrency(insights.projectedMonthExpense)}</span> até o fim do mês.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Metas Ativas */}
          <div className="rounded-3xl bg-card/40 backdrop-blur-md border-none shadow-sm p-6 space-y-5 transition-all duration-300">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-foreground">Metas em Andamento</h3>
              <div className="flex items-center justify-center w-9 h-9 rounded-2xl bg-primary/10">
                <Target className="h-4 w-4 text-primary" />
              </div>
            </div>
            <div className="space-y-4">
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
                        <Badge variant="secondary" className="rounded-full text-xs">{progress.toFixed(0)}%</Badge>
                      </div>
                      <Progress value={progress} className="h-1.5" />
                      <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
                        <span>{formatCurrency(goal.currentAmount)}</span>
                        <span>{formatCurrency(goal.targetAmount)}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
