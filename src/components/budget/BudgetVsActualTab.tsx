import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Target, Lightbulb } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { BudgetAreaAllocation, Category, Transaction } from "@/types/finance";
import { BudgetComparisonPieCharts } from "./BudgetComparisonPieCharts";

interface BudgetVsActualTabProps {
  allocations: BudgetAreaAllocation[];
  totalPlanned: number;
  totalActual: number;
  salary: number;
  selectedMonth: number;
  selectedYear: number;
  transactions: Transaction[];
  categories: Category[];
}

export const BudgetVsActualTab = ({
  allocations,
  totalPlanned,
  totalActual,
  salary,
  selectedMonth,
  selectedYear,
}: BudgetVsActualTabProps) => {
  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  // Analysis data
  const analysis = useMemo(() => {
    const overBudgetAreas = allocations.filter(a => a.actualAmount > a.plannedAmount && a.plannedAmount > 0);
    const underBudgetAreas = allocations.filter(a => a.actualAmount < a.plannedAmount && a.plannedAmount > 0);
    const onTrackAreas = allocations.filter(a => {
      const variance = Math.abs(a.variancePercentage);
      return variance <= 10 && a.plannedAmount > 0;
    });
    
    const totalVariance = totalActual - totalPlanned;
    const variancePercentage = totalPlanned > 0 ? (totalVariance / totalPlanned) * 100 : 0;
    const savingsRate = salary > 0 ? ((salary - totalActual) / salary) * 100 : 0;

    return {
      overBudgetAreas,
      underBudgetAreas,
      onTrackAreas,
      totalVariance,
      variancePercentage,
      savingsRate,
    };
  }, [allocations, totalPlanned, totalActual, salary]);

  // Recommendations based on analysis
  const recommendations = useMemo(() => {
    const tips: string[] = [];
    
    if (analysis.overBudgetAreas.length > 0) {
      const topOverBudget = analysis.overBudgetAreas.sort((a, b) => b.variance - a.variance)[0];
      tips.push(`Reduza gastos em "${topOverBudget.area.name}" - estourou ${formatCurrency(Math.abs(topOverBudget.variance))} do planejado.`);
    }
    
    if (analysis.savingsRate < 10 && salary > 0) {
      tips.push("Sua taxa de poupança está abaixo de 10%. Considere revisar seus gastos para aumentar reservas.");
    }
    
    if (analysis.underBudgetAreas.length > 2) {
      const totalSaved = analysis.underBudgetAreas.reduce((sum, a) => sum + Math.abs(a.variance), 0);
      tips.push(`Você economizou ${formatCurrency(totalSaved)} em ${analysis.underBudgetAreas.length} áreas. Considere realocar para investimentos.`);
    }

    if (analysis.variancePercentage > 20) {
      tips.push("Seus gastos estão 20% acima do planejado. Revise seu orçamento ou reduza despesas.");
    }

    if (tips.length === 0) {
      tips.push("Parabéns! Suas finanças estão bem equilibradas este mês. Continue assim!");
    }

    return tips;
  }, [analysis, salary]);

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Orçado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalPlanned)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {months[selectedMonth]} {selectedYear}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {analysis.totalVariance > 0 ? (
                <TrendingUp className="h-4 w-4 text-destructive" />
              ) : (
                <TrendingDown className="h-4 w-4 text-income" />
              )}
              Realizado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalActual)}</p>
            <p className={`text-xs mt-1 ${analysis.totalVariance > 0 ? 'text-destructive' : 'text-income'}`}>
              {analysis.totalVariance > 0 ? '+' : ''}{formatCurrency(analysis.totalVariance)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Áreas Estouradas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">{analysis.overBudgetAreas.length}</p>
            <p className="text-xs text-muted-foreground mt-1">
              de {allocations.filter(a => a.plannedAmount > 0).length} áreas ativas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Poupança</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${analysis.savingsRate >= 10 ? 'text-income' : 'text-destructive'}`}>
              {analysis.savingsRate.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              do salário base
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pie Charts Comparison */}
      <BudgetComparisonPieCharts allocations={allocations} salary={salary} />

      {/* Detailed Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Comparativo por Área</CardTitle>
          <CardDescription>
            Orçado vs Realizado para cada área do seu orçamento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {allocations
            .filter(a => a.plannedAmount > 0 || a.actualAmount > 0)
            .sort((a, b) => b.plannedAmount - a.plannedAmount)
            .map((allocation) => {
              const isOverBudget = allocation.actualAmount > allocation.plannedAmount;
              const progressValue = allocation.plannedAmount > 0 
                ? Math.min((allocation.actualAmount / allocation.plannedAmount) * 100, 150)
                : allocation.actualAmount > 0 ? 100 : 0;
              const isOnTrack = Math.abs(allocation.variancePercentage) <= 10;

              return (
                <div key={allocation.area.id} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: allocation.area.color }}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{allocation.area.name}</h4>
                          {isOverBudget && (
                            <Badge variant="destructive" className="text-xs">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Estouro
                            </Badge>
                          )}
                          {isOnTrack && !isOverBudget && allocation.plannedAmount > 0 && (
                            <Badge variant="outline" className="text-xs text-income border-income">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              No Limite
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {allocation.area.percentage}% do orçamento
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Orçado</p>
                          <p className="font-medium">{formatCurrency(allocation.plannedAmount)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Realizado</p>
                          <p className={`font-medium ${isOverBudget ? 'text-destructive' : 'text-income'}`}>
                            {formatCurrency(allocation.actualAmount)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="relative">
                    <Progress 
                      value={Math.min(progressValue, 100)} 
                      className={`h-3 ${isOverBudget ? "[&>div]:bg-destructive" : "[&>div]:bg-income"}`}
                    />
                    {progressValue > 100 && (
                      <div 
                        className="absolute top-0 left-0 h-3 bg-destructive/30 rounded-full"
                        style={{ width: `${Math.min(progressValue, 150)}%` }}
                      />
                    )}
                  </div>
                  
                  <div className="flex justify-between text-xs">
                    <span className={allocation.variance > 0 ? "text-destructive" : "text-income"}>
                      {allocation.variance > 0 ? '+' : ''}{formatCurrency(allocation.variance)}
                      {' '}({allocation.variancePercentage > 0 ? '+' : ''}{allocation.variancePercentage.toFixed(1)}%)
                    </span>
                    <span className="text-muted-foreground">
                      {progressValue.toFixed(0)}% utilizado
                    </span>
                  </div>
                </div>
              );
            })}
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            Insights e Recomendações
          </CardTitle>
          <CardDescription>
            Análise automática baseada no seu desempenho este mês
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {recommendations.map((tip, index) => (
            <div key={index} className="flex items-start gap-3 p-3 bg-background rounded-lg">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-medium text-primary">{index + 1}</span>
              </div>
              <p className="text-sm">{tip}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Summary by Status */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-destructive flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Áreas Estouradas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analysis.overBudgetAreas.length > 0 ? (
              <div className="space-y-2">
                {analysis.overBudgetAreas.slice(0, 3).map(a => (
                  <div key={a.area.id} className="flex justify-between text-sm">
                    <span>{a.area.name}</span>
                    <span className="text-destructive font-medium">+{formatCurrency(a.variance)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma área estourada 🎉</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-income flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Economias
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analysis.underBudgetAreas.length > 0 ? (
              <div className="space-y-2">
                {analysis.underBudgetAreas.slice(0, 3).map(a => (
                  <div key={a.area.id} className="flex justify-between text-sm">
                    <span>{a.area.name}</span>
                    <span className="text-income font-medium">{formatCurrency(Math.abs(a.variance))}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma economia ainda</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              No Limite (±10%)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analysis.onTrackAreas.length > 0 ? (
              <div className="space-y-2">
                {analysis.onTrackAreas.slice(0, 3).map(a => (
                  <div key={a.area.id} className="flex justify-between text-sm">
                    <span>{a.area.name}</span>
                    <span className="text-muted-foreground">{a.variancePercentage.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma área no limite</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
