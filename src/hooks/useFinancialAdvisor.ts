import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { addMonths } from "date-fns";

export interface ChatMessage {
  role: "user" | "assistant" | "tool";
  content: string;
  tool_calls?: any[];
  tool_call_id?: string;
  name?: string;
}

export interface PendingToolCall {
  id: string;
  toolName: string;
  arguments: Record<string, any>;
  planText: string;
}

export interface ChatSession {
  id: string;
  title: string;
  created_at: string;
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

export interface DataMap {
  banks: Array<{ id: string; name: string; type: string; balance: number | null }>;
  categories: Array<{ id: string; name: string; type: string }>;
  loans: Array<{ id: string; name: string; status: string; principal: number }>;
  investments: Array<{ id: string; name: string; type: string; amount: number }>;
  cards: Array<{ id: string; name: string; bank_id: string }>;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/financial-advisor`;

async function persistMessage(userId: string, role: string, content: string, sessionId?: string) {
  await supabase.from("advisor_chat_history").insert({
    user_id: userId,
    role,
    content,
    session_id: sessionId || null,
  } as any);
}

export function useFinancialAdvisor() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [pendingAction, setPendingAction] = useState<PendingToolCall | null>(null);
  const [lastFinancialContext, setLastFinancialContext] = useState<FinancialContext | undefined>();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Load sessions
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await supabase
        .from("chat_sessions")
        .select("id, title, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (data && data.length > 0) {
        setSessions(data);
        setActiveSessionId(data[0].id);
      }
    })();
  }, [user?.id]);

  // Load messages for active session
  useEffect(() => {
    if (!user?.id) {
      setIsLoadingHistory(false);
      return;
    }
    setIsLoadingHistory(true);
    (async () => {
      try {
        let query = supabase
          .from("advisor_chat_history")
          .select("role, content")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true })
          .limit(100);

        if (activeSessionId) {
          query = query.eq("session_id", activeSessionId);
        } else {
          query = query.is("session_id", null);
        }

        const { data } = await query;
        if (data && data.length > 0) {
          setMessages(data.map((d: any) => ({ role: d.role, content: d.content })));
        } else {
          setMessages([]);
        }
      } catch (e) {
        console.error("Failed to load chat history:", e);
      } finally {
        setIsLoadingHistory(false);
      }
    })();
  }, [user?.id, activeSessionId]);

  const createSession = useCallback(async (title?: string) => {
    if (!user?.id) return null;
    const { data, error } = await supabase
      .from("chat_sessions")
      .insert({ user_id: user.id, title: title || "Nova conversa" } as any)
      .select("id, title, created_at")
      .single();
    if (data && !error) {
      setSessions((prev) => [data, ...prev]);
      setActiveSessionId(data.id);
      setMessages([]);
      setPendingAction(null);
      return data.id as string;
    }
    return null;
  }, [user?.id]);

  const switchSession = useCallback((sessionId: string) => {
    setActiveSessionId(sessionId);
    setPendingAction(null);
  }, []);

  const deleteSession = useCallback(async (sessionId: string) => {
    if (!user?.id) return;
    await supabase.from("chat_sessions").delete().eq("id", sessionId).eq("user_id", user.id);
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    if (activeSessionId === sessionId) {
      setActiveSessionId(null);
      setMessages([]);
    }
  }, [user?.id, activeSessionId]);

  const updateSessionTitle = useCallback(async (sessionId: string, title: string) => {
    await supabase.from("chat_sessions").update({ title } as any).eq("id", sessionId);
    setSessions((prev) => prev.map((s) => s.id === sessionId ? { ...s, title } : s));
  }, []);

  const handleStreamResponse = useCallback(
    async (resp: Response) => {
      if (!resp.body) { toast.error("Resposta vazia."); return ""; }

      let assistantSoFar = "";
      const upsertAssistant = (chunk: string) => {
        assistantSoFar += chunk;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
          }
          return [...prev, { role: "assistant", content: assistantSoFar }];
        });
      };

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, idx);
          textBuffer = textBuffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") return assistantSoFar;
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
      for (let raw of textBuffer.split("\n")) {
        if (!raw) continue;
        if (raw.endsWith("\r")) raw = raw.slice(0, -1);
        if (!raw.startsWith("data: ")) continue;
        const jsonStr = raw.slice(6).trim();
        if (jsonStr === "[DONE]") continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) upsertAssistant(content);
        } catch { /* ignore */ }
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

  const executeSearchTransactions = useCallback(async (args: any) => {
    if (!user?.id) return { error: "Not authenticated" };
    let query = supabase.from("transactions").select("id, description, amount, type, category_id, bank_id, card_id, date, is_installment, installment_number, installment_count").eq("user_id", user.id).order("date", { ascending: false }).limit(200);

    if (args.start_date) query = query.gte("date", args.start_date);
    if (args.end_date) query = query.lte("date", args.end_date);
    if (args.bank_id) query = query.eq("bank_id", args.bank_id);
    if (args.card_id_is_null) query = query.is("card_id", null);
    if (args.query) query = query.ilike("description", `%${args.query}%`);

    const { data, error } = await query;
    if (error) return { error: error.message };
    return { transactions: data || [] };
  }, [user?.id]);

  const sendMessage = useCallback(
    async (input: string, financialContext?: FinancialContext, dataMap?: DataMap) => {
      const userMsg: ChatMessage = { role: "user", content: input };
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);
      setLastFinancialContext(financialContext);

      // Auto-create session if none
      let sessionId = activeSessionId;
      if (!sessionId && user?.id) {
        const title = input.length > 40 ? input.slice(0, 40) + "…" : input;
        sessionId = await createSession(title);
      }

      if (user?.id) persistMessage(user.id, "user", input, sessionId || undefined);

      try {
        const allMessages = [...messages, userMsg];
        const resp = await fetch(CHAT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ messages: allMessages, financialContext, dataMap }),
        });

        if (!resp.ok) {
          const errorData = await resp.json().catch(() => null);
          const errorMsg = errorData?.error || (resp.status === 429 ? "Muitas requisições." : resp.status === 402 ? "Créditos insuficientes." : "Erro ao conectar.");
          toast.error(errorMsg);
          setIsLoading(false);
          return;
        }

        const contentType = resp.headers.get("content-type") || "";

        if (contentType.includes("application/json")) {
          const data = await resp.json();

          if (data.type === "tool_call" && data.calls?.length > 0) {
            if (data.planText) {
              const planMsg: ChatMessage = { role: "assistant", content: data.planText };
              setMessages((prev) => [...prev, planMsg]);
              if (user?.id) persistMessage(user.id, "assistant", data.planText, sessionId || undefined);
            }

            const call = data.calls[0];

            // Auto-approve read-only tools
            if (call.toolName === "get_financial_summary" || call.toolName === "search_transactions") {
              let toolResult;
              if (call.toolName === "get_financial_summary") {
                toolResult = await executeGetFinancialSummary();
              } else {
                toolResult = await executeSearchTransactions(call.arguments);
              }

              const assistantMsg: ChatMessage = { 
                role: "assistant", 
                content: data.planText || "",
                tool_calls: data.calls.map((c: any) => ({
                  id: c.id,
                  type: "function",
                  function: { name: c.toolName, arguments: JSON.stringify(c.arguments) }
                }))
              };

              const toolMsg: ChatMessage = {
                role: "tool",
                content: JSON.stringify(toolResult),
                tool_call_id: call.id,
                name: call.toolName
              };

              setMessages((prev) => [...prev, assistantMsg, toolMsg]);

              if (user?.id && data.planText) {
                persistMessage(user.id, "assistant", data.planText, sessionId || undefined);
              }

              const followUpMessages = [
                ...allMessages,
                assistantMsg
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
                  dataMap,
                  toolResults: [{ tool_call_id: call.id, result: toolResult }],
                }),
              });

              if (followUpResp.ok) {
                const ct = followUpResp.headers.get("content-type") || "";
                if (ct.includes("text/event-stream")) {
                  const content = await handleStreamResponse(followUpResp);
                  if (user?.id && content) persistMessage(user.id, "assistant", content, sessionId || undefined);
                }
              }
              setIsLoading(false);
              return;
            }

            setPendingAction({ id: call.id, toolName: call.toolName, arguments: call.arguments, planText: data.planText || "" });
            setIsLoading(false);
            return;
          }
        }

        // Streaming text
        const assistantContent = await handleStreamResponse(resp);
        if (user?.id && assistantContent) persistMessage(user.id, "assistant", assistantContent, sessionId || undefined);
      } catch (e) {
        console.error("Financial advisor error:", e);
        toast.error("Erro ao se comunicar com o consultor.");
      } finally {
        setIsLoading(false);
      }
    },
    [messages, user?.id, activeSessionId, handleStreamResponse, executeGetFinancialSummary, executeSearchTransactions, createSession]
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
              user_id: user.id, name: args.name || "Conta", type: args.type || "checking",
              balance: args.balance ?? 0, limit_amount: args.limit_amount ?? null, color: args.color || "#3B82F6",
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
              user_id: user.id, name: args.name || "Investimento", type: args.type || "other",
              amount: args.amount ?? 0, profitability: args.profitability ?? null, color: args.color || "#10B981",
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
              user_id: user.id, name: args.name || "Empréstimo", description: args.description || "",
              principal, interest_rate: args.interest_rate || 0, installments: n,
              payment_frequency: args.payment_frequency || "monthly", start_date: args.start_date || new Date().toISOString(),
              loan_type: args.loan_type || "pessoal", bank_id: args.bank_id || null,
              category_id: args.category_id || null, subcategory: args.subcategory || null,
              status: "active", total_interest: totalInterest, total_paid: 0,
            }).select().single();

            if (loan && !error) {
              let balance = principal;
              const payments = [];
              const startDate = new Date(args.start_date || new Date());
              for (let i = 1; i <= n; i++) {
                const interest = balance * rate;
                const principalPart = pmt - interest;
                balance -= principalPart;
                payments.push({
                  loan_id: loan.id, installment_number: i, due_date: addMonths(startDate, i).toISOString(),
                  amount: Math.round(pmt * 100) / 100, principal: Math.round(principalPart * 100) / 100,
                  interest: Math.round(interest * 100) / 100, paid: false,
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

            const { data: parent, error: parentErr } = await supabase.from("transactions").insert({
              user_id: user.id, description: args.description || "Compra parcelada", amount: perInstallment,
              type: "expense", category_id: args.category_id || "", subcategory: args.subcategory || null,
              bank_id: args.bank_id || "", card_id: args.card_id || null, date: startDate.toISOString(),
              is_installment: true, installment_count: count, installment_number: 1,
            }).select().single();

            if (parent && !parentErr) {
              const children = [];
              for (let i = 2; i <= count; i++) {
                children.push({
                  user_id: user.id, description: args.description || "Compra parcelada", amount: perInstallment,
                  type: "expense" as const, category_id: args.category_id || "", subcategory: args.subcategory || null,
                  bank_id: args.bank_id || "", card_id: args.card_id || null,
                  date: addMonths(startDate, i - 1).toISOString(), is_installment: true,
                  installment_count: count, installment_number: i, parent_transaction_id: parent.id,
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
              user_id: user.id, description: args.description || "Transação", amount: args.amount || 0,
              type: args.type || "expense", category_id: args.category_id || "", subcategory: args.subcategory || null,
              bank_id: args.bank_id || "", card_id: args.card_id || null,
              date: args.date || new Date().toISOString(), is_installment: false,
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
          } else if (args.action === "bulk_link_card" && args.source_bank_id && args.target_card_id) {
            let query = supabase.from("transactions")
              .update({ card_id: args.target_card_id })
              .eq("user_id", user.id)
              .eq("bank_id", args.source_bank_id)
              .is("card_id", null)
              .eq("type", "expense");
            if (args.start_date) query = query.gte("date", args.start_date);
            if (args.end_date) query = query.lte("date", args.end_date);
            
            const { error } = await query;
            if (error) result = { success: false, error: error.message };
            else result = { success: true, message: `Despesas vinculadas com segurança.` };
          } else if (args.action === "bulk_delete" && args.source_bank_id) {
            let query = supabase.from("transactions")
              .delete()
              .eq("user_id", user.id)
              .eq("bank_id", args.source_bank_id);
            if (args.start_date) query = query.gte("date", args.start_date);
            if (args.end_date) query = query.lte("date", args.end_date);
            
            const { error } = await query;
            if (error) result = { success: false, error: error.message };
            else result = { success: true, message: `Despesas do filtro excluídas.` };
          }
          queryClient.invalidateQueries({ queryKey: ["transactions"] });
          break;
        }
      }

      const confirmText = result.success ? "✅ Feito!" : `❌ ${result.error || "Falha ao executar."}`;
      setMessages((prev) => [...prev, { role: "assistant", content: confirmText }]);
      if (user?.id) persistMessage(user.id, "assistant", confirmText, activeSessionId || undefined);

      // Get AI summary
      if (result.success) {
        try {
          const summaryResp = await fetch(CHAT_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
            body: JSON.stringify({
              messages: [
                ...messages,
                { role: "assistant", content: pendingAction.planText },
                { role: "assistant", content: confirmText },
                { role: "user", content: `Ação "${pendingAction.toolName}" executada. Resultado: ${JSON.stringify(result)}. Resuma brevemente.` },
              ],
              financialContext: lastFinancialContext,
            }),
          });

          if (summaryResp.ok) {
            const ct = summaryResp.headers.get("content-type") || "";
            if (ct.includes("text/event-stream")) {
              const content = await handleStreamResponse(summaryResp);
              if (user?.id && content) persistMessage(user.id, "assistant", content, activeSessionId || undefined);
            }
          }
        } catch (e) {
          console.error("Summary error:", e);
        }
      }

      toast.success(result.success ? "Ação executada!" : "Erro na execução.");
    } catch (e) {
      console.error("Approve error:", e);
      toast.error("Erro ao executar.");
    } finally {
      setPendingAction(null);
      setIsLoading(false);
    }
  }, [pendingAction, user?.id, queryClient, messages, lastFinancialContext, handleStreamResponse, activeSessionId]);

  const cancelAction = useCallback(() => {
    if (!pendingAction) return;
    setMessages((prev) => [...prev, { role: "assistant", content: "Sem problemas, ação cancelada." }]);
    if (user?.id) persistMessage(user.id, "assistant", "Sem problemas, ação cancelada.", activeSessionId || undefined);
    setPendingAction(null);
  }, [pendingAction, user?.id, activeSessionId]);

  const clearMessages = useCallback(async () => {
    setMessages([]);
    setPendingAction(null);
    if (user?.id && activeSessionId) {
      await supabase.from("advisor_chat_history").delete().eq("user_id", user.id).eq("session_id", activeSessionId);
    } else if (user?.id) {
      await supabase.from("advisor_chat_history").delete().eq("user_id", user.id).is("session_id", null);
    }
  }, [user?.id, activeSessionId]);

  return {
    messages, isLoading, isLoadingHistory, pendingAction,
    sessions, activeSessionId,
    sendMessage, clearMessages, approveAction, cancelAction,
    createSession, switchSession, deleteSession, updateSessionTitle,
  };
}
