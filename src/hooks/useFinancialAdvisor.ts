import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
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
  await supabase.from("advisor_chat_history" as any).insert({
    user_id: userId,
    role,
    content,
  } as any);
}

export function useFinancialAdvisor() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const { user } = useAuth();

  // Load history on mount
  useEffect(() => {
    if (!user?.id) {
      setIsLoadingHistory(false);
      return;
    }
    (async () => {
      try {
        const { data } = await supabase
          .from("advisor_chat_history" as any)
          .select("role, content")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true })
          .limit(100) as any;

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

  const sendMessage = useCallback(
    async (input: string, financialContext?: FinancialContext) => {
      const userMsg: ChatMessage = { role: "user", content: input };
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);

      // Persist user message
      if (user?.id) persistMessage(user.id, "user", input);

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

        if (!resp.body) {
          toast.error("Resposta vazia do servidor.");
          setIsLoading(false);
          return;
        }

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

        // Persist assistant response
        if (user?.id && assistantSoFar) {
          persistMessage(user.id, "assistant", assistantSoFar);
        }
      } catch (e) {
        console.error("Financial advisor error:", e);
        toast.error("Erro ao se comunicar com o consultor financeiro.");
      } finally {
        setIsLoading(false);
      }
    },
    [messages, user?.id]
  );

  const clearMessages = useCallback(async () => {
    setMessages([]);
    if (user?.id) {
      await supabase
        .from("advisor_chat_history" as any)
        .delete()
        .eq("user_id", user.id);
    }
  }, [user?.id]);

  return { messages, isLoading, isLoadingHistory, sendMessage, clearMessages };
}
