import { useMemo } from "react";
import { Progress } from "@/components/ui/progress";
import { Target } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface ReserveGaugeProps {
  currentIncome: number;
  currentExpense: number;
  targetPercentage?: number;
  simulatedIncome?: number | null;
}

export const ReserveGauge = ({
  currentIncome,
  currentExpense,
  targetPercentage = 20,
  simulatedIncome,
}: ReserveGaugeProps) => {
  const data = useMemo(() => {
    const income = simulatedIncome ?? currentIncome;
    const targetAmount = income * (targetPercentage / 100);
    const saved = Math.max(income - currentExpense, 0);
    const progress = targetAmount > 0 ? Math.min((saved / targetAmount) * 100, 100) : 0;
    const isOnTrack = saved >= targetAmount;

    return { income, targetAmount, saved, progress, isOnTrack };
  }, [currentIncome, currentExpense, targetPercentage, simulatedIncome]);

  return (
    <div className="rounded-3xl bg-card/40 backdrop-blur-md border-none shadow-sm p-6 transition-all duration-300 hover:shadow-md">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Meta Consolação: {targetPercentage}% da Renda</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {data.isOnTrack ? "🎯 No caminho certo!" : "⚡ Continue focando!"}
          </p>
        </div>
        <div className="flex items-center justify-center w-9 h-9 rounded-2xl bg-purple-500/10">
          <Target className="h-4 w-4 text-purple-500" />
        </div>
      </div>

      <div className="space-y-3">
        <Progress
          value={data.progress}
          className="h-3 rounded-full"
        />
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">
            Guardado: <span className={`font-semibold tabular-nums tracking-tight ${data.isOnTrack ? "text-income" : "text-foreground"}`}>{formatCurrency(data.saved)}</span>
          </span>
          <span className="text-muted-foreground">
            Meta: <span className="font-semibold tabular-nums tracking-tight text-foreground">{formatCurrency(data.targetAmount)}</span>
          </span>
        </div>
        <div className="text-[11px] tabular-nums tracking-tight text-muted-foreground">
          Base: {formatCurrency(data.income)} · Despesas: {formatCurrency(currentExpense)}
        </div>
      </div>
    </div>
  );
};
