import { useState, useMemo, useCallback, memo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus, Pencil, Trash2, Building2, CreditCard, Wallet,
  TrendingUp, PiggyBank, Receipt, BarChart3, ArrowUpRight,
  Landmark, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader,
  DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { BankType, InvestmentType, Card as CardType } from "@/types/finance";
import { toast } from "sonner";
import { useFinance } from "@/contexts/FinanceContext";
import { CardStatementDialog } from "@/components/cards/CardStatementDialog";
import { MonthlyStatementsOverview } from "@/components/cards/MonthlyStatementsOverview";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { formatCurrency } from "@/lib/utils";
import { useCardBillingCycle } from "@/hooks/useCardBillingCycle";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

// ─── Static data ────────────────────────────────────────────────────────────

const bankTypeLabels: Record<string, string> = {
  checking: "Conta Corrente",
  savings: "Poupança",
  credit: "Cartão de Crédito",
};

const bankTypeIcons: Record<string, React.ElementType> = {
  checking: Building2,
  savings: Wallet,
  credit: CreditCard,
};

const investmentTypeLabels: Record<string, string> = {
  stocks: "Ações",
  funds: "Fundos",
  crypto: "Criptomoedas",
  "fixed-income": "Renda Fixa",
  other: "Outros",
};

const investmentTypeColors: Record<string, string> = {
  stocks: "#8B5CF6",
  funds: "#06B6D4",
  crypto: "#F59E0B",
  "fixed-income": "#10B981",
  other: "#6B7280",
};

// ─── Utility ────────────────────────────────────────────────────────────────

function getCreditUsageColor(pct: number): string {
  if (pct >= 90) return "bg-red-500";
  if (pct >= 75) return "bg-orange-500";
  if (pct >= 50) return "bg-amber-500";
  return "bg-emerald-500";
}

// ─── Sub-component: Credit Card Row ─────────────────────────────────────────

interface CreditCardRowProps {
  card: CardType;
  bankId: string;
  currentBillAmount: number;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const CreditCardRow = memo(function CreditCardRow({
  card, currentBillAmount, onView, onEdit, onDelete,
}: CreditCardRowProps) {
  const usagePct = card.limit > 0
    ? Math.min(100, (currentBillAmount / card.limit) * 100)
    : 0;
  const colorClass = getCreditUsageColor(usagePct);
  const available = card.limit - currentBillAmount;

  return (
    <div className="group/card rounded-2xl bg-muted/20 hover:bg-muted/40 transition-all duration-200 hover:scale-[1.01] active:scale-[0.98] hover:shadow-[0_0_15px_rgba(255,255,255,0.05)] p-3 space-y-2.5">
      {/* Header row */}
      <div className="flex items-center gap-2.5">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${card.color}20` }}
        >
          <CreditCard className="w-3.5 h-3.5" style={{ color: card.color }} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{card.name}</p>
          <p className="text-xs text-muted-foreground tabular-nums tracking-tight">
            {formatCurrency(currentBillAmount)}{" "}
            <span className="opacity-60">de {formatCurrency(card.limit)}</span>
          </p>
        </div>

        {/* Available credit */}
        <div className="text-right shrink-0">
          <p
            className={`text-sm font-bold tabular-nums tracking-tight ${
              available > 0 ? "text-emerald-500" : "text-red-500"
            }`}
          >
            {formatCurrency(Math.max(0, available))}
          </p>
          <p className="text-[10px] text-muted-foreground">disponível</p>
        </div>

        {/* Action buttons — always visible on mobile, hover on desktop */}
        <div className="flex gap-0.5 opacity-100 md:opacity-0 md:group-hover/card:opacity-100 transition-opacity duration-300 shrink-0">
          <Button
            variant="ghost" size="sm"
            className="h-6 w-6 p-0 rounded-full" title="Ver Fatura"
            onClick={onView}
          >
            <Receipt className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost" size="sm"
            className="h-6 w-6 p-0 rounded-full"
            onClick={onEdit}
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost" size="sm"
            className="h-6 w-6 p-0 rounded-full text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <Progress
          value={usagePct}
          className="h-1.5 bg-muted/50"
          indicatorClassName={colorClass}
        />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>{usagePct.toFixed(0)}% utilizado</span>
          {card.closingDay && (
            <span>Fecha dia {card.closingDay}</span>
          )}
        </div>
      </div>
    </div>
  );
});

// ─── Sub-component: Bank Modular Card ───────────────────────────────────────

interface BankModularCardProps {
  bank: {
    id: string;
    name: string;
    type: string;
    balance?: number;
    limit?: number;
    color: string;
    cards?: CardType[];
  };
  billingMap: Map<string, { currentBillAmount: number }>;
  onEditBank: (id: string) => void;
  onDeleteBank: (id: string) => void;
  onAddCard: (bankId: string) => void;
  onEditCard: (bankId: string, cardId: string) => void;
  onDeleteCard: (bankId: string, cardId: string) => void;
  onViewStatement: (card: CardType, bankId: string) => void;
}

const BankModularCard = memo(function BankModularCard({
  bank, billingMap, onEditBank, onDeleteBank,
  onAddCard, onEditCard, onDeleteCard, onViewStatement,
}: BankModularCardProps) {
  const Icon = bankTypeIcons[bank.type] ?? Building2;
  const isCredit = bank.type === "credit";

  return (
    <div className="group rounded-3xl bg-card/60 backdrop-blur-md border border-white/5 shadow-sm overflow-hidden transition-all duration-200 hover:scale-[1.01] active:scale-[0.98] hover:shadow-[0_0_15px_rgba(255,255,255,0.05)]">
      {/* Colour bar */}
      <div
        className="h-1.5 w-full"
        style={{
          background: `linear-gradient(90deg, ${bank.color}cc 0%, ${bank.color}55 100%)`,
        }}
      />

      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="p-2.5 rounded-2xl shrink-0"
              style={{ backgroundColor: `${bank.color}18` }}
            >
              <Icon className="h-5 w-5" style={{ color: bank.color }} />
            </div>
            <div>
              <p className="text-base font-semibold text-foreground leading-tight">
                {bank.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {bankTypeLabels[bank.type] ?? bank.type}
              </p>
            </div>
          </div>

          {/* Edit / Delete — always visible on mobile, hover on desktop */}
          <div className="flex gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300">
            <Button
              variant="ghost" size="sm"
              className="h-8 w-8 p-0 rounded-full"
              onClick={() => onEditBank(bank.id)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost" size="sm"
              className="h-8 w-8 p-0 rounded-full text-destructive hover:text-destructive"
              onClick={() => onDeleteBank(bank.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Balance */}
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">
            {isCredit ? "Limite Total" : "Saldo Atual"}
          </p>
          <p className="text-2xl font-bold text-foreground tabular-nums tracking-tight">
            {formatCurrency(isCredit ? (bank.limit ?? 0) : (bank.balance ?? 0))}
          </p>
        </div>

        {/* Cards list */}
        {bank.cards && bank.cards.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Cartões
              </p>
              <Button
                variant="ghost" size="sm"
                className="h-7 px-2 text-xs rounded-full hover:bg-accent/30"
                onClick={() => onAddCard(bank.id)}
              >
                <Plus className="h-3 w-3 mr-1" />
                Novo
              </Button>
            </div>

            {bank.cards.map((card) => {
              const billing = billingMap.get(card.id);
              const currentBillAmount = billing?.currentBillAmount ?? card.used;

              return (
                <CreditCardRow
                  key={card.id}
                  card={card}
                  bankId={bank.id}
                  currentBillAmount={currentBillAmount}
                  onView={() => onViewStatement(card, bank.id)}
                  onEdit={() => onEditCard(bank.id, card.id)}
                  onDelete={() => onDeleteCard(bank.id, card.id)}
                />
              );
            })}
          </div>
        )}

        {/* Add first card CTA */}
        {(!bank.cards || bank.cards.length === 0) && (
          <Button
            variant="ghost" size="sm"
            className="w-full rounded-xl text-xs text-muted-foreground hover:bg-accent/30 border border-dashed border-muted/50"
            onClick={() => onAddCard(bank.id)}
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Adicionar Cartão
          </Button>
        )}
      </div>
    </div>
  );
});

// ─── Sub-component: Investment Modular Card ──────────────────────────────────

interface InvestmentModularCardProps {
  investment: {
    id: string;
    name: string;
    type: string;
    amount: number;
    profitability?: number;
    color: string;
  };
  totalInvestments: number;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

const InvestmentModularCard = memo(function InvestmentModularCard({
  investment, totalInvestments, onEdit, onDelete,
}: InvestmentModularCardProps) {
  const pct = totalInvestments > 0
    ? (investment.amount / totalInvestments) * 100
    : 0;

  return (
    <div className="group rounded-3xl bg-card/60 backdrop-blur-md border border-white/5 shadow-sm overflow-hidden transition-all duration-200 hover:scale-[1.01] active:scale-[0.98] hover:shadow-[0_0_15px_rgba(255,255,255,0.05)]">
      <div
        className="h-1.5 w-full"
        style={{
          background: `linear-gradient(90deg, ${investment.color}cc 0%, ${investment.color}55 100%)`,
        }}
      />
      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="p-2.5 rounded-2xl shrink-0"
              style={{ backgroundColor: `${investment.color}18` }}
            >
              <TrendingUp className="h-5 w-5" style={{ color: investment.color }} />
            </div>
            <div>
              <p className="text-base font-semibold text-foreground leading-tight">
                {investment.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {investmentTypeLabels[investment.type] ?? investment.type}
              </p>
            </div>
          </div>

          <div className="flex gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300">
            <Button
              variant="ghost" size="sm"
              className="h-8 w-8 p-0 rounded-full"
              onClick={() => onEdit(investment.id)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost" size="sm"
              className="h-8 w-8 p-0 rounded-full text-destructive hover:text-destructive"
              onClick={() => onDelete(investment.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div>
          <p className="text-xs text-muted-foreground mb-0.5">Valor Investido</p>
          <p className="text-2xl font-bold text-foreground tabular-nums tracking-tight">
            {formatCurrency(investment.amount)}
          </p>
        </div>

        {/* composition bar */}
        <div className="space-y-1.5">
          <Progress
            value={pct}
            className="h-1.5 bg-muted/40"
            indicatorClassName="transition-all duration-700"
            style={{ "--tw-bg-opacity": 1 } as React.CSSProperties}
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>{pct.toFixed(1)}% da carteira</span>
            {investment.profitability && (
              <span className="text-emerald-500 font-medium flex items-center gap-0.5">
                <ArrowUpRight className="h-2.5 w-2.5" />
                {investment.profitability}% a.a.
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

// ─── Main Page ───────────────────────────────────────────────────────────────

const Banks = () => {
  const {
    banks, addBank, updateBank, deleteBank,
    addCardToBank, updateCard, deleteCard,
    investments, addInvestment, updateInvestment, deleteInvestment,
    isLoadingBanks, isLoadingInvestments,
  } = useFinance();

  // ── Dialog state ────────────────────────────────────────────────────────────
  const [bankDialogOpen, setBankDialogOpen] = useState(false);
  const [cardDialogOpen, setCardDialogOpen] = useState(false);
  const [investmentDialogOpen, setInvestmentDialogOpen] = useState(false);
  const [editingBankId, setEditingBankId] = useState<string | null>(null);
  const [editingCardData, setEditingCardData] = useState<{ bankId: string; cardId: string | null } | null>(null);
  const [editingInvestmentId, setEditingInvestmentId] = useState<string | null>(null);
  const [statementDialogData, setStatementDialogData] = useState<{ card: CardType; bankId: string } | null>(null);

  const [deleteBankConfirm, setDeleteBankConfirm] = useState<string | null>(null);
  const [deleteCardConfirm, setDeleteCardConfirm] = useState<{ bankId: string; cardId: string } | null>(null);
  const [deleteInvestmentConfirm, setDeleteInvestmentConfirm] = useState<string | null>(null);

  // ── Form state ──────────────────────────────────────────────────────────────
  const [bankFormData, setBankFormData] = useState({
    name: "", type: "checking" as BankType, balance: "", limit: "", color: "#10b981",
  });
  const [cardFormData, setCardFormData] = useState({
    name: "", limit: "", used: "0", color: "#10b981",
    closingDay: "1", dueDay: "10", autoDebit: false, autoDebitBankId: "",
  });
  const [investmentFormData, setInvestmentFormData] = useState({
    name: "", type: "fixed-income" as InvestmentType,
    amount: "", profitability: "", color: "#10b981",
  });

  // ── All cards flat list (for billing hook) ──────────────────────────────────
  const allCards = useMemo(
    () => banks.flatMap((b) => b.cards ?? []),
    [banks],
  );

  // ── Real-time billing data ──────────────────────────────────────────────────
  const { billingMap, isLoading: isBillingLoading } = useCardBillingCycle(allCards);

  // ── Panel KPIs ──────────────────────────────────────────────────────────────
  const totalBalance = useMemo(
    () => banks.filter((b) => b.type !== "credit").reduce((s, b) => s + (b.balance ?? 0), 0),
    [banks],
  );

  const totalCreditUsed = useMemo(() => {
    let total = 0;
    banks.forEach((b) => {
      (b.cards ?? []).forEach((c) => {
        const billing = billingMap.get(c.id);
        total += billing ? billing.currentBillAmount : c.used;
      });
    });
    return total;
  }, [banks, billingMap]);

  const totalCreditLimit = useMemo(
    () =>
      banks.flatMap((b) => b.cards ?? []).reduce((s, c) => s + c.limit, 0) +
      banks.filter((b) => b.type === "credit").reduce((s, b) => s + (b.limit ?? 0), 0),
    [banks],
  );

  const totalInvestments = useMemo(
    () => investments.reduce((s, i) => s + i.amount, 0),
    [investments],
  );

  const netWorth = useMemo(
    () => totalBalance + totalInvestments - totalCreditUsed,
    [totalBalance, totalInvestments, totalCreditUsed],
  );

  const isLoading = isLoadingBanks || isLoadingInvestments || isBillingLoading;

  // ── Handlers (memoised to prevent child re-renders) ─────────────────────────
  const handleSaveBank = useCallback(() => {
    if (!bankFormData.name.trim()) { toast.error("Digite um nome para o banco"); return; }
    const bankData = {
      name: bankFormData.name, type: bankFormData.type,
      balance: bankFormData.balance ? parseFloat(bankFormData.balance) : undefined,
      limit: bankFormData.limit ? parseFloat(bankFormData.limit) : undefined,
      color: bankFormData.color,
      cards: editingBankId ? banks.find((b) => b.id === editingBankId)?.cards : [],
    };
    if (editingBankId) { updateBank(editingBankId, bankData); toast.success("Banco atualizado!"); }
    else { addBank(bankData); toast.success("Banco adicionado!"); }
    resetBankDialog();
  }, [bankFormData, editingBankId, banks, updateBank, addBank]);

  const handleDeleteBank = useCallback((id: string) => {
    deleteBank(id); setDeleteBankConfirm(null);
  }, [deleteBank]);

  const handleSaveCard = useCallback(() => {
    if (!cardFormData.name.trim() || !editingCardData?.bankId) {
      toast.error("Preencha todos os campos"); return;
    }
    if (cardFormData.autoDebit && !cardFormData.autoDebitBankId) {
      toast.error("Selecione a conta para débito automático"); return;
    }
    const cardData = {
      name: cardFormData.name, limit: Number(cardFormData.limit) || 0,
      used: Number(cardFormData.used) || 0, color: cardFormData.color,
      closingDay: Number(cardFormData.closingDay) || 1,
      dueDay: Number(cardFormData.dueDay) || 10,
      autoDebit: cardFormData.autoDebit,
      autoDebitBankId: cardFormData.autoDebit ? cardFormData.autoDebitBankId : undefined,
    };
    if (editingCardData.cardId) {
      updateCard(editingCardData.bankId, editingCardData.cardId, cardData);
      toast.success("Cartão atualizado!");
    } else {
      addCardToBank(editingCardData.bankId, cardData);
      toast.success("Cartão adicionado!");
    }
    resetCardDialog();
  }, [cardFormData, editingCardData, updateCard, addCardToBank]);

  const handleDeleteCard = useCallback((bankId: string, cardId: string) => {
    deleteCard(bankId, cardId); setDeleteCardConfirm(null);
  }, [deleteCard]);

  const handleSaveInvestment = useCallback(() => {
    if (!investmentFormData.name.trim()) { toast.error("Digite um nome para o investimento"); return; }
    const investmentData = {
      name: investmentFormData.name, type: investmentFormData.type,
      amount: parseFloat(investmentFormData.amount),
      profitability: investmentFormData.profitability ? parseFloat(investmentFormData.profitability) : undefined,
      color: investmentFormData.color,
    };
    if (editingInvestmentId) { updateInvestment(editingInvestmentId, investmentData); toast.success("Investimento atualizado!"); }
    else { addInvestment(investmentData); toast.success("Investimento adicionado!"); }
    resetInvestmentDialog();
  }, [investmentFormData, editingInvestmentId, updateInvestment, addInvestment]);

  const handleDeleteInvestment = useCallback((id: string) => {
    deleteInvestment(id); setDeleteInvestmentConfirm(null);
  }, [deleteInvestment]);

  // ── Resets ──────────────────────────────────────────────────────────────────
  const resetBankDialog = () => {
    setBankDialogOpen(false); setEditingBankId(null);
    setBankFormData({ name: "", type: "checking", balance: "", limit: "", color: "#10b981" });
  };
  const resetCardDialog = () => {
    setCardDialogOpen(false); setEditingCardData(null);
    setCardFormData({ name: "", limit: "", used: "0", color: "#10b981", closingDay: "1", dueDay: "10", autoDebit: false, autoDebitBankId: "" });
  };
  const resetInvestmentDialog = () => {
    setInvestmentDialogOpen(false); setEditingInvestmentId(null);
    setInvestmentFormData({ name: "", type: "fixed-income", amount: "", profitability: "", color: "#10b981" });
  };

  // ── Open dialogs ─────────────────────────────────────────────────────────────
  const openEditBankDialog = useCallback((bankId: string) => {
    const bank = banks.find((b) => b.id === bankId);
    if (!bank) return;
    setEditingBankId(bankId);
    setBankFormData({ name: bank.name, type: bank.type, balance: bank.balance?.toString() ?? "", limit: bank.limit?.toString() ?? "", color: bank.color });
    setBankDialogOpen(true);
  }, [banks]);

  const openEditCardDialog = useCallback((bankId: string, cardId: string) => {
    const card = banks.find((b) => b.id === bankId)?.cards?.find((c) => c.id === cardId);
    if (!card) return;
    setEditingCardData({ bankId, cardId });
    setCardFormData({
      name: card.name, limit: card.limit.toString(), used: card.used.toString(),
      color: card.color, closingDay: (card.closingDay ?? 1).toString(),
      dueDay: (card.dueDay ?? 10).toString(), autoDebit: card.autoDebit ?? false,
      autoDebitBankId: card.autoDebitBankId ?? "",
    });
    setCardDialogOpen(true);
  }, [banks]);

  const openAddCardDialog = useCallback((bankId: string) => {
    setEditingCardData({ bankId, cardId: null }); setCardDialogOpen(true);
  }, []);

  const openEditInvestmentDialog = useCallback((investmentId: string) => {
    const inv = investments.find((i) => i.id === investmentId);
    if (!inv) return;
    setEditingInvestmentId(investmentId);
    setInvestmentFormData({
      name: inv.name, type: inv.type, amount: inv.amount.toString(),
      profitability: inv.profitability?.toString() ?? "", color: inv.color,
    });
    setInvestmentDialogOpen(true);
  }, [investments]);

  // ── Donut chart data ─────────────────────────────────────────────────────────
  const overviewChartData = useMemo(() => {
    const items = [];
    const checking = banks.filter((b) => b.type === "checking").reduce((s, b) => s + (b.balance ?? 0), 0);
    const savings = banks.filter((b) => b.type === "savings").reduce((s, b) => s + (b.balance ?? 0), 0);
    if (checking > 0) items.push({ name: "Conta Corrente", value: checking, color: "#06B6D4" });
    if (savings > 0) items.push({ name: "Poupança", value: savings, color: "#10B981" });
    if (totalInvestments > 0) items.push({ name: "Investimentos", value: totalInvestments, color: "#8B5CF6" });
    if (totalCreditUsed > 0) items.push({ name: "Crédito Utilizado", value: totalCreditUsed, color: "#EF4444" });
    return items;
  }, [banks, totalInvestments, totalCreditUsed]);

  // ── Top credit utilisation ───────────────────────────────────────────────────
  const topUtilisedCards = useMemo(() => {
    return allCards
      .map((c) => {
        const billing = billingMap.get(c.id);
        const used = billing?.currentBillAmount ?? c.used;
        const pct = c.limit > 0 ? (used / c.limit) * 100 : 0;
        return { ...c, currentBillAmount: used, pct };
      })
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 5);
  }, [allCards, billingMap]);

  // ─────────────────────────────────────────────────────────────────────────────
  //  RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background container mx-auto px-4 py-8 space-y-8">
        <div>
          <Skeleton className="h-10 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 w-full rounded-3xl" />)}
        </div>
        <Skeleton className="h-40 w-full rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-64 w-full rounded-3xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 space-y-8">

        {/* ── Page header ── */}
        <div>
          <h1 className="text-3xl font-bold">Patrimônio</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gestão Patrimonial Unificada
          </p>
        </div>

        {/* ── KPI Panel ── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "Saldo Total",
              value: formatCurrency(totalBalance),
              icon: PiggyBank,
              iconBg: "bg-emerald-500/10",
              iconColor: "text-emerald-500",
              delta: null,
            },
            {
              label: "Crédito Usado",
              value: formatCurrency(totalCreditUsed),
              icon: CreditCard,
              iconBg: "bg-muted/50",
              iconColor: "text-muted-foreground",
              delta: totalCreditLimit > 0
                ? `${((totalCreditUsed / totalCreditLimit) * 100).toFixed(0)}% do limite`
                : null,
            },
            {
              label: "Limite Disponível",
              value: formatCurrency(Math.max(0, totalCreditLimit - totalCreditUsed)),
              icon: Wallet,
              iconBg: "bg-primary/10",
              iconColor: "text-primary",
              delta: null,
            },
            {
              label: "Investimentos",
              value: formatCurrency(totalInvestments),
              icon: TrendingUp,
              iconBg: "bg-violet-500/10",
              iconColor: "text-violet-500",
              delta: null,
            },
          ].map((kpi, idx) => (
            <div
              key={kpi.label}
              className="group rounded-3xl bg-card/60 backdrop-blur-md border border-white/5 shadow-sm p-5 hover:bg-card/80 transition-all duration-200 hover:scale-[1.01] active:scale-[0.98] hover:shadow-[0_0_15px_rgba(255,255,255,0.05)]"
              style={{ animationDelay: `${idx * 80}ms` }}
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1.5">
                  <p className="text-xs font-medium tracking-wide uppercase text-muted-foreground group-hover:text-primary transition-colors">
                    {kpi.label}
                  </p>
                  <p className="text-2xl font-bold tabular-nums tracking-tight">{kpi.value}</p>
                  {kpi.delta && (
                    <p className="text-[11px] text-muted-foreground">{kpi.delta}</p>
                  )}
                </div>
                <div className={`flex items-center justify-center w-10 h-10 rounded-2xl ${kpi.iconBg}`}>
                  <kpi.icon className={`w-5 h-5 ${kpi.iconColor}`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Net Worth hero ── */}
        <div className="rounded-3xl overflow-hidden" style={{ background: "linear-gradient(135deg, hsl(var(--primary)/0.15) 0%, hsl(var(--primary)/0.05) 100%)" }}>
          <div className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Patrimônio Líquido
              </p>
              <p className={`text-4xl font-bold tabular-nums tracking-tight mt-1 ${netWorth >= 0 ? "text-primary" : "text-red-500"}`}>
                {formatCurrency(netWorth)}
              </p>
              <p className="text-xs text-muted-foreground mt-1.5">
                Saldos + Investimentos − Crédito Utilizado
              </p>
            </div>
            <div className="flex gap-6 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Ativos</p>
                <p className="text-lg font-semibold tabular-nums tracking-tight text-emerald-500">
                  {formatCurrency(totalBalance + totalInvestments)}
                </p>
              </div>
              <div className="w-px bg-border" />
              <div>
                <p className="text-xs text-muted-foreground">Passivos</p>
                <p className="text-lg font-semibold tabular-nums tracking-tight text-red-500">
                  {formatCurrency(totalCreditUsed)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Tabs ── */}
        <Tabs defaultValue="banks" className="w-full">
          <TabsList className="bg-muted/50 backdrop-blur-sm rounded-xl p-1 h-auto w-auto inline-flex">
            <TabsTrigger
              value="banks"
              className="rounded-lg px-5 py-2 text-sm gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-300"
            >
              <Building2 className="w-4 h-4" />
              Bancos &amp; Cartões
            </TabsTrigger>
            <TabsTrigger
              value="investments"
              className="rounded-lg px-5 py-2 text-sm gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-300"
            >
              <TrendingUp className="w-4 h-4" />
              Investimentos
            </TabsTrigger>
            <TabsTrigger
              value="overview"
              className="rounded-lg px-5 py-2 text-sm gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-300"
            >
              <BarChart3 className="w-4 h-4" />
              Visão Geral
            </TabsTrigger>
          </TabsList>

          {/* ════════════════════════════════════════
              TAB: Bancos & Cartões
          ════════════════════════════════════════ */}
          <TabsContent value="banks" className="space-y-6 mt-6">
            <MonthlyStatementsOverview
              banks={banks}
              onCardClick={(cardInfo) => {
                const bank = banks.find((b) => b.id === cardInfo.bankId);
                const card = bank?.cards?.find((c) => c.id === cardInfo.id);
                if (card) setStatementDialogData({ card, bankId: cardInfo.bankId });
              }}
            />

            <div className="flex justify-end">
              <Dialog open={bankDialogOpen} onOpenChange={setBankDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2 rounded-xl" onClick={() => setEditingBankId(null)}>
                    <Plus className="w-4 h-4" />
                    Adicionar Banco
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-2xl">
                  <DialogHeader>
                    <DialogTitle>{editingBankId ? "Editar" : "Novo"} Banco</DialogTitle>
                    <DialogDescription>
                      {editingBankId ? "Edite" : "Adicione"} uma conta bancária.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="bank-name">Nome</Label>
                      <Input
                        id="bank-name" placeholder="Ex: Nubank, Itaú..."
                        value={bankFormData.name}
                        onChange={(e) => setBankFormData({ ...bankFormData, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bank-type">Tipo</Label>
                      <Select
                        value={bankFormData.type}
                        onValueChange={(v: BankType) => setBankFormData({ ...bankFormData, type: v })}
                      >
                        <SelectTrigger id="bank-type"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="checking">Conta Corrente</SelectItem>
                          <SelectItem value="savings">Poupança</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bank-balance">Saldo Atual</Label>
                      <Input
                        id="bank-balance" type="number" step="0.01" placeholder="0,00"
                        value={bankFormData.balance}
                        onChange={(e) => setBankFormData({ ...bankFormData, balance: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bank-color">Cor</Label>
                      <div className="flex gap-2">
                        <Input
                          id="bank-color" type="color" value={bankFormData.color}
                          onChange={(e) => setBankFormData({ ...bankFormData, color: e.target.value })}
                          className="w-20 h-10"
                        />
                        <Input
                          value={bankFormData.color}
                          onChange={(e) => setBankFormData({ ...bankFormData, color: e.target.value })}
                          placeholder="#000000"
                        />
                      </div>
                    </div>
                    <Button onClick={handleSaveBank} className="w-full rounded-xl">
                      {editingBankId ? "Salvar Alterações" : "Adicionar"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Bank grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {banks.map((bank) => (
                <BankModularCard
                  key={bank.id}
                  bank={bank}
                  billingMap={billingMap as Map<string, { currentBillAmount: number }>}
                  onEditBank={openEditBankDialog}
                  onDeleteBank={(id) => setDeleteBankConfirm(id)}
                  onAddCard={openAddCardDialog}
                  onEditCard={openEditCardDialog}
                  onDeleteCard={(bankId, cardId) => setDeleteCardConfirm({ bankId, cardId })}
                  onViewStatement={(card, bankId) => setStatementDialogData({ card, bankId })}
                />
              ))}
            </div>
          </TabsContent>

          {/* ════════════════════════════════════════
              TAB: Investimentos
          ════════════════════════════════════════ */}
          <TabsContent value="investments" className="space-y-6 mt-6">
            <div className="flex justify-end">
              <Dialog open={investmentDialogOpen} onOpenChange={setInvestmentDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2 rounded-xl" onClick={() => setEditingInvestmentId(null)}>
                    <Plus className="w-4 h-4" />
                    Adicionar Investimento
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-2xl">
                  <DialogHeader>
                    <DialogTitle>{editingInvestmentId ? "Editar" : "Novo"} Investimento</DialogTitle>
                    <DialogDescription>
                      {editingInvestmentId ? "Edite" : "Adicione"} um investimento.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="inv-name">Nome</Label>
                      <Input
                        id="inv-name" placeholder="Ex: Tesouro Selic..."
                        value={investmentFormData.name}
                        onChange={(e) => setInvestmentFormData({ ...investmentFormData, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="inv-type">Tipo</Label>
                      <Select
                        value={investmentFormData.type}
                        onValueChange={(v: InvestmentType) => setInvestmentFormData({ ...investmentFormData, type: v })}
                      >
                        <SelectTrigger id="inv-type"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fixed-income">Renda Fixa</SelectItem>
                          <SelectItem value="stocks">Ações</SelectItem>
                          <SelectItem value="funds">Fundos</SelectItem>
                          <SelectItem value="crypto">Criptomoedas</SelectItem>
                          <SelectItem value="other">Outros</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="inv-amount">Valor Investido</Label>
                      <Input
                        id="inv-amount" type="number" step="0.01" placeholder="0,00"
                        value={investmentFormData.amount}
                        onChange={(e) => setInvestmentFormData({ ...investmentFormData, amount: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="inv-profit">Rentabilidade (% a.a.)</Label>
                      <Input
                        id="inv-profit" type="number" step="0.01" placeholder="0,00"
                        value={investmentFormData.profitability}
                        onChange={(e) => setInvestmentFormData({ ...investmentFormData, profitability: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="inv-color">Cor</Label>
                      <div className="flex gap-2">
                        <Input
                          id="inv-color" type="color" value={investmentFormData.color}
                          onChange={(e) => setInvestmentFormData({ ...investmentFormData, color: e.target.value })}
                          className="w-20 h-10"
                        />
                        <Input
                          value={investmentFormData.color}
                          onChange={(e) => setInvestmentFormData({ ...investmentFormData, color: e.target.value })}
                          placeholder="#000000"
                        />
                      </div>
                    </div>
                    <Button onClick={handleSaveInvestment} className="w-full rounded-xl">
                      {editingInvestmentId ? "Salvar Alterações" : "Adicionar"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {investments.map((inv) => (
                <InvestmentModularCard
                  key={inv.id}
                  investment={inv}
                  totalInvestments={totalInvestments}
                  onEdit={openEditInvestmentDialog}
                  onDelete={(id) => setDeleteInvestmentConfirm(id)}
                />
              ))}
            </div>

            {investments.length === 0 && (
              <div className="rounded-3xl bg-card/40 backdrop-blur-md border border-white/5 p-12 flex flex-col items-center justify-center">
                <div className="p-4 rounded-full bg-muted/50 mb-4">
                  <TrendingUp className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">
                  Nenhum investimento cadastrado
                </p>
              </div>
            )}
          </TabsContent>

          {/* ════════════════════════════════════════
              TAB: Visão Geral
          ════════════════════════════════════════ */}
          <TabsContent value="overview" className="space-y-6 mt-6">
            <div className="grid gap-6 lg:grid-cols-2">

              {/* Donut chart — composition */}
              <div className="rounded-3xl bg-card/60 backdrop-blur-md border border-white/5 shadow-sm p-6 space-y-4">
                <div>
                  <h3 className="text-base font-semibold">Composição Patrimonial</h3>
                  <p className="text-xs text-muted-foreground">Distribuição dos seus ativos e passivos</p>
                </div>
                {overviewChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={overviewChartData}
                        cx="50%" cy="50%"
                        innerRadius={65} outerRadius={100}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {overviewChartData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} stroke="transparent" />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v: number) => formatCurrency(v)}
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "none",
                          borderRadius: "12px",
                          boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
                        }}
                      />
                      <Legend
                        iconType="circle"
                        iconSize={8}
                        formatter={(value) => (
                          <span className="text-xs text-muted-foreground">{value}</span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">
                    Sem dados para exibir
                  </div>
                )}
              </div>

              {/* Top card utilisation */}
              <div className="rounded-3xl bg-card/60 backdrop-blur-md border border-white/5 shadow-sm p-6 space-y-4">
                <div>
                  <h3 className="text-base font-semibold">Utilização de Cartões</h3>
                  <p className="text-xs text-muted-foreground">Ciclo de faturamento atual</p>
                </div>
                {topUtilisedCards.length > 0 ? (
                  <div className="space-y-4">
                    {topUtilisedCards.map((card) => (
                      <div key={card.id} className="space-y-1.5">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium truncate max-w-[60%]">{card.name}</span>
                          <span className="tabular-nums text-muted-foreground">
                            {formatCurrency(card.currentBillAmount)}{" "}
                            <span className="text-xs">/ {formatCurrency(card.limit)}</span>
                          </span>
                        </div>
                        <Progress
                          value={card.pct}
                          className="h-2 bg-muted/40"
                          indicatorClassName={getCreditUsageColor(card.pct)}
                        />
                        <p className="text-[11px] text-muted-foreground text-right">
                          {card.pct.toFixed(1)}% utilizado
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
                    Nenhum cartão cadastrado
                  </div>
                )}
              </div>
            </div>

            {/* Quick stats row */}
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { label: "Bancos Cadastrados", value: `${banks.length}`, icon: Landmark, color: "text-primary" },
                { label: "Cartões de Crédito", value: `${allCards.length}`, icon: CreditCard, color: "text-violet-500" },
                { label: "Investimentos Ativos", value: `${investments.length}`, icon: TrendingUp, color: "text-emerald-500" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-3xl bg-card/60 backdrop-blur-md border border-white/5 shadow-sm p-5 flex items-center gap-4"
                >
                  <div className="p-2.5 rounded-2xl bg-muted/40">
                    <s.icon className={`h-5 w-5 ${s.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* ── Card Dialog ── */}
        <Dialog open={cardDialogOpen} onOpenChange={setCardDialogOpen}>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle>{editingCardData?.cardId ? "Editar" : "Novo"} Cartão</DialogTitle>
              <DialogDescription>
                {editingCardData?.cardId ? "Edite" : "Adicione"} um cartão de crédito.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="card-name">Nome do Cartão</Label>
                <Input
                  id="card-name" placeholder="Ex: Cartão Principal..."
                  value={cardFormData.name}
                  onChange={(e) => setCardFormData({ ...cardFormData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="card-limit">Limite Total</Label>
                <Input
                  id="card-limit" type="number" step="0.01" placeholder="0,00"
                  value={cardFormData.limit}
                  onChange={(e) => setCardFormData({ ...cardFormData, limit: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="card-used">Valor Utilizado (manual)</Label>
                <Input
                  id="card-used" type="number" step="0.01" placeholder="0,00"
                  value={cardFormData.used}
                  onChange={(e) => setCardFormData({ ...cardFormData, used: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="card-color">Cor</Label>
                <div className="flex gap-2">
                  <Input
                    id="card-color" type="color" value={cardFormData.color}
                    onChange={(e) => setCardFormData({ ...cardFormData, color: e.target.value })}
                    className="w-20 h-10"
                  />
                  <Input
                    value={cardFormData.color}
                    onChange={(e) => setCardFormData({ ...cardFormData, color: e.target.value })}
                    placeholder="#000000"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="closing-day">Dia de Fechamento</Label>
                  <Input
                    id="closing-day" type="number" min="1" max="31" placeholder="1"
                    value={cardFormData.closingDay}
                    onChange={(e) => setCardFormData({ ...cardFormData, closingDay: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="due-day">Dia de Vencimento</Label>
                  <Input
                    id="due-day" type="number" min="1" max="31" placeholder="10"
                    value={cardFormData.dueDay}
                    onChange={(e) => setCardFormData({ ...cardFormData, dueDay: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-3 p-3 rounded-xl bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="auto-debit">Débito Automático</Label>
                    <p className="text-xs text-muted-foreground">Paga a fatura automaticamente</p>
                  </div>
                  <Switch
                    id="auto-debit"
                    checked={cardFormData.autoDebit}
                    onCheckedChange={(c) => setCardFormData({ ...cardFormData, autoDebit: c })}
                  />
                </div>
                {cardFormData.autoDebit && (
                  <div className="space-y-2">
                    <Label>Conta para Débito</Label>
                    <Select
                      value={cardFormData.autoDebitBankId}
                      onValueChange={(v) => setCardFormData({ ...cardFormData, autoDebitBankId: v })}
                    >
                      <SelectTrigger><SelectValue placeholder="Selecione a conta" /></SelectTrigger>
                      <SelectContent>
                        {banks.filter((b) => b.type !== "credit").map((bank) => (
                          <SelectItem key={bank.id} value={bank.id}>{bank.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <Button onClick={handleSaveCard} className="w-full rounded-xl">
                {editingCardData?.cardId ? "Salvar Alterações" : "Adicionar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Statement Dialog ── */}
        {statementDialogData && (
          <CardStatementDialog
            open={!!statementDialogData}
            onOpenChange={(open) => !open && setStatementDialogData(null)}
            card={statementDialogData.card}
            bank={banks.find((b) => b.id === statementDialogData.bankId)!}
            banks={banks}
          />
        )}

        {/* ── Confirm Dialogs ── */}
        <ConfirmDialog
          open={!!deleteBankConfirm}
          onOpenChange={(open) => !open && setDeleteBankConfirm(null)}
          title="Excluir Banco"
          description="Tem certeza que deseja excluir este banco? Os cartões associados também serão excluídos."
          onConfirm={() => deleteBankConfirm && handleDeleteBank(deleteBankConfirm)}
          confirmText="Excluir"
          variant="destructive"
        />
        <ConfirmDialog
          open={!!deleteCardConfirm}
          onOpenChange={(open) => !open && setDeleteCardConfirm(null)}
          title="Excluir Cartão"
          description="Tem certeza que deseja excluir este cartão?"
          onConfirm={() => deleteCardConfirm && handleDeleteCard(deleteCardConfirm.bankId, deleteCardConfirm.cardId)}
          confirmText="Excluir"
          variant="destructive"
        />
        <ConfirmDialog
          open={!!deleteInvestmentConfirm}
          onOpenChange={(open) => !open && setDeleteInvestmentConfirm(null)}
          title="Excluir Investimento"
          description="Tem certeza que deseja excluir este investimento?"
          onConfirm={() => deleteInvestmentConfirm && handleDeleteInvestment(deleteInvestmentConfirm)}
          confirmText="Excluir"
          variant="destructive"
        />
      </main>
    </div>
  );
};

export default Banks;
