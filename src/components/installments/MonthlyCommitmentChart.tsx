import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { MonthlyCommitment } from "@/hooks/useInstallments";

interface MonthlyCommitmentChartProps {
  data: MonthlyCommitment[];
}

export function MonthlyCommitmentChart({ data }: MonthlyCommitmentChartProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);

  const maxAmount = Math.max(...data.map((d) => d.amount), 1);

  if (data.every((d) => d.amount === 0)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Comprometimento Mensal</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <p className="text-muted-foreground">Sem parcelas futuras</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Comprometimento Mensal</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <XAxis
              dataKey="monthLabel"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) =>
                new Intl.NumberFormat("pt-BR", {
                  notation: "compact",
                  compactDisplay: "short",
                }).format(value)
              }
            />
            <Tooltip
              formatter={(value: number) => [formatCurrency(value), "Comprometido"]}
              labelFormatter={(label) => `Mês: ${label}`}
              contentStyle={{
                backgroundColor: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
            />
            <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    entry.amount === 0
                      ? "hsl(var(--muted))"
                      : entry.amount > maxAmount * 0.7
                      ? "hsl(var(--destructive))"
                      : entry.amount > maxAmount * 0.4
                      ? "hsl(var(--chart-3))"
                      : "hsl(var(--primary))"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
