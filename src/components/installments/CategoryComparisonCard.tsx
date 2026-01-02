import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PieChart } from "lucide-react";
import { CategoryBreakdown } from "@/hooks/useInstallments";

interface CategoryComparisonCardProps {
  data: CategoryBreakdown[];
}

export function CategoryComparisonCard({ data }: CategoryComparisonCardProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);

  const totalRemaining = data.reduce((sum, item) => sum + item.remainingAmount, 0);

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <PieChart className="h-5 w-5 text-primary" />
            Parcelamentos por Categoria
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Sem dados disponíveis</p>
        </CardContent>
      </Card>
    );
  }

  const colors = [
    "bg-chart-1",
    "bg-chart-2",
    "bg-chart-3",
    "bg-chart-4",
    "bg-chart-5",
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <PieChart className="h-5 w-5 text-primary" />
          Parcelamentos por Categoria
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.slice(0, 5).map((category, index) => {
          const percentage = (category.remainingAmount / totalRemaining) * 100;

          return (
            <div key={category.categoryId} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{category.categoryName}</span>
                <span className="text-muted-foreground">
                  {formatCurrency(category.remainingAmount)} ({Math.round(percentage)}%)
                </span>
              </div>
              <Progress
                value={percentage}
                className="h-2"
                indicatorClassName={colors[index % colors.length]}
              />
            </div>
          );
        })}

        {data.length > 5 && (
          <p className="text-sm text-muted-foreground pt-2">
            + {data.length - 5} outras categorias
          </p>
        )}
      </CardContent>
    </Card>
  );
}
