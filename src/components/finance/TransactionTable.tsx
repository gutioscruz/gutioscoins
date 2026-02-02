import { useState, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowUpDown, Pencil, Trash2, ArrowUpCircle, ArrowDownCircle, ChevronLeft, ChevronRight, FastForward } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Transaction, Category, Bank } from "@/types/finance";
import { getCategoryColor } from "@/lib/categoryColors";
import { formatCurrency } from "@/lib/utils";
import { AnticipateTransactionDialog } from "./AnticipateTransactionDialog";

interface TransactionTableProps {
  transactions: Transaction[];
  categories: Category[];
  banks: Bank[];
  filterType: "all" | "income" | "expense";
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (id: string) => void;
  showPagination?: boolean;
  defaultPageSize?: number;
}

type SortField = "date" | "description" | "category" | "amount";
type SortOrder = "asc" | "desc";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export const TransactionTable = ({
  transactions,
  categories,
  banks,
  filterType,
  onEdit,
  onDelete,
  showPagination = true,
  defaultPageSize = 25,
}: TransactionTableProps) => {
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const sortedTransactions = useMemo(() => {
    const filtered = transactions.filter(
      (t) => filterType === "all" || t.type === filterType
    );

    return filtered.sort((a, b) => {
      const multiplier = sortOrder === "asc" ? 1 : -1;

      switch (sortField) {
        case "date":
          return multiplier * (new Date(a.date).getTime() - new Date(b.date).getTime());
        case "description":
          return multiplier * a.description.localeCompare(b.description);
        case "category": {
          const catA = categories.find((c) => c.id === a.categoryId)?.name || "";
          const catB = categories.find((c) => c.id === b.categoryId)?.name || "";
          return multiplier * catA.localeCompare(catB);
        }
        case "amount":
          return multiplier * (a.amount - b.amount);
        default:
          return 0;
      }
    });
  }, [transactions, filterType, sortField, sortOrder, categories]);

  // Reset to first page when transactions change
  useMemo(() => {
    setCurrentPage(1);
  }, [transactions.length, filterType]);

  // Pagination logic
  const totalItems = sortedTransactions.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedTransactions = showPagination
    ? sortedTransactions.slice(startIndex, endIndex)
    : sortedTransactions;

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 px-2 -ml-2 hover:bg-transparent font-medium"
      onClick={() => toggleSort(field)}
    >
      {children}
      <ArrowUpDown className="ml-1 h-3 w-3" />
      {sortField === field && (
        <span className="ml-0.5 text-xs">{sortOrder === "desc" ? "↓" : "↑"}</span>
      )}
    </Button>
  );

  if (sortedTransactions.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        Nenhuma transação encontrada
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-muted/50 z-10">
              <TableRow className="hover:bg-muted/50">
                <TableHead className="w-[100px]">
                  <SortableHeader field="date">Data</SortableHeader>
                </TableHead>
                <TableHead>
                  <SortableHeader field="description">Descrição</SortableHeader>
                </TableHead>
                <TableHead className="w-[150px] hidden md:table-cell">
                  <SortableHeader field="category">Categoria</SortableHeader>
                </TableHead>
                <TableHead className="w-[120px] hidden lg:table-cell">Banco</TableHead>
                <TableHead className="w-[120px] text-right">
                  <SortableHeader field="amount">Valor</SortableHeader>
                </TableHead>
                {(onEdit || onDelete) && <TableHead className="w-[100px]" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedTransactions.map((transaction, index) => {
                const category = categories.find((c) => c.id === transaction.categoryId);
                const bank = banks.find((b) => b.id === transaction.bankId);
                const categoryColor = category ? getCategoryColor(category.name) : "hsl(var(--muted))";
                const isEven = index % 2 === 0;

                return (
                  <TableRow 
                    key={transaction.id} 
                    className={`group transition-colors ${isEven ? "bg-background" : "bg-muted/20"} hover:bg-muted/40`}
                  >
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(transaction.date), "dd/MM/yy", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className={`flex items-center justify-center w-6 h-6 rounded-full shrink-0 ${
                            transaction.type === "income" ? "bg-income/10" : "bg-expense/10"
                          }`}
                        >
                          {transaction.type === "income" ? (
                            <ArrowUpCircle className="w-3.5 h-3.5 text-income" />
                          ) : (
                            <ArrowDownCircle className="w-3.5 h-3.5 text-expense" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{transaction.description}</p>
                          {transaction.isInstallment && transaction.installmentNumber && transaction.installmentCount && (
                            <Badge variant="outline" className="text-[10px] h-4 px-1 mt-0.5 bg-primary/10">
                              {transaction.installmentNumber}/{transaction.installmentCount}x
                            </Badge>
                          )}
                          {/* Show category on mobile */}
                          <p className="text-xs text-muted-foreground md:hidden">
                            {category?.name}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: categoryColor }}
                        />
                        <div className="min-w-0">
                          <p className="text-sm truncate">{category?.name || "-"}</p>
                          {transaction.subcategory && (
                            <p className="text-xs text-muted-foreground truncate">
                              {transaction.subcategory}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {bank && (
                        <div className="flex items-center gap-1.5">
                          <div
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: bank.color }}
                          />
                          <span className="text-sm truncate">{bank.name}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={`font-semibold ${
                          transaction.type === "income" ? "text-income" : "text-expense"
                        }`}
                      >
                        {transaction.type === "income" ? "+" : "-"}
                        {formatCurrency(transaction.amount)}
                      </span>
                    </TableCell>
                    {(onEdit || onDelete) && (
                      <TableCell>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                          {/* Anticipate button */}
                          {transaction.isInstallment && transaction.installmentNumber && transaction.installmentCount && (
                            <AnticipateTransactionDialog
                              transaction={transaction}
                              banks={banks}
                            />
                          )}
                          {onEdit && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  onClick={() => onEdit(transaction)}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Editar transação</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                          {onDelete && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-destructive"
                                  onClick={() => onDelete(transaction.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Excluir transação</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination controls */}
      {showPagination && totalItems > PAGE_SIZE_OPTIONS[0] && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Mostrando</span>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => {
                setPageSize(Number(value));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span>de {totalItems} transações</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground min-w-[80px] text-center">
              Página {currentPage} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
