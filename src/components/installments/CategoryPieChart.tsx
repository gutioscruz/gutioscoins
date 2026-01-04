import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { CategoryBreakdown } from "@/hooks/useInstallments";
import { formatCurrency } from "@/lib/utils";

interface CategoryPieChartProps {
  data: CategoryBreakdown[];
}

export function CategoryPieChart({ data }: CategoryPieChartProps) {
  const chartData = data.map((item) => ({
    name: item.categoryName,
    value: item.remainingAmount,
    count: item.count,
    color: item.color,
  }));

  const totalRemaining = data.reduce((sum, item) => sum + item.remainingAmount, 0);

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Por Categoria</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <p className="text-muted-foreground">Sem dados disponíveis</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Por Categoria</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => [formatCurrency(value), "Restante"]}
              contentStyle={{
                backgroundColor: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
            />
            <Legend
              formatter={(value, entry: any) => {
                const percentage = ((entry.payload.value / totalRemaining) * 100).toFixed(0);
                return `${value} (${percentage}%)`;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
