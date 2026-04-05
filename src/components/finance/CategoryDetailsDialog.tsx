import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowUpDown, Pencil, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Transaction, Category, Bank } from "@/types/finance";

interface CategoryDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryName: string;
  categoryColor: string;
  categoryId?: string;
  subcategory?: string;
  transactions: Transaction[];
  categories: Category[];
  banks: Bank[];
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (id: string) => void;
}

type SortField = "date" | "amount";
type SortOrder = "asc" | "desc";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export const CategoryDetailsDialog = ({
  open,
  onOpenChange,
  categoryName,
  categoryColor,
  categoryId,
  subcategory,
  transactions,
  categories,
  banks,
  onEdit,
  onDelete,
}: CategoryDetailsDialogProps) => {
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const filteredTransactions = useMemo(() => {
    let filtered = transactions.filter((t) => t.type === "expense");
    
    if (subcategory) {
      filtered = filtered.filter((t) => t.categoryId === categoryId && t.subcategory === subcategory);
    } else if (categoryId) {
      filtered = filtered.filter((t) => t.categoryId === categoryId);
    }

    return filtered.sort((a, b) => {
      const multiplier = sortOrder === "asc" ? 1 : -1;
      if (sortField === "date") {
        return multiplier * (new Date(a.date).getTime() - new Date(b.date).getTime());
      }
      return multiplier * (a.amount - b.amount);
    });
  }, [transactions, categoryId, subcategory, sortField, sortOrder]);

  const total = useMemo(
    () => filteredTransactions.reduce((sum, t) => sum + t.amount, 0),
    [filteredTransactions]
  );

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: categoryColor }}
            />
            <DialogTitle>{categoryName}</DialogTitle>
          </div>
          <DialogDescription>
            {filteredTransactions.length} transações • Total: {formatCurrency(total)}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 mb-2">
          <Button
            variant={sortField === "date" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => toggleSort("date")}
            className="gap-1"
          >
            <ArrowUpDown className="h-3 w-3" />
            Data
            {sortField === "date" && (sortOrder === "desc" ? " ↓" : " ↑")}
          </Button>
          <Button
            variant={sortField === "amount" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => toggleSort("amount")}
            className="gap-1"
          >
            <ArrowUpDown className="h-3 w-3" />
            Valor
            {sortField === "amount" && (sortOrder === "desc" ? " ↓" : " ↑")}
          </Button>
        </div>

        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-2">
            {filteredTransactions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma transação encontrada
              </p>
            ) : (
              filteredTransactions.map((transaction) => {
                const category = categories.find((c) => c.id === transaction.categoryId);
                const bank = banks.find((b) => b.id === transaction.bankId);

                return (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {transaction.description}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{format(new Date(transaction.date), "dd MMM yyyy", { locale: ptBR })}</span>
                        {transaction.subcategory && !subcategory && (
                          <>
                            <span>•</span>
                            <span>{transaction.subcategory}</span>
                          </>
                        )}
                        {bank && (
                          <>
                            <span>•</span>
                            <div className="flex items-center gap-1">
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: bank.color }}
                              />
                              <span>{bank.name}</span>
                            </div>
                          </>
                        )}
                        {transaction.isInstallment && transaction.installmentNumber && transaction.installmentCount && (
                          <>
                            <span>•</span>
                            <span className="font-medium">
                              {transaction.installmentNumber}/{transaction.installmentCount}x
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <span className="text-sm font-semibold text-expense">
                        -{formatCurrency(transaction.amount)}
                      </span>
                      {(onEdit || onDelete) && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {onEdit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => onEdit(transaction)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {onDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-destructive"
                              onClick={() => onDelete(transaction.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
