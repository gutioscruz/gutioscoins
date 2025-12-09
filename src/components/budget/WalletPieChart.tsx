import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart as PieChartIcon } from "lucide-react";
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
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const chartData = allocations.map((a) => ({
    name: a.area.name,
    value: a.area.percentage,
    plannedAmount: a.plannedAmount,
    actualAmount: a.actualAmount,
    color: a.area.color,
    allocation: a,
  }));

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
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <PieChartIcon className="h-4 w-4" />
          Distribuição da Carteira
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                onClick={(_, index) => onSliceClick(chartData[index].allocation)}
                className="cursor-pointer"
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    stroke="transparent"
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Salário</p>
              <p className="text-lg font-bold">{formatCurrency(salary)}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-4">
          {allocations.map((a) => (
            <button
              key={a.area.id}
              onClick={() => onSliceClick(a)}
              className="flex items-center gap-2 p-2 rounded-md hover:bg-muted transition-colors text-left"
            >
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: a.area.color }}
              />
              <div className="min-w-0">
                <p className="text-xs font-medium truncate">{a.area.name}</p>
                <p className="text-xs text-muted-foreground">{a.area.percentage}%</p>
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
