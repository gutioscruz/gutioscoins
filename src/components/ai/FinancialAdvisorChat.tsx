import { useState, useRef, useEffect, useMemo } from "react";
import { Bot, Send, Trash2, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useFinancialAdvisor, ChatMessage } from "@/hooks/useFinancialAdvisor";
import { useFinance } from "@/contexts/FinanceContext";
import { useCommitments } from "@/hooks/useCommitments";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useBudgetAreas } from "@/hooks/useBudgetAreas";
import { useWishlist } from "@/hooks/useWishlist";
import { useIsMobile } from "@/hooks/use-mobile";
import { startOfMonth, endOfMonth, isAfter, isBefore, parseISO } from "date-fns";
import ReactMarkdown from "react-markdown";

const QUICK_SUGGESTIONS = [
  "Analise meu orçamento",
  "Devo antecipar parcelas?",
  "Como economizar mais?",
  "Item da wishlist vale a pena?",
  "Projeção para São Paulo",
];

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
      .forEach((t) => {
        catMap.set(t.categoryId, (catMap.get(t.categoryId) || 0) + t.amount);
      });

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
      activeGoals: goals
        .filter((g) => g.status === "active")
        .map((g) => ({ name: g.name, current: g.currentAmount, target: g.targetAmount })),
      wishlistItems: (wishlistItems || [])
        .filter((w) => w.status === "pending")
        .map((w) => ({ name: w.name, price: w.price })),
    };
  }, [transactions, categories, goals, commitmentSummary, settings, budgetAreas, wishlistItems]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    setInput("");
    sendMessage(trimmed, financialContext);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const chatContent = (
    <div className="flex flex-col h-full">
      {/* Minimal header */}
      <div className="flex items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-full bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <span className="text-xs text-muted-foreground font-medium">Consultor IA</span>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={clearMessages} title="Limpar conversa">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 pr-2" ref={scrollRef}>
        {isLoadingHistory ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground mb-1">
              Olá! Sou seu consultor financeiro.
            </p>
            <p className="text-xs text-muted-foreground/70">
              Pergunte sobre seu orçamento, metas ou investimentos.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg, i) => (
              <MessageBubble key={i} message={msg} />
            ))}
            {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
              <div className="flex gap-2 items-start">
                <div className="p-1.5 rounded-full bg-primary/10 shrink-0">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="bg-muted/60 backdrop-blur-md rounded-2xl rounded-tl-sm px-4 py-3 text-sm">
                  <div className="flex gap-1 text-muted-foreground">
                    <span className="animate-bounce">●</span>
                    <span className="animate-bounce" style={{ animationDelay: "0.1s" }}>●</span>
                    <span className="animate-bounce" style={{ animationDelay: "0.2s" }}>●</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Quick suggestion pills + Input */}
      <div className="pt-3 border-t border-border/50 mt-3 space-y-2">
        {messages.length === 0 && !isLoadingHistory && (
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {QUICK_SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => sendMessage(s, financialContext)}
                className="shrink-0 text-xs px-3 py-1.5 rounded-full bg-secondary/50 text-secondary-foreground hover:bg-secondary/80 transition-colors whitespace-nowrap"
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
            className="min-h-[40px] max-h-[100px] resize-none text-sm rounded-xl"
            rows={1}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="shrink-0 rounded-xl"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-6 z-50 h-14 w-14 rounded-full shadow-lg"
        size="icon"
      >
        <Bot className="h-6 w-6" />
      </Button>

      {!isMobile ? (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetContent side="right" className="w-[420px] sm:max-w-[420px] flex flex-col p-5">
            <SheetHeader className="pb-0">
              <SheetTitle className="text-base">Consultor Financeiro</SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-hidden mt-2">{chatContent}</div>
          </SheetContent>
        </Sheet>
      ) : (
        <Drawer open={isOpen} onOpenChange={setIsOpen}>
          <DrawerContent className="h-[85vh] px-4 pb-4">
            <DrawerHeader className="px-0 pb-0">
              <DrawerTitle className="text-base">Consultor Financeiro</DrawerTitle>
            </DrawerHeader>
            <div className="flex-1 overflow-hidden mt-2">{chatContent}</div>
          </DrawerContent>
        </Drawer>
      )}
    </>
  );
};

const MessageBubble = ({ message }: { message: ChatMessage }) => {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-2 items-start ${isUser ? "flex-row-reverse" : ""}`}>
      {!isUser && (
        <div className="p-1.5 rounded-full bg-primary/10 shrink-0 mt-1">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
        </div>
      )}
      <div
        className={`max-w-[85%] px-4 py-3 text-sm ${
          isUser
            ? "bg-primary text-primary-foreground ml-auto rounded-2xl rounded-tr-sm"
            : "bg-muted/60 backdrop-blur-md text-foreground rounded-2xl rounded-tl-sm"
        }`}
      >
        {isUser ? (
          <span className="whitespace-pre-wrap">{message.content}</span>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-2 [&>ul]:mb-2 [&>ol]:mb-2 [&>p:last-child]:mb-0">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
};
