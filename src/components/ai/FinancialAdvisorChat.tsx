import { useState, useRef, useEffect, useMemo } from "react";
import { Send, Trash2, Sparkles, Loader2, Copy, Landmark, TrendingUp, Receipt, CreditCard, ArrowUpDown, Check, X, Plus, Maximize2, Minimize2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { useFinancialAdvisor, ChatMessage, PendingToolCall, DataMap } from "@/hooks/useFinancialAdvisor";
import { useFinance } from "@/contexts/FinanceContext";
import { useCommitments } from "@/hooks/useCommitments";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useBudgetAreas } from "@/hooks/useBudgetAreas";
import { useWishlist } from "@/hooks/useWishlist";
import { useIsMobile } from "@/hooks/use-mobile";
import { useBanks } from "@/hooks/useBanks";
import { useCards } from "@/hooks/useCards";
import { useInvestments } from "@/hooks/useInvestments";
import { useLoans } from "@/hooks/useLoans";
import { startOfMonth, endOfMonth, isAfter, isBefore, parseISO } from "date-fns";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const QUICK_SUGGESTIONS = [
  "Analise meu orçamento",
  "Devo antecipar parcelas?",
  "Como economizar mais?",
  "Projeção para SP",
];

const TopHatIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <ellipse cx="12" cy="18" rx="10" ry="2.5" />
    <path d="M7 18V10c0-1 .5-2 1.5-2.5L10 7V4c0-.5.5-1 1-1h2c.5 0 1 .5 1 1v3l1.5.5C16.5 8 17 9 17 10v8" />
    <path d="M7.5 12.5h9" strokeWidth="1.2" />
  </svg>
);

const getToolMeta = (toolName: string) => {
  switch (toolName) {
    case "manage_bank_account": return { icon: Landmark, label: "Conta Bancária", module: "patrimonio", color: "text-blue-500", bgColor: "bg-blue-500/10" };
    case "manage_investment": return { icon: TrendingUp, label: "Investimento", module: "patrimonio", color: "text-emerald-500", bgColor: "bg-emerald-500/10" };
    case "manage_loan": return { icon: Receipt, label: "Empréstimo", module: "compromissos", color: "text-orange-500", bgColor: "bg-orange-500/10" };
    case "manage_installment": return { icon: CreditCard, label: "Parcelas", module: "compromissos", color: "text-pink-500", bgColor: "bg-pink-500/10" };
    case "manage_transaction": return { icon: ArrowUpDown, label: "Transação", module: "transacoes", color: "text-purple-500", bgColor: "bg-purple-500/10" };
    default: return { icon: Sparkles, label: "Ação", module: "geral", color: "text-muted-foreground", bgColor: "bg-muted/10" };
  }
};

const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

const PendingActionCard = ({ action, onApprove, onCancel, isLoading }: { action: PendingToolCall; onApprove: () => void; onCancel: () => void; isLoading: boolean }) => {
  const meta = getToolMeta(action.toolName);
  const Icon = meta.icon;
  const args = action.arguments;

  return (
    <div className="rounded-2xl bg-card/60 backdrop-blur-md border border-border/50 p-3.5 space-y-2.5 mx-1">
      <div className="flex items-center gap-2">
        <div className={cn("h-7 w-7 rounded-xl flex items-center justify-center", meta.bgColor)}>
          <Icon className={cn("h-3.5 w-3.5", meta.color)} />
        </div>
        <div>
          <p className="text-xs font-medium text-foreground">{meta.label}</p>
          <p className="text-[10px] text-muted-foreground capitalize">{args.action || "ação"}</p>
        </div>
      </div>

      <div className="space-y-1 text-xs text-muted-foreground">
        {args.name && <p>📌 <span className="text-foreground font-medium">{args.name}</span></p>}
        {args.description && <p>📝 <span className="text-foreground font-medium">{args.description}</span></p>}
        {args.balance !== undefined && <p>💰 Saldo: <span className="text-foreground font-medium">{fmt(args.balance)}</span></p>}
        {args.amount !== undefined && <p>💰 Valor: <span className="text-foreground font-medium">{fmt(args.amount)}</span></p>}
        {args.total_amount !== undefined && <p>💰 Total: <span className="text-foreground font-medium">{fmt(args.total_amount)}</span></p>}
        {args.principal !== undefined && <p>💰 Principal: <span className="text-foreground font-medium">{fmt(args.principal)}</span></p>}
        {args.installments && <p>📊 Parcelas: <span className="text-foreground font-medium">{args.installments}x</span></p>}
        {args.installment_count && <p>📊 Parcelas: <span className="text-foreground font-medium">{args.installment_count}x</span></p>}
        {args.interest_rate !== undefined && <p>📈 Juros: <span className="text-foreground font-medium">{args.interest_rate}% a.m.</span></p>}
        {args.date && <p>📅 {new Date(args.date).toLocaleDateString("pt-BR")}</p>}
      </div>

      {meta.module === "compromissos" && args.principal && (
        <Progress value={0} className="h-1.5 rounded-full" />
      )}

      <div className="flex gap-2">
        <Button size="sm" onClick={onApprove} disabled={isLoading} className="flex-1 h-7 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1">
          {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Aprovar
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={isLoading} className="flex-1 h-7 rounded-xl text-xs gap-1 hover:bg-destructive/10 hover:text-destructive">
          <X className="h-3 w-3" /> Cancelar
        </Button>
      </div>
    </div>
  );
};

const MessageBubble = ({ message }: { message: ChatMessage }) => {
  const isUser = message.role === "user";
  return (
    <div className={`flex gap-2 items-start ${isUser ? "flex-row-reverse" : ""}`}>
      {!isUser && (
        <div className="h-6 w-6 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0 mt-0.5">
          <TopHatIcon className="h-3.5 w-3.5 text-purple-500" />
        </div>
      )}
      <div className={cn(
        "max-w-[82%] px-3.5 py-2.5 text-sm leading-relaxed",
        isUser
          ? "bg-purple-600 text-white ml-auto rounded-2xl rounded-tr-sm"
          : "bg-muted/50 backdrop-blur-sm text-foreground rounded-2xl rounded-tl-sm"
      )}>
        {isUser ? (
          <span className="whitespace-pre-wrap">{message.content}</span>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-2 [&>ul]:mb-2 [&>ol]:mb-2 [&>p:last-child]:mb-0 [&>h2]:text-sm [&>h2]:font-semibold [&>h2]:mt-3 [&>h2]:mb-1">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
};

// Session sidebar
const SessionList = ({ sessions, activeSessionId, onSwitch, onCreate, onDelete }: {
  sessions: Array<{ id: string; title: string; created_at: string }>;
  activeSessionId: string | null;
  onSwitch: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
}) => (
  <div className="flex flex-col h-full border-r border-border/30">
    <div className="p-3 border-b border-border/30">
      <Button size="sm" variant="outline" className="w-full h-8 rounded-xl text-xs gap-1.5" onClick={onCreate}>
        <Plus className="h-3 w-3" /> Nova conversa
      </Button>
    </div>
    <ScrollArea className="flex-1">
      <div className="p-2 space-y-0.5">
        {sessions.map((s) => (
          <div
            key={s.id}
            className={cn(
              "group flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer text-xs transition-colors",
              s.id === activeSessionId ? "bg-purple-500/10 text-foreground" : "text-muted-foreground hover:bg-muted/50"
            )}
            onClick={() => onSwitch(s.id)}
          >
            <MessageSquare className="h-3 w-3 shrink-0" />
            <span className="truncate flex-1">{s.title}</span>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(s.id); }}
              className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </ScrollArea>
  </div>
);

export const FinancialAdvisorChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const {
    messages, isLoading, isLoadingHistory, pendingAction,
    sessions, activeSessionId,
    sendMessage, clearMessages, approveAction, cancelAction,
    createSession, switchSession, deleteSession,
  } = useFinancialAdvisor();

  const { transactions, categories, goals } = useFinance();
  const { summary: commitmentSummary } = useCommitments();
  const { settings } = useUserSettings();
  const { budgetAreas } = useBudgetAreas();
  const { wishlistItems } = useWishlist();
  const { banks } = useBanks();
  const { cards } = useCards();
  const { investments } = useInvestments();
  const { loans } = useLoans();

  // Build dataMap with real UUIDs
  const dataMap: DataMap = useMemo(() => ({
    banks: (banks || []).map((b: any) => ({ id: b.id, name: b.name, type: b.type, balance: b.balance })),
    categories: (categories || []).map((c: any) => ({ id: c.id, name: c.name, type: c.type })),
    loans: (loans || []).map((l: any) => ({ id: l.id, name: l.name, status: l.status, principal: l.principal })),
    investments: (investments || []).map((i: any) => ({ id: i.id, name: i.name, type: i.type, amount: i.amount })),
    cards: (cards || []).map((c: any) => ({ id: c.id, name: c.name, bank_id: c.bank_id })),
  }), [banks, categories, loans, investments, cards]);

  const financialContext = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const monthTransactions = transactions.filter((t) => {
      const d = typeof t.date === "string" ? parseISO(t.date as unknown as string) : t.date;
      return !isBefore(d, monthStart) && !isAfter(d, monthEnd);
    });

    const monthlyIncome = monthTransactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const monthlyExpenses = monthTransactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

    const catMap = new Map<string, number>();
    monthTransactions.filter((t) => t.type === "expense").forEach((t) => catMap.set(t.categoryId, (catMap.get(t.categoryId) || 0) + t.amount));

    const topExpenseCategories = Array.from(catMap.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([catId, amount]) => ({
        name: categories.find((c) => c.id === catId)?.name || "Outros",
        amount,
      }));

    return {
      monthlyIncome: settings?.monthlySalary || monthlyIncome,
      monthlyExpenses,
      balance: (settings?.monthlySalary || monthlyIncome) - monthlyExpenses,
      totalCommitments: commitmentSummary.totalRemainingAmount,
      commitmentsCount: commitmentSummary.totalActive,
      thisMonthCommitments: commitmentSummary.thisMonthAmount,
      budgetAreas: budgetAreas.map((a) => ({ name: a.name, percentage: a.percentage })),
      topExpenseCategories,
      activeGoals: goals.filter((g) => g.status === "active").map((g) => ({ name: g.name, current: g.currentAmount, target: g.targetAmount })),
      wishlistItems: (wishlistItems || []).filter((w) => w.status === "pending").map((w) => ({ name: w.name, price: w.price })),
    };
  }, [transactions, categories, goals, commitmentSummary, settings, budgetAreas, wishlistItems]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, pendingAction]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    setInput("");
    sendMessage(trimmed, financialContext, dataMap);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleExportChat = async () => {
    if (messages.length === 0) { toast.info("Nenhuma mensagem."); return; }
    const text = messages.map((m) => `[${m.role === "user" ? "Você" : "🎩"}]: ${m.content}`).join("\n\n");
    try {
      await navigator.clipboard.writeText(`📋 GutiosCoins — Wealth Manager\n\n${text}`);
      toast.success("Copiado!");
    } catch { toast.error("Erro ao copiar."); }
  };

  const showSidebar = (isExpanded || !isMobile) && sessions.length > 0;

  const chatContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-purple-500/10 flex items-center justify-center text-lg">
            🎩
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground leading-none">Wealth Manager</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Agente de Elite · IA</p>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          {messages.length > 0 && (
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={handleExportChat} title="Copiar">
              <Copy className="h-3.5 w-3.5" />
            </Button>
          )}
          {messages.length > 0 && (
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-destructive/10 hover:text-destructive" onClick={clearMessages} title="Limpar">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
          {!isMobile && (
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => setIsExpanded(!isExpanded)} title={isExpanded ? "Minimizar" : "Expandir"}>
              {isExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 pr-1" ref={scrollRef}>
        {isLoadingHistory ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="text-4xl mb-4">🎩</div>
            <p className="text-sm text-foreground font-medium text-center">Olá! Sou seu Wealth Manager.</p>
            <p className="text-xs text-muted-foreground text-center mt-1 max-w-[260px]">
              Posso gerir transações, saldos, investimentos, empréstimos e parcelas. Como posso ajudar?
            </p>
          </div>
        ) : (
          <div className="space-y-3 pb-1">
            {messages.map((msg, i) => (
              <MessageBubble key={i} message={msg} />
            ))}
            {pendingAction && (
              <PendingActionCard action={pendingAction} onApprove={approveAction} onCancel={cancelAction} isLoading={isLoading} />
            )}
            {isLoading && !pendingAction && messages[messages.length - 1]?.role !== "assistant" && (
              <div className="flex gap-2 items-start">
                <div className="h-6 w-6 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0 mt-0.5 text-sm">🎩</div>
                <div className="bg-muted/50 rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex gap-1 text-muted-foreground">
                    <span className="animate-bounce text-[10px]">●</span>
                    <span className="animate-bounce text-[10px]" style={{ animationDelay: "0.1s" }}>●</span>
                    <span className="animate-bounce text-[10px]" style={{ animationDelay: "0.2s" }}>●</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="pt-3 mt-auto space-y-2">
        {messages.length === 0 && !isLoadingHistory && (
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {QUICK_SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => sendMessage(s, financialContext, dataMap)} className="shrink-0 text-[11px] px-3 py-1.5 rounded-full bg-secondary/40 text-secondary-foreground hover:bg-secondary/70 transition-colors whitespace-nowrap">
                {s}
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Fale com seu wealth manager..."
            className="min-h-[40px] max-h-[100px] resize-none text-sm rounded-2xl border-border/50 bg-background/60 backdrop-blur-sm"
            rows={1}
          />
          <Button size="icon" onClick={handleSend} disabled={!input.trim() || isLoading} className="shrink-0 rounded-2xl h-10 w-10">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* FAB */}
      <Button onClick={() => setIsOpen(true)} className="fixed bottom-24 right-6 z-50 h-14 w-14 rounded-full shadow-xl shadow-purple-500/20 border-none bg-purple-600 hover:bg-purple-700 text-white text-2xl" size="icon">
        🎩
      </Button>

      {/* Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-[2px]" onClick={() => { setIsOpen(false); setIsExpanded(false); }} />
      )}

      {/* Panel */}
      {isOpen && (
        <div className={cn(
          "fixed z-50 flex border-none shadow-2xl shadow-black/10 overflow-hidden transition-all duration-300",
          "bg-card/80 backdrop-blur-xl",
          isExpanded && !isMobile
            ? "inset-[5%] rounded-[1.75rem]"
            : isMobile
              ? "bottom-0 left-0 right-0 h-[80vh] rounded-t-[2rem] flex-col"
              : "bottom-6 right-6 w-[400px] h-[620px] max-h-[85vh] rounded-[1.75rem] flex-col"
        )}>
          {isMobile && (
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
            </div>
          )}

          {/* Expanded: two-column layout */}
          {isExpanded && !isMobile ? (
            <>
              <div className="w-[240px] shrink-0">
                <SessionList
                  sessions={sessions}
                  activeSessionId={activeSessionId}
                  onSwitch={switchSession}
                  onCreate={() => createSession()}
                  onDelete={deleteSession}
                />
              </div>
              <div className="flex-1 overflow-hidden p-5 pt-3">{chatContent}</div>
            </>
          ) : (
            <div className="flex-1 overflow-hidden p-5 pt-3">{chatContent}</div>
          )}
        </div>
      )}
    </>
  );
};
