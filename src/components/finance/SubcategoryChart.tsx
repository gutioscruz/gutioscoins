import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Transaction, Category } from "@/types/finance";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface SubcategoryChartProps {
  transactions: Transaction[];
  categories: Category[];
}

const COLORS = [
  "#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444",
  "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#6366f1"
];

export const SubcategoryChart = ({ transactions, categories }: SubcategoryChartProps) => {
  const subcategoryData = useMemo(() => {
    const expensesBySubcategory: Record<string, number> = {};
    
    transactions
      .filter(t => t.type === "expense" && t.subcategory)
      .forEach(t => {
        const category = categories.find(c => c.id === t.categoryId);
        const key = t.subcategory ? `${category?.name} - ${t.subcategory}` : category?.name || "Outros";
        expensesBySubcategory[key] = (expensesBySubcategory[key] || 0) + t.amount;
      });

    return Object.entries(expensesBySubcategory)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // Top 10 subcategories
  }, [transactions, categories]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const total = subcategoryData.reduce((sum, item) => sum + item.value, 0);

  if (subcategoryData.length === 0) {
    return (
      <Card className="border-none shadow-md">
        <CardHeader>
          <CardTitle>Gastos por Subcategoria</CardTitle>
          <CardDescription>Análise detalhada por subcategorias</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            Nenhuma transação com subcategoria encontrada
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-md">
      <CardHeader>
        <CardTitle>Gastos por Subcategoria</CardTitle>
        <CardDescription>
          Distribuição detalhada dos gastos • Total: {formatCurrency(total)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={subcategoryData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {subcategoryData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{
                backgroundColor: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value, entry: any) => {
                const percent = ((entry.payload.value / total) * 100).toFixed(1);
                return `${value} (${percent}%)`;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
