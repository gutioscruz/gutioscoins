import { useState, useEffect, useMemo } from "react";
import { ArrowUpCircle, ArrowDownCircle, Pencil, Trash2, LayoutGrid, Table as TableIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Transaction, Category, Bank } from "@/types/finance";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TransactionTable } from "./TransactionTable";
import { BankFilterChips } from "./BankFilterChips";
import { AnticipateTransactionDialog } from "./AnticipateTransactionDialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";

interface TransactionListProps {
  transactions: Transaction[];
  categories: Category[];
  banks: Bank[];
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (id: string) => void;
  selectedBank?: string;
  onBankChange?: (bankId: string) => void;
  showBankFilter?: boolean;
}

type ViewMode = "cards" | "table";

function getDateLabel(dateStr: string | Date): string {
  const d = typeof dateStr === "string" ? parseISO(dateStr) : dateStr;
  if (isToday(d)) return "Hoje";
  if (isYesterday(d)) return "Ontem";
  return format(d, "d 'de' MMMM", { locale: ptBR });
}

function getDateKey(dateStr: string | Date): string {
  const d = typeof dateStr === "string" ? parseISO(dateStr) : dateStr;
  return format(d, "yyyy-MM-dd");
}

export const TransactionList = ({ 
  transactions, 
  categories, 
  banks, 
  onEdit, 
  onDelete,
  selectedBank = "",
  onBankChange,
  showBankFilter = true,
}: TransactionListProps) => {
  const [filterType, setFilterType] = useState<string>("all");
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem("transactionViewMode");
    return (saved as ViewMode) || "cards";
  });
  const [internalSelectedBank, setInternalSelectedBank] = useState(selectedBank);

  useEffect(() => {
    localStorage.setItem("transactionViewMode", viewMode);
  }, [viewMode]);

  useEffect(() => {
    setInternalSelectedBank(selectedBank);
  }, [selectedBank]);

  const handleBankChange = (bankId: string) => {
    setInternalSelectedBank(bankId);
    onBankChange?.(bankId);
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const matchesType = filterType === "all" || t.type === filterType;
      const matchesBank = !internalSelectedBank || t.bankId === internalSelectedBank;
      return matchesType && matchesBank;
    });
  }, [transactions, filterType, internalSelectedBank]);

  const groupedTransactions = useMemo(() => {
    const sorted = [...filteredTransactions].sort((a, b) => {
      const da = typeof a.date === "string" ? parseISO(a.date as string) : a.date;
      const db = typeof b.date === "string" ? parseISO(b.date as string) : b.date;
      return db.getTime() - da.getTime();
    });

    const groups: Array<{ key: string; label: string; transactions: Transaction[] }> = [];
    const map = new Map<string, Transaction[]>();

    sorted.forEach((t) => {
      const key = getDateKey(t.date);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    });

    map.forEach((txs, key) => {
      groups.push({
        key,
        label: getDateLabel(txs[0].date),
        transactions: txs,
      });
    });

    return groups;
  }, [filteredTransactions]);

  const transactionCount = filteredTransactions.length;
  const totalCount = transactions.length;

  return (
    <Card className="p-6 border-none shadow-md">
      <div className="space-y-4">
        {/* Header with title, filters, and view toggle */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-foreground">Transações</h2>
              <Badge variant="secondary" className="text-xs">
                {transactionCount === totalCount
                  ? `${totalCount}`
                  : `${transactionCount}/${totalCount}`}
              </Badge>
            </div>
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
              <TabsList className="h-8">
                <TabsTrigger value="cards" className="px-2 h-7">
                  <LayoutGrid className="h-4 w-4" />
                </TabsTrigger>
                <TabsTrigger value="table" className="px-2 h-7">
                  <TableIcon className="h-4 w-4" />
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Inline quick filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <ToggleGroup
              type="single"
              value={filterType}
              onValueChange={(v) => v && setFilterType(v)}
              className="gap-1"
            >
              <ToggleGroupItem value="all" size="sm" className="text-xs px-3 h-7 rounded-full data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                Todas
              </ToggleGroupItem>
              <ToggleGroupItem value="income" size="sm" className="text-xs px-3 h-7 rounded-full data-[state=on]:bg-income data-[state=on]:text-income-foreground">
                Receitas
              </ToggleGroupItem>
              <ToggleGroupItem value="expense" size="sm" className="text-xs px-3 h-7 rounded-full data-[state=on]:bg-expense data-[state=on]:text-expense-foreground">
                Despesas
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {/* Bank Filter Chips */}
          {showBankFilter && banks.length > 0 && (
            <BankFilterChips
              banks={banks}
              selectedBank={internalSelectedBank}
              onBankChange={handleBankChange}
            />
          )}
        </div>

        {viewMode === "table" ? (
          <TransactionTable
            transactions={filteredTransactions}
            categories={categories}
            banks={banks}
            filterType={filterType as "all" | "income" | "expense"}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ) : (
          <div className="space-y-1">
            {filteredTransactions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhuma transação encontrada</p>
            ) : (
              groupedTransactions.map((group) => (
                <div key={group.key} className="space-y-1">
                  {/* Date group header */}
                  <div className="flex items-center gap-3 pt-3 pb-1">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {group.label}
                    </span>
                    <Separator className="flex-1" />
                  </div>

                  {/* Transaction rows */}
                  {group.transactions.map((transaction) => (
                    <TransactionRow
                      key={transaction.id}
                      transaction={transaction}
                      categories={categories}
                      banks={banks}
                      onEdit={onEdit}
                      onDelete={onDelete}
                    />
                  ))}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

interface TransactionRowProps {
  transaction: Transaction;
  categories: Category[];
  banks: Bank[];
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (id: string) => void;
}

const TransactionRow = ({ transaction, categories, banks, onEdit, onDelete }: TransactionRowProps) => {
  const category = categories.find((c) => c.id === transaction.categoryId);
  const bank = banks.find((b) => b.id === transaction.bankId);

  return (
    <div className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-secondary/40 transition-colors group">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Icon */}
        <div
          className={`flex items-center justify-center w-9 h-9 rounded-full shrink-0 ${
            transaction.type === "income"
              ? "bg-income-light text-income"
              : "bg-expense-light text-expense"
          }`}
        >
          {transaction.type === "income" ? (
            <ArrowUpCircle className="w-4.5 h-4.5" />
          ) : (
            <ArrowDownCircle className="w-4.5 h-4.5" />
          )}
        </div>

        {/* Description + meta */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground truncate">
            {transaction.description}
          </p>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="truncate">
              {category?.name}
              {transaction.subcategory && ` · ${transaction.subcategory}`}
            </span>
            {bank && (
              <>
                <span>·</span>
                <div className="flex items-center gap-1 shrink-0">
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: bank.color }}
                  />
                  <span>{bank.name}</span>
                </div>
              </>
            )}
            {transaction.isInstallment && transaction.installmentNumber && transaction.installmentCount && (
              <>
                <span>·</span>
                <Badge variant="outline" className="text-[10px] h-4 px-1 py-0 font-normal">
                  {transaction.installmentNumber}/{transaction.installmentCount}x
                </Badge>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Amount + actions */}
      <div className="flex items-center gap-2 shrink-0">
        <p
          className={`text-sm font-semibold tabular-nums ${
            transaction.type === "income" ? "text-income" : "text-expense"
          }`}
        >
          {transaction.type === "income" ? "+" : "−"} {formatCurrency(transaction.amount)}
        </p>
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {transaction.isInstallment && transaction.installmentNumber && transaction.installmentCount && (
            <AnticipateTransactionDialog
              transaction={transaction}
              banks={banks}
            />
          )}
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
      </div>
    </div>
  );
};
