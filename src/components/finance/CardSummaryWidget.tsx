import { useMemo } from "react";
import { useFinance } from "@/contexts/FinanceContext";
import { CreditCard } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/utils";

export const CardSummaryWidget = () => {
  const { banks } = useFinance();

  const cardStats = useMemo(() => {
    const allCards = banks.flatMap(b => b.cards || []);
    const totalLimit = allCards.reduce((sum, card) => sum + card.limit, 0);
    const totalUsed = allCards.reduce((sum, card) => sum + card.used, 0);
    const totalAvailable = totalLimit - totalUsed;
    const utilizationRate = totalLimit > 0 ? (totalUsed / totalLimit) * 100 : 0;
    return { totalCards: allCards.length, totalLimit, totalUsed, totalAvailable, utilizationRate };
  }, [banks]);

  if (cardStats.totalCards === 0) return null;

  return (
    <div className="rounded-2xl bg-card/60 backdrop-blur-sm border-none shadow-sm p-5 space-y-4 transition-all duration-300">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">Resumo de Cartões</h3>
        <div className="flex items-center justify-center w-9 h-9 rounded-2xl bg-primary/10">
          <CreditCard className="h-4 w-4 text-primary" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-muted-foreground">Limite Total</p>
          <p className="text-lg font-bold text-foreground tabular-nums">{formatCurrency(cardStats.totalLimit)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Disponível</p>
          <p className="text-lg font-bold text-income tabular-nums">{formatCurrency(cardStats.totalAvailable)}</p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Utilização</span>
          <span className="font-semibold text-foreground">{cardStats.utilizationRate.toFixed(1)}%</span>
        </div>
        <Progress value={cardStats.utilizationRate} className="h-1.5" />
        <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
          <span>{formatCurrency(cardStats.totalUsed)}</span>
          <span>{formatCurrency(cardStats.totalLimit)}</span>
        </div>
      </div>

      {cardStats.utilizationRate > 80 && (
        <div className="p-3 rounded-xl bg-destructive/10">
          <p className="text-xs text-destructive font-medium">
            ⚠️ Você está usando mais de 80% do seu limite total.
          </p>
        </div>
      )}
    </div>
  );
};
