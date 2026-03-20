import { useState, useEffect, useMemo } from "react";
import { ArrowUpCircle, ArrowDownCircle, Pencil, Trash2, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Transaction, Category, Bank } from "@/types/finance";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BankFilterChips } from "./BankFilterChips";
import { AnticipateTransactionDialog } from "./AnticipateTransactionDialog";
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
  sortOrder?: "asc" | "desc";
  onSortOrderChange?: (order: "asc" | "desc") => void;
  filterType?: string;
  onFilterTypeChange?: (type: string) => void;
}

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
  sortOrder = "desc",
  onSortOrderChange,
}: TransactionListProps) => {
  const [filterType, setFilterType] = useState<string>("all");
  const [internalSelectedBank, setInternalSelectedBank] = useState(selectedBank);

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
      return sortOrder === "desc" ? db.getTime() - da.getTime() : da.getTime() - db.getTime();
    });

    const groups: Array<{ key: string; label: string; transactions: Transaction[] }> = [];
    const map = new Map<string, Transaction[]>();

    sorted.forEach((t) => {
      const key = getDateKey(t.date);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    });

    map.forEach((txs, key) => {
      groups.push({ key, label: getDateLabel(txs[0].date), transactions: txs });
    });

    return groups;
  }, [filteredTransactions, sortOrder]);

  const transactionCount = filteredTransactions.length;
  const totalCount = transactions.length;

  const filterOptions = [
    { value: "all", label: "Todas" },
    { value: "income", label: "Receitas" },
    { value: "expense", label: "Despesas" },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-foreground">Transações</h2>
          <span className="text-xs text-muted-foreground tabular-nums">
            {transactionCount === totalCount
              ? `${totalCount}`
              : `${transactionCount} de ${totalCount}`}
          </span>
        </div>

        {/* Stealth type filters + sort */}
        <div className="flex items-center gap-1">
          {filterOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilterType(opt.value)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full transition-all ${
                filterType === opt.value
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}

          {onSortOrderChange && (
            <button
              onClick={() => onSortOrderChange(sortOrder === "desc" ? "asc" : "desc")}
              className="ml-1 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all"
              title={sortOrder === "desc" ? "Mais antigas primeiro" : "Mais recentes primeiro"}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Bank chips */}
        {showBankFilter && banks.length > 0 && (
          <BankFilterChips
            banks={banks}
            selectedBank={internalSelectedBank}
            onBankChange={handleBankChange}
          />
        )}
      </div>

      {/* Transaction list */}
      <div className="flex flex-col">
        {filteredTransactions.length === 0 ? (
          <p className="text-center text-muted-foreground py-12 text-sm">
            Nenhuma transação encontrada
          </p>
        ) : (
          groupedTransactions.map((group) => (
            <div key={group.key}>
              <div className="px-1 pt-5 pb-2">
                <span className="text-sm font-medium text-muted-foreground">
                  {group.label}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
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
            </div>
          ))
        )}
      </div>
    </div>
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

  const isIncome = transaction.type === "income";

  return (
    <div className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-accent/50 transition-colors group cursor-default">
      {/* Left: circular icon */}
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted shrink-0">
        {isIncome ? (
          <ArrowUpCircle className="w-5 h-5 text-income" />
        ) : (
          <ArrowDownCircle className="w-5 h-5 text-muted-foreground" />
        )}
      </div>

      {/* Center: description + meta */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">
          {transaction.description}
        </p>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {category?.name}
          {transaction.subcategory && ` · ${transaction.subcategory}`}
          {bank && ` • ${bank.name}`}
          {transaction.isInstallment && transaction.installmentNumber && transaction.installmentCount && (
            <> · {transaction.installmentNumber}/{transaction.installmentCount}x</>
          )}
        </p>
      </div>

      {/* Right: amount + actions */}
      <div className="flex items-center gap-2 shrink-0">
        <p className={`text-sm font-semibold tabular-nums ${isIncome ? "text-income" : "text-foreground"}`}>
          {isIncome ? "+" : ""}{formatCurrency(transaction.amount)}
        </p>
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {transaction.isInstallment && transaction.installmentNumber && transaction.installmentCount && (
            <AnticipateTransactionDialog transaction={transaction} banks={banks} />
          )}
          {onEdit && (
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onEdit(transaction)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          {onDelete && (
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => onDelete(transaction.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
