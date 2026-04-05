import { useState, useEffect, useMemo } from "react";
import { ArrowUpCircle, ArrowDownCircle, Pencil, Trash2, ArrowUpDown, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Transaction, Category, Bank } from "@/types/finance";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BankFilterChips } from "./BankFilterChips";
import { AnticipateTransactionDialog } from "./AnticipateTransactionDialog";
import { formatCurrency } from "@/lib/utils";
import { PremiumEmptyState } from "@/components/ui/PremiumEmptyState";

const HEALTH_CATEGORY_KEYWORDS = ["esporte", "saúde", "saude", "academia", "totalpass", "supermercado", "mercado", "alimentação", "alimentacao", "dieta", "nutrição", "nutricao"];

function isHealthCategory(categoryName?: string): boolean {
  if (!categoryName) return false;
  const lower = categoryName.toLowerCase();
  return HEALTH_CATEGORY_KEYWORDS.some((kw) => lower.includes(kw));
}

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
  filterType: externalFilterType,
  onFilterTypeChange,
}: TransactionListProps) => {
  const [internalFilterType, setInternalFilterType] = useState<string>("all");
  const [internalSelectedBank, setInternalSelectedBank] = useState(selectedBank);

  const filterType = externalFilterType ?? internalFilterType;
  const setFilterType = onFilterTypeChange ?? setInternalFilterType;

  useEffect(() => {
    if (!onBankChange) setInternalSelectedBank(selectedBank);
  }, [selectedBank, onBankChange]);

  const currentSelectedBank = onBankChange ? selectedBank : internalSelectedBank;

  const handleBankChange = (bankId: string) => {
    if (onBankChange) {
      onBankChange(bankId);
    } else {
      setInternalSelectedBank(bankId);
    }
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const matchesType = filterType === "all" || t.type === filterType;
      const matchesBank = !currentSelectedBank || t.bankId === currentSelectedBank;
      return matchesType && matchesBank;
    });
  }, [transactions, filterType, currentSelectedBank]);

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
            selectedBank={currentSelectedBank}
            onBankChange={handleBankChange}
          />
        )}
      </div>

      {/* Transaction list */}
      <div className="flex flex-col">
        {filteredTransactions.length === 0 ? (
          <PremiumEmptyState 
            icon={Zap} 
            title="Sem movimentos" 
            subtitle="Nenhuma transação encontrada para este período. Foco na dieta e no treino!" 
          />
        ) : (
          groupedTransactions.map((group) => (
            <div key={group.key} className="mb-4">
              <div className="px-1 pt-4 pb-2">
                <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/70 bg-muted/30 px-2 py-1 rounded-md">
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
  const showHealthBadge = isHealthCategory(category?.name);

  return (
    <div className="flex items-center gap-4 px-4 py-4 rounded-2xl hover:bg-card/40 backdrop-blur-sm border border-transparent hover:border-white/5 transition-all duration-300 group cursor-default">
      {/* Left: circular icon */}
      <div className={`flex items-center justify-center w-12 h-12 rounded-2xl shrink-0 transition-colors duration-300 ${isIncome ? 'bg-income/10 group-hover:bg-income/20' : 'bg-muted group-hover:bg-muted/80'}`}>
        {isIncome ? (
          <ArrowUpCircle className="w-6 h-6 text-income" />
        ) : (
          <ArrowDownCircle className="w-6 h-6 text-muted-foreground" />
        )}
      </div>

      {/* Center: description + meta */}
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold text-foreground truncate tracking-tight">
            {transaction.description}
          </p>
          {showHealthBadge && (
            <Badge className="bg-income/10 text-income border-none text-[10px] px-2 py-0.5 h-auto shrink-0 rounded-full font-bold uppercase tracking-wider">
              <Zap className="h-3 w-3 mr-1" />
              Upgrade Pessoal
            </Badge>
          )}
        </div>
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
      <div className="flex items-center gap-4 shrink-0">
        <p className={`text-base font-bold tabular-nums tracking-tight ${isIncome ? "text-income" : "text-foreground"}`}>
          {isIncome ? "+" : ""}{formatCurrency(transaction.amount)}
        </p>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
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
