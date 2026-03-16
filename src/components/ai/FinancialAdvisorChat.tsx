import { useState, useRef, useEffect, useMemo } from "react";
import { Bot, X, Send, Trash2, Sparkles } from "lucide-react";
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

const QUICK_SUGGESTIONS = [
  "Como posso reduzir meus gastos?",
  "Devo antecipar minhas parcelas?",
  "Qual o melhor momento para comprar um item da minha lista de desejos?",
  "Analise meu orçamento e sugira melhorias",
  "Como posso economizar mais todo mês?",
];

export const FinancialAdvisorChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isMobile = useIsMobile();

  const { messages, isLoading, sendMessage, clearMessages } =
    useFinancialAdvisor();

  // Collect financial context
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
      budgetAreas: budgetAreas.map((a) => ({
        name: a.name,
        percentage: a.percentage,
      })),
      topExpenseCategories,
      activeGoals: goals
        .filter((g) => g.status === "active")
        .map((g) => ({
          name: g.name,
          current: g.currentAmount,
          target: g.targetAmount,
        })),
      wishlistItems: (wishlistItems || [])
        .filter((w) => w.status === "pending")
        .map((w) => ({ name: w.name, price: w.price })),
    };
  }, [
    transactions,
    categories,
    goals,
    commitmentSummary,
    settings,
    budgetAreas,
    wishlistItems,
  ]);

  // Auto-scroll
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

  const handleQuickSuggestion = (text: string) => {
    sendMessage(text, financialContext);
  };

  const chatContent = (
    <div className="flex flex-col h-full">
      {/* Header actions */}
      <div className="flex items-center justify-between px-1 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Powered by IA</p>
          </div>
        </div>
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={clearMessages}
            title="Limpar conversa"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 pr-2" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="space-y-4">
            <div className="text-center py-4">
              <Bot className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Olá! Sou seu consultor financeiro pessoal. Como posso ajudar?
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium">
                Sugestões rápidas:
              </p>
              {QUICK_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleQuickSuggestion(suggestion)}
                  className="block w-full text-left text-sm p-2.5 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <MessageBubble key={i} message={msg} />
            ))}
            {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
              <div className="flex gap-2 items-start">
                <div className="p-1.5 rounded-lg bg-primary/10 shrink-0">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-muted rounded-lg p-3 text-sm">
                  <div className="flex gap-1">
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

      {/* Input */}
      <div className="pt-3 border-t mt-3">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Pergunte ao seu consultor..."
            className="min-h-[40px] max-h-[100px] resize-none text-sm"
            rows={1}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* FAB trigger - stacked above the transaction FAB */}
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-6 z-50 h-14 w-14 rounded-full shadow-lg"
        size="icon"
      >
        <Bot className="h-6 w-6" />
      </Button>

      {/* Desktop: Sheet from right */}
      {!isMobile ? (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetContent side="right" className="w-[420px] sm:max-w-[420px] flex flex-col p-5">
            <SheetHeader className="pb-0">
              <SheetTitle className="text-base">Consultor Financeiro</SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-hidden mt-2">
              {chatContent}
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        /* Mobile: Drawer from bottom */
        <Drawer open={isOpen} onOpenChange={setIsOpen}>
          <DrawerContent className="h-[85vh] px-4 pb-4">
            <DrawerHeader className="px-0 pb-0">
              <DrawerTitle className="text-base">Consultor Financeiro</DrawerTitle>
            </DrawerHeader>
            <div className="flex-1 overflow-hidden mt-2">
              {chatContent}
            </div>
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
        <div className="p-1.5 rounded-lg bg-primary/10 shrink-0">
          <Bot className="h-4 w-4 text-primary" />
        </div>
      )}
      <div
        className={`rounded-lg p-3 text-sm max-w-[85%] whitespace-pre-wrap ${
          isUser
            ? "bg-primary text-primary-foreground ml-auto"
            : "bg-muted"
        }`}
      >
        {message.content}
      </div>
    </div>
  );
};
