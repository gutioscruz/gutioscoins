import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Transaction, Category } from "@/types/finance";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Sector } from "recharts";
import { getCategoryColor, getSubcategoryColor } from "@/lib/categoryColors";

interface ChartDataItem {
  name: string;
  value: number;
  color: string;
  categoryId?: string;
  subcategory?: string;
  transactionCount: number;
}

interface InteractivePieChartProps {
  transactions: Transaction[];
  categories: Category[];
  type: "category" | "subcategory";
  onSliceClick?: (item: ChartDataItem) => void;
  activeIndex?: number;
  onActiveIndexChange?: (index: number | undefined) => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;

  return (
    <g>
      <text x={cx} y={cy - 10} textAnchor="middle" fill="hsl(var(--foreground))" className="text-sm font-medium">
        {payload.name}
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle" fill="hsl(var(--muted-foreground))" className="text-xs">
        {formatCurrency(value)}
      </text>
      <text x={cx} y={cy + 28} textAnchor="middle" fill="hsl(var(--muted-foreground))" className="text-xs">
        {`${(percent * 100).toFixed(1)}%`}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        className="drop-shadow-lg"
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 12}
        outerRadius={outerRadius + 16}
        fill={fill}
      />
    </g>
  );
};

export const InteractivePieChart = ({
  transactions,
  categories,
  type,
  onSliceClick,
  activeIndex,
  onActiveIndexChange,
}: InteractivePieChartProps) => {
  const chartData = useMemo(() => {
    const expenses = transactions.filter((t) => t.type === "expense");

    if (type === "category") {
      const byCategory: Record<string, { value: number; count: number; categoryId: string }> = {};
      
      expenses.forEach((t) => {
        const category = categories.find((c) => c.id === t.categoryId);
        const categoryName = category?.name || "Outros";
        if (!byCategory[categoryName]) {
          byCategory[categoryName] = { value: 0, count: 0, categoryId: t.categoryId };
        }
        byCategory[categoryName].value += t.amount;
        byCategory[categoryName].count += 1;
      });

      return Object.entries(byCategory)
        .map(([name, data]) => ({
          name,
          value: data.value,
          color: getCategoryColor(name),
          categoryId: data.categoryId,
          transactionCount: data.count,
        }))
        .sort((a, b) => b.value - a.value);
    } else {
      const bySubcategory: Record<string, { value: number; count: number; categoryId: string; subcategory: string }> = {};

      expenses
        .filter((t) => t.subcategory)
        .forEach((t) => {
          const category = categories.find((c) => c.id === t.categoryId);
          const key = `${category?.name || "Outros"} - ${t.subcategory}`;
          if (!bySubcategory[key]) {
            bySubcategory[key] = { value: 0, count: 0, categoryId: t.categoryId, subcategory: t.subcategory! };
          }
          bySubcategory[key].value += t.amount;
          bySubcategory[key].count += 1;
        });

      return Object.entries(bySubcategory)
        .map(([name, data]) => {
          const [categoryName, subcategoryName] = name.split(" - ");
          return {
            name,
            value: data.value,
            color: getSubcategoryColor(categoryName, subcategoryName),
            categoryId: data.categoryId,
            subcategory: data.subcategory,
            transactionCount: data.count,
          };
        })
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);
    }
  }, [transactions, categories, type]);

  const total = useMemo(() => chartData.reduce((sum, item) => sum + item.value, 0), [chartData]);

  const handlePieClick = (_: any, index: number) => {
    if (onSliceClick && chartData[index]) {
      onSliceClick(chartData[index]);
    }
  };

  const handleMouseEnter = (_: any, index: number) => {
    onActiveIndexChange?.(index);
  };

  const handleMouseLeave = () => {
    onActiveIndexChange?.(undefined);
  };

  const title = type === "category" ? "Despesas por Categoria" : "Gastos por Subcategoria";
  const description = type === "category" 
    ? "Clique em uma fatia para ver detalhes" 
    : `Top 10 subcategorias • Total: ${formatCurrency(total)}`;

  if (chartData.length === 0) {
    return (
      <Card className="border-none shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            {type === "category" ? "Nenhuma despesa registrada" : "Nenhuma transação com subcategoria encontrada"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="pb-4">
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              activeIndex={activeIndex}
              activeShape={renderActiveShape}
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
              onClick={handlePieClick}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              className="cursor-pointer outline-none"
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color} 
                  className="transition-all duration-200 hover:opacity-80"
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string, props: any) => [
                formatCurrency(value),
                `${name} (${props.payload.transactionCount} transações)`,
              ]}
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="space-y-1.5 mt-2 max-h-[180px] overflow-y-auto">
          {chartData.map((item, index) => (
            <button
              key={item.name}
              className="flex items-center justify-between w-full px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors text-left"
              onClick={() => onSliceClick?.(item)}
              onMouseEnter={() => onActiveIndexChange?.(index)}
              onMouseLeave={() => onActiveIndexChange?.(undefined)}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-foreground truncate">{item.name}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                <span className="text-xs text-muted-foreground">
                  {((item.value / total) * 100).toFixed(1)}%
                </span>
                <span className="text-sm font-medium text-foreground">{formatCurrency(item.value)}</span>
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
