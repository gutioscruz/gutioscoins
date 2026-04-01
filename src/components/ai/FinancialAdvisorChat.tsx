import { useState, useRef, useEffect, useMemo } from "react";
import { Send, Trash2, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useFinancialAdvisor, ChatMessage } from "@/hooks/useFinancialAdvisor";
import { useFinance } from "@/contexts/FinanceContext";
import { useCommitments } from "@/hooks/useCommitments";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useBudgetAreas } from "@/hooks/useBudgetAreas";
import { useWishlist } from "@/hooks/useWishlist";
import { useIsMobile } from "@/hooks/use-mobile";
import { startOfMonth, endOfMonth, isAfter, isBefore, parseISO } from "date-fns";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

const QUICK_SUGGESTIONS = [
  "Analise meu orçamento",
  "Devo antecipar parcelas?",
  "Como economizar mais?",
  "Item da wishlist vale?",
  "Projeção para SP",
];

/** Sophisticated monocle icon — minimal, elegant */
const MonocleIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="12" cy="10" r="6" />
    <circle cx="12" cy="10" r="3.5" />
    <path d="M12 16v5" />
    <path d="M10 21h4" />
    <circle cx="12" cy="10" r="1" fill="currentColor" stroke="none" />
  </svg>
);

export const FinancialAdvisorChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const { messages, isLoading, isLoadingHistory, sendMessage, clearMessages } =
    useFinancialAdvisor();

  const { transactions, categories, goals } = useFinance();
  const { summary: commitmentSummary } = useCommitments();
  const { settings } = useUserSettings();
  const { budgetAreas } = useBudgetAreas();
  const { wishlistItems } = useWishlist();

  const financialContext = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const monthTransactions = transactions.filter((t) => {
      const d = typeof t.date === "string" ? parseISO(t.date as unknown as string) : t.date;
      return !isBefore(d, monthStart) && !isAfter(d, monthEnd);
    });

    const monthlyIncome = monthTransactions
      .filter((t) => t.type === "income")
      .reduce((s, t) => s + t.amount, 0);
    const monthlyExpenses = monthTransactions
      .filter((t) => t.type === "expense")
      .reduce((s, t) => s + t.amount, 0);

    const catMap = new Map<string, number>();
    monthTransactions
      .filter((t) => t.type === "expense")
      .forEach((t) => catMap.set(t.categoryId, (catMap.get(t.categoryId) || 0) + t.amount));

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
  }, [messages]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    setInput("");
    sendMessage(trimmed, financialContext);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const chatContent = (
    <div className="flex flex-col h-full">
      {/* Minimal glassmorphism header */}
      <div className="flex items-center justify-between pb-4">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <MonocleIcon className="h-4.5 w-4.5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground leading-none">Consultor</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Powered by IA</p>
          </div>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-destructive/10 hover:text-destructive" onClick={clearMessages} title="Limpar conversa">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Messages area */}
      <ScrollArea className="flex-1 pr-1" ref={scrollRef}>
        {isLoadingHistory ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="h-14 w-14 rounded-full bg-primary/5 flex items-center justify-center mb-4">
              <MonocleIcon className="h-7 w-7 text-primary/60" />
            </div>
            <p className="text-sm text-foreground font-medium text-center">
              Olá! Sou seu consultor financeiro.
            </p>
            <p className="text-xs text-muted-foreground text-center mt-1 max-w-[240px]">
              Pergunte sobre orçamento, metas, investimentos ou qualquer decisão financeira.
            </p>
          </div>
        ) : (
          <div className="space-y-3 pb-1">
            {messages.map((msg, i) => (
              <MessageBubble key={i} message={msg} />
            ))}
            {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
              <div className="flex gap-2 items-start">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="h-3 w-3 text-primary" />
                </div>
                <div className="bg-muted/50 backdrop-blur-sm rounded-2xl rounded-tl-sm px-4 py-3 text-sm">
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

      {/* Pills + Input */}
      <div className="pt-3 mt-auto space-y-2">
        {messages.length === 0 && !isLoadingHistory && (
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {QUICK_SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => sendMessage(s, financialContext)}
                className="shrink-0 text-[11px] px-3 py-1.5 rounded-full bg-secondary/40 text-secondary-foreground hover:bg-secondary/70 transition-colors whitespace-nowrap"
              >
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
            placeholder="Pergunte ao seu consultor..."
            className="min-h-[40px] max-h-[100px] resize-none text-sm rounded-2xl border-border/50 bg-background/60 backdrop-blur-sm"
            rows={1}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="shrink-0 rounded-2xl h-10 w-10"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* FAB — sophisticated monocle icon */}
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-6 z-50 h-14 w-14 rounded-full shadow-xl shadow-primary/20 border-none"
        size="icon"
      >
        <MonocleIcon className="h-6 w-6" />
      </Button>

      {/* Overlay backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/20 backdrop-blur-[2px] transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Floating panel — NOT full screen */}
      {isOpen && (
        <div
          className={cn(
            "fixed z-50 flex flex-col border-none shadow-2xl shadow-black/10 overflow-hidden transition-all duration-300",
            "bg-card/80 backdrop-blur-xl",
            isMobile
              ? "bottom-0 left-0 right-0 h-[75vh] rounded-t-[2rem]"
              : "bottom-6 right-6 w-[380px] h-[600px] max-h-[80vh] rounded-[1.75rem]"
          )}
        >
          {/* Drag indicator on mobile */}
          {isMobile && (
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
            </div>
          )}

          <div className="flex-1 overflow-hidden p-5 pt-3">
            {chatContent}
          </div>
        </div>
      )}
    </>
  );
};

const MessageBubble = ({ message }: { message: ChatMessage }) => {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-2 items-start ${isUser ? "flex-row-reverse" : ""}`}>
      {!isUser && (
        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles className="h-3 w-3 text-primary" />
        </div>
      )}
      <div
        className={cn(
          "max-w-[82%] px-4 py-2.5 text-sm leading-relaxed",
          isUser
            ? "bg-primary text-primary-foreground ml-auto rounded-2xl rounded-tr-sm"
            : "bg-muted/50 backdrop-blur-sm text-foreground rounded-2xl rounded-tl-sm"
        )}
      >
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
