import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFinance } from "@/contexts/FinanceContext";
import { CreditCard } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export const CardSummaryWidget = () => {
  const { banks } = useFinance();

  const cardStats = useMemo(() => {
    const allCards = banks.flatMap(b => b.cards || []);
    
    const totalLimit = allCards.reduce((sum, card) => sum + card.limit, 0);
    const totalUsed = allCards.reduce((sum, card) => sum + card.used, 0);
    const totalAvailable = totalLimit - totalUsed;
    const utilizationRate = totalLimit > 0 ? (totalUsed / totalLimit) * 100 : 0;

    return {
      totalCards: allCards.length,
      totalLimit,
      totalUsed,
      totalAvailable,
      utilizationRate,
    };
  }, [banks]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  if (cardStats.totalCards === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Resumo de Cartões</CardTitle>
          <CreditCard className="h-5 w-5 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Limite Total</p>
            <p className="text-xl font-bold">{formatCurrency(cardStats.totalLimit)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Disponível</p>
            <p className="text-xl font-bold text-income">{formatCurrency(cardStats.totalAvailable)}</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Utilização</span>
            <span className="font-semibold">{cardStats.utilizationRate.toFixed(1)}%</span>
          </div>
          <Progress 
            value={cardStats.utilizationRate} 
            className="h-2"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatCurrency(cardStats.totalUsed)}</span>
            <span>{formatCurrency(cardStats.totalLimit)}</span>
          </div>
        </div>

        {cardStats.utilizationRate > 80 && (
          <div className="p-3 rounded-lg bg-expense/10 border border-expense/20">
            <p className="text-sm text-expense font-medium">
              ⚠️ Atenção: Você está usando mais de 80% do seu limite total de crédito.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
