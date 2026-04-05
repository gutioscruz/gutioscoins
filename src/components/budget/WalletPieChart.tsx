import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart as PieChartIcon } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { BudgetAreaAllocation } from "@/types/finance";

interface WalletPieChartProps {
  allocations: BudgetAreaAllocation[];
  salary: number;
  onSliceClick: (allocation: BudgetAreaAllocation) => void;
}

export const WalletPieChart = ({
  allocations,
  salary,
  onSliceClick,
}: WalletPieChartProps) => {
  const chartData = allocations.map((a) => ({
    name: a.area.name,
    value: a.area.percentage,
    plannedAmount: a.plannedAmount,
    actualAmount: a.actualAmount,
    color: a.area.color,
    allocation: a,
  }));

  const totalPercentage = allocations.reduce((sum, a) => sum + a.area.percentage, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm text-muted-foreground">{data.value}% do salário</p>
          <p className="text-sm">Planejado: {formatCurrency(data.plannedAmount)}</p>
          <p className="text-sm">
            Real:{" "}
            <span
              className={
                data.actualAmount > data.plannedAmount
                  ? "text-destructive"
                  : "text-income"
              }
            >
              {formatCurrency(data.actualAmount)}
            </span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <PieChartIcon className="h-4 w-4" />
          Visualização de Uso
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        <div className="relative w-full h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={110}
                paddingAngle={3}
                dataKey="value"
                onClick={(_, index) => onSliceClick(chartData[index].allocation)}
                className="cursor-pointer outline-none"
                stroke="none"
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    className="outline-none focus:outline-none hover:opacity-90 transition-opacity"
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <p className="text-3xl font-bold">{totalPercentage}%</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-4 w-full max-w-xs">
          {allocations.map((a) => (
            <button
              key={a.area.id}
              onClick={() => onSliceClick(a)}
              className="flex items-center gap-2 py-1.5 hover:opacity-80 transition-opacity text-left"
            >
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: a.area.color }}
              />
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm truncate">{a.area.name}</span>
                <span className="text-sm font-semibold text-muted-foreground">{a.area.percentage}%</span>
              </div>
            </button>
          ))}
        </div>

        <p className="text-xs text-muted-foreground mt-4">
          Salário base: {formatCurrency(salary)}
        </p>
      </CardContent>
    </Card>
  );
};
