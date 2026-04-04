import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { addMonths, format } from "date-fns";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface PendingToolCall {
  id: string;
  toolName: string;
  arguments: Record<string, any>;
  planText: string;
}

interface FinancialContext {
  monthlyIncome?: number;
  monthlyExpenses?: number;
  balance?: number;
  totalCommitments?: number;
  commitmentsCount?: number;
  thisMonthCommitments?: number;
  budgetAreas?: Array<{ name: string; percentage: number }>;
  topExpenseCategories?: Array<{ name: string; amount: number }>;
  activeGoals?: Array<{ name: string; current: number; target: number }>;
  wishlistItems?: Array<{ name: string; price: number }>;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/financial-advisor`;

async function persistMessage(userId: string, role: string, content: string) {
  await supabase.from("advisor_chat_history").insert({
    user_id: userId,
    role,
    content,
  });
}

export function useFinancialAdvisor() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [pendingAction, setPendingAction] = useState<PendingToolCall | null>(null);
  const [lastFinancialContext, setLastFinancialContext] = useState<FinancialContext | undefined>();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Load history on mount
  useEffect(() => {
    if (!user?.id) {
      setIsLoadingHistory(false);
      return;
    }
    (async () => {
      try {
        const { data } = await supabase
          .from("advisor_chat_history")
          .select("role, content")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true })
          .limit(100);

        if (data && data.length > 0) {
          setMessages(data.map((d: any) => ({ role: d.role, content: d.content })));
        }
      } catch (e) {
        console.error("Failed to load chat history:", e);
      } finally {
        setIsLoadingHistory(false);
      }
    })();
  }, [user?.id]);

  const handleStreamResponse = useCallback(
    async (resp: Response, allMessages: ChatMessage[]) => {
      if (!resp.body) {
        toast.error("Resposta vazia do servidor.");
        return "";
      }

      let assistantSoFar = "";
      const upsertAssistant = (nextChunk: string) => {
        assistantSoFar += nextChunk;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) =>
              i === prev.length - 1 ? { ...m, content: assistantSoFar } : m
            );
          }
          return [...prev, { role: "assistant", content: assistantSoFar }];
        });
      };

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { streamDone = true; break; }
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content);
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content);
          } catch { /* ignore */ }
        }
      }

      return assistantSoFar;
    },
    []
  );

  const executeGetFinancialSummary = useCallback(async () => {
    if (!user?.id) return { error: "Not authenticated" };

    const [banksRes, investmentsRes, loansRes, transactionsRes] = await Promise.all([
      supabase.from("banks").select("id, name, type, balance, limit_amount, color").eq("user_id", user.id),
      supabase.from("investments").select("id, name, type, amount, profitability, color").eq("user_id", user.id),
      supabase.from("loans").select("id, name, principal, interest_rate, installments, status, loan_type, total_paid, total_interest, bank_id").eq("user_id", user.id).eq("status", "active"),
      supabase.from("transactions").select("id, description, amount, type, category_id, bank_id, date, is_installment, installment_count, installment_number").eq("user_id", user.id).order("date", { ascending: false }).limit(50),
    ]);

    return {
      banks: banksRes.data || [],
      investments: investmentsRes.data || [],
      activeLoans: loansRes.data || [],
      recentTransactions: transactionsRes.data || [],
    };
  }, [user?.id]);

  const sendMessage = useCallback(
    async (input: string, financialContext?: FinancialContext) => {
      const userMsg: ChatMessage = { role: "user", content: input };
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);
      setLastFinancialContext(financialContext);

      if (user?.id) persistMessage(user.id, "user", input);

      try {
        const allMessages = [...messages, userMsg];
        const resp = await fetch(CHAT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ messages: allMessages, financialContext }),
        });

        if (!resp.ok) {
          const errorData = await resp.json().catch(() => null);
          const errorMsg =
            errorData?.error ||
            (resp.status === 429
              ? "Muitas requisições. Tente novamente em instantes."
              : resp.status === 402
                ? "Créditos insuficientes."
                : "Erro ao conectar com o consultor.");
          toast.error(errorMsg);
          setIsLoading(false);
          return;
        }

        const contentType = resp.headers.get("content-type") || "";

        // Check if it's a tool_call JSON response
        if (contentType.includes("application/json")) {
          const data = await resp.json();

          if (data.type === "tool_call" && data.calls?.length > 0) {
            // Add plan text as assistant message
            if (data.planText) {
              const planMsg: ChatMessage = { role: "assistant", content: data.planText };
              setMessages((prev) => [...prev, planMsg]);
              if (user?.id) persistMessage(user.id, "assistant", data.planText);
            }

            const call = data.calls[0]; // Handle first tool call

            // Auto-approve read-only tools
            if (call.toolName === "get_financial_summary") {
              setIsLoading(true);
              const summaryResult = await executeGetFinancialSummary();

              // Send result back to AI
              const followUpMessages = [
                ...allMessages,
                ...(data.planText ? [{ role: "assistant" as const, content: data.planText }] : []),
              ];

              const followUpResp = await fetch(CHAT_URL, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
                },
                body: JSON.stringify({
                  messages: followUpMessages,
                  financialContext,
                  toolResults: [{ tool_call_id: call.id, result: summaryResult }],
                }),
              });

              if (followUpResp.ok) {
                const followUpContentType = followUpResp.headers.get("content-type") || "";
                if (followUpContentType.includes("text/event-stream")) {
                  const assistantContent = await handleStreamResponse(followUpResp, followUpMessages);
                  if (user?.id && assistantContent) {
                    persistMessage(user.id, "assistant", assistantContent);
                  }
                }
              }
              setIsLoading(false);
              return;
            }

            // For mutating tools, set pending action for user approval
            setPendingAction({
              id: call.id,
              toolName: call.toolName,
              arguments: call.arguments,
              planText: data.planText || "",
            });
            setIsLoading(false);
            return;
          }
        }

        // Regular streaming text response
        const assistantContent = await handleStreamResponse(resp, allMessages);
        if (user?.id && assistantContent) {
          persistMessage(user.id, "assistant", assistantContent);
        }
      } catch (e) {
        console.error("Financial advisor error:", e);
        toast.error("Erro ao se comunicar com o consultor financeiro.");
      } finally {
        setIsLoading(false);
      }
    },
    [messages, user?.id, handleStreamResponse, executeGetFinancialSummary]
  );

  const approveAction = useCallback(async () => {
    if (!pendingAction || !user?.id) return;
    setIsLoading(true);

    try {
      let result: any = { success: false };
      const args = pendingAction.arguments;

      switch (pendingAction.toolName) {
        case "manage_bank_account": {
          if (args.action === "add") {
            const { data, error } = await supabase.from("banks").insert({
              user_id: user.id,
              name: args.name || "Conta",
              type: args.type || "checking",
              balance: args.balance ?? 0,
              limit_amount: args.limit_amount ?? null,
              color: args.color || "#3B82F6",
            }).select().single();
            result = error ? { success: false, error: error.message } : { success: true, bank: data };
          } else if (args.action === "update" && args.bank_id) {
            const updates: any = {};
            if (args.name !== undefined) updates.name = args.name;
            if (args.balance !== undefined) updates.balance = args.balance;
            if (args.limit_amount !== undefined) updates.limit_amount = args.limit_amount;
            if (args.type !== undefined) updates.type = args.type;
            const { error } = await supabase.from("banks").update(updates).eq("id", args.bank_id).eq("user_id", user.id);
            result = error ? { success: false, error: error.message } : { success: true };
          } else if (args.action === "delete" && args.bank_id) {
            const { error } = await supabase.from("banks").delete().eq("id", args.bank_id).eq("user_id", user.id);
            result = error ? { success: false, error: error.message } : { success: true };
          }
          queryClient.invalidateQueries({ queryKey: ["banks"] });
          break;
        }

        case "manage_investment": {
          if (args.action === "add") {
            const { data, error } = await supabase.from("investments").insert({
              user_id: user.id,
              name: args.name || "Investimento",
              type: args.type || "other",
              amount: args.amount ?? 0,
              profitability: args.profitability ?? null,
              color: args.color || "#10B981",
            }).select().single();
            result = error ? { success: false, error: error.message } : { success: true, investment: data };
          } else if (args.action === "update" && args.investment_id) {
            const updates: any = {};
            if (args.name !== undefined) updates.name = args.name;
            if (args.amount !== undefined) updates.amount = args.amount;
            if (args.profitability !== undefined) updates.profitability = args.profitability;
            if (args.type !== undefined) updates.type = args.type;
            const { error } = await supabase.from("investments").update(updates).eq("id", args.investment_id).eq("user_id", user.id);
            result = error ? { success: false, error: error.message } : { success: true };
          } else if (args.action === "delete" && args.investment_id) {
            const { error } = await supabase.from("investments").delete().eq("id", args.investment_id).eq("user_id", user.id);
            result = error ? { success: false, error: error.message } : { success: true };
          }
          queryClient.invalidateQueries({ queryKey: ["investments"] });
          break;
        }

        case "manage_loan": {
          if (args.action === "create") {
            const principal = args.principal || 0;
            const rate = (args.interest_rate || 0) / 100;
            const n = args.installments || 12;
            const pmt = rate > 0 ? principal * (rate * Math.pow(1 + rate, n)) / (Math.pow(1 + rate, n) - 1) : principal / n;
            const totalInterest = pmt * n - principal;

            const { data: loan, error } = await supabase.from("loans").insert({
              user_id: user.id,
              name: args.name || "Empréstimo",
              description: args.description || "",
              principal,
              interest_rate: args.interest_rate || 0,
              installments: n,
              payment_frequency: args.payment_frequency || "monthly",
              start_date: args.start_date || new Date().toISOString(),
              loan_type: args.loan_type || "pessoal",
              bank_id: args.bank_id || null,
              category_id: args.category_id || null,
              subcategory: args.subcategory || null,
              status: "active",
              total_interest: totalInterest,
              total_paid: 0,
            }).select().single();

            if (loan && !error) {
              // Generate Price Table payments
              let balance = principal;
              const payments = [];
              const startDate = new Date(args.start_date || new Date());

              for (let i = 1; i <= n; i++) {
                const interest = balance * rate;
                const principalPart = pmt - interest;
                balance -= principalPart;
                const dueDate = addMonths(startDate, i);

                payments.push({
                  loan_id: loan.id,
                  installment_number: i,
                  due_date: dueDate.toISOString(),
                  amount: Math.round(pmt * 100) / 100,
                  principal: Math.round(principalPart * 100) / 100,
                  interest: Math.round(interest * 100) / 100,
                  paid: false,
                });
              }

              await supabase.from("loan_payments").insert(payments);
              result = { success: true, loan, paymentsCreated: payments.length };
            } else {
              result = { success: false, error: error?.message };
            }
          } else if (args.action === "update" && args.loan_id) {
            const updates: any = {};
            if (args.name !== undefined) updates.name = args.name;
            if (args.status !== undefined) updates.status = args.status;
            if (args.description !== undefined) updates.description = args.description;
            const { error } = await supabase.from("loans").update(updates).eq("id", args.loan_id).eq("user_id", user.id);
            result = error ? { success: false, error: error.message } : { success: true };
          }
          queryClient.invalidateQueries({ queryKey: ["loans"] });
          queryClient.invalidateQueries({ queryKey: ["loan-payments"] });
          break;
        }

        case "manage_installment": {
          if (args.action === "add") {
            const count = args.installment_count || 2;
            const totalAmount = args.total_amount || 0;
            const perInstallment = Math.round((totalAmount / count) * 100) / 100;
            const startDate = new Date(args.start_date || new Date());

            // Create parent transaction
            const { data: parent, error: parentErr } = await supabase.from("transactions").insert({
              user_id: user.id,
              description: args.description || "Compra parcelada",
              amount: perInstallment,
              type: "expense",
              category_id: args.category_id || "",
              subcategory: args.subcategory || null,
              bank_id: args.bank_id || "",
              card_id: args.card_id || null,
              date: startDate.toISOString(),
              is_installment: true,
              installment_count: count,
              installment_number: 1,
            }).select().single();

            if (parent && !parentErr) {
              // Create child installments
              const children = [];
              for (let i = 2; i <= count; i++) {
                children.push({
                  user_id: user.id,
                  description: args.description || "Compra parcelada",
                  amount: perInstallment,
                  type: "expense" as const,
                  category_id: args.category_id || "",
                  subcategory: args.subcategory || null,
                  bank_id: args.bank_id || "",
                  card_id: args.card_id || null,
                  date: addMonths(startDate, i - 1).toISOString(),
                  is_installment: true,
                  installment_count: count,
                  installment_number: i,
                  parent_transaction_id: parent.id,
                });
              }
              if (children.length > 0) await supabase.from("transactions").insert(children);
              result = { success: true, parentId: parent.id, installments: count };
            } else {
              result = { success: false, error: parentErr?.message };
            }
          }
          queryClient.invalidateQueries({ queryKey: ["transactions"] });
          break;
        }

        case "manage_transaction": {
          if (args.action === "add") {
            const { data, error } = await supabase.from("transactions").insert({
              user_id: user.id,
              description: args.description || "Transação",
              amount: args.amount || 0,
              type: args.type || "expense",
              category_id: args.category_id || "",
              subcategory: args.subcategory || null,
              bank_id: args.bank_id || "",
              card_id: args.card_id || null,
              date: args.date || new Date().toISOString(),
              is_installment: false,
            }).select().single();
            result = error ? { success: false, error: error.message } : { success: true, transaction: data };
          } else if (args.action === "update" && args.transaction_id) {
            const updates: any = {};
            if (args.description !== undefined) updates.description = args.description;
            if (args.amount !== undefined) updates.amount = args.amount;
            if (args.type !== undefined) updates.type = args.type;
            if (args.date !== undefined) updates.date = args.date;
            if (args.category_id !== undefined) updates.category_id = args.category_id;
            if (args.subcategory !== undefined) updates.subcategory = args.subcategory;
            if (args.bank_id !== undefined) updates.bank_id = args.bank_id;
            if (args.card_id !== undefined) updates.card_id = args.card_id;
            const { error } = await supabase.from("transactions").update(updates).eq("id", args.transaction_id).eq("user_id", user.id);
            result = error ? { success: false, error: error.message } : { success: true };
          } else if (args.action === "delete" && args.transaction_id) {
            const { error } = await supabase.from("transactions").delete().eq("id", args.transaction_id).eq("user_id", user.id);
            result = error ? { success: false, error: error.message } : { success: true };
          }
          queryClient.invalidateQueries({ queryKey: ["transactions"] });
          break;
        }
      }

      // Add confirmation message
      const confirmText = result.success
        ? "✅ Ação executada com sucesso!"
        : `❌ Erro: ${result.error || "Falha ao executar ação."}`;

      setMessages((prev) => [...prev, { role: "assistant", content: confirmText }]);
      if (user?.id) persistMessage(user.id, "assistant", confirmText);

      // Send result back to AI for summary
      if (result.success) {
        try {
          const currentMessages = [...messages, { role: "assistant" as const, content: pendingAction.planText }, { role: "assistant" as const, content: confirmText }];
          const summaryResp = await fetch(CHAT_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({
              messages: [
                ...currentMessages,
                { role: "user", content: `A ação "${pendingAction.toolName}" foi executada com sucesso. Resultado: ${JSON.stringify(result)}. Dê um breve resumo do que foi feito e sugira próximos passos.` },
              ],
              financialContext: lastFinancialContext,
            }),
          });

          if (summaryResp.ok) {
            const ct = summaryResp.headers.get("content-type") || "";
            if (ct.includes("text/event-stream")) {
              const summaryContent = await handleStreamResponse(summaryResp, currentMessages);
              if (user?.id && summaryContent) persistMessage(user.id, "assistant", summaryContent);
            }
          }
        } catch (e) {
          console.error("Error getting summary:", e);
        }
      }

      toast.success(result.success ? "Ação aprovada e executada!" : "Erro ao executar ação.");
    } catch (e) {
      console.error("Approve action error:", e);
      toast.error("Erro ao executar a ação.");
    } finally {
      setPendingAction(null);
      setIsLoading(false);
    }
  }, [pendingAction, user?.id, queryClient, messages, lastFinancialContext, handleStreamResponse]);

  const cancelAction = useCallback(() => {
    if (!pendingAction) return;
    setMessages((prev) => [...prev, { role: "assistant", content: "❌ Ação cancelada pelo usuário." }]);
    if (user?.id) persistMessage(user.id, "assistant", "❌ Ação cancelada pelo usuário.");
    setPendingAction(null);
  }, [pendingAction, user?.id]);

  const clearMessages = useCallback(async () => {
    setMessages([]);
    setPendingAction(null);
    if (user?.id) {
      await supabase
        .from("advisor_chat_history")
        .delete()
        .eq("user_id", user.id);
    }
  }, [user?.id]);

  return { messages, isLoading, isLoadingHistory, pendingAction, sendMessage, clearMessages, approveAction, cancelAction };
}
