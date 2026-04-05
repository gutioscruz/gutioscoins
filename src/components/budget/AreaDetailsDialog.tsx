import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { BudgetAreaAllocation, Transaction, Category } from "@/types/finance";

interface AreaDetailsDialogProps {
  allocation: BudgetAreaAllocation | null;
  transactions: Transaction[];
  categories: Category[];
  selectedMonth: number;
  selectedYear: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AreaDetailsDialog = ({
  allocation,
  transactions,
  categories,
  selectedMonth,
  selectedYear,
  open,
  onOpenChange,
}: AreaDetailsDialogProps) => {
  if (!allocation) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    }).format(new Date(date));
  };

  const progressValue =
    allocation.plannedAmount > 0
      ? Math.min((allocation.actualAmount / allocation.plannedAmount) * 100, 150)
      : 0;

  const areaTransactions = transactions.filter((t) => {
    const transDate = new Date(t.date);
    return (
      t.type === "expense" &&
      allocation.area.categoryIds.includes(t.categoryId) &&
      transDate.getMonth() === selectedMonth &&
      transDate.getFullYear() === selectedYear
    );
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getCategoryName = (categoryId: string) => {
    return categories.find((c) => c.id === categoryId)?.name || "Categoria";
  };

  const isOverBudget = allocation.actualAmount > allocation.plannedAmount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: allocation.area.color }}
            />
            {allocation.area.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Planejado:</span>
              <span className="font-medium">
                {formatCurrency(allocation.plannedAmount)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Real:</span>
              <span
                className={`font-medium ${
                  isOverBudget ? "text-destructive" : "text-income"
                }`}
              >
                {formatCurrency(allocation.actualAmount)}
              </span>
            </div>
            <Progress
              value={progressValue}
              className={isOverBudget ? "[&>div]:bg-destructive" : ""}
            />
            <p className="text-xs text-center text-muted-foreground">
              {progressValue.toFixed(0)}% do orçamento utilizado
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Categorias Vinculadas</p>
            <div className="flex flex-wrap gap-1">
              {allocation.categories.length === 0 ? (
                <span className="text-sm text-muted-foreground italic">
                  Nenhuma categoria vinculada
                </span>
              ) : (
                allocation.categories.map((cat) => (
                  <Badge key={cat.id} variant="secondary">
                    {cat.name}
                  </Badge>
                ))
              )}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">
              Transações do Mês ({areaTransactions.length})
            </p>
            {areaTransactions.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                Nenhuma transação encontrada
              </p>
            ) : (
              <ScrollArea className="h-[200px] border rounded-lg">
                <div className="p-2 space-y-1">
                  {areaTransactions.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between p-2 rounded-md hover:bg-muted text-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{t.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(t.date)} • {getCategoryName(t.categoryId)}
                        </p>
                      </div>
                      <span className="text-expense font-medium shrink-0 ml-2">
                        {formatCurrency(t.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
