import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é o **Consultor Financeiro Pessoal**, um assistente inteligente especializado em finanças pessoais brasileiras. Seu papel é analisar os dados financeiros do usuário e fornecer orientações práticas e personalizadas.

## Diretrizes

### Tom e Estilo
- Seja amigável, didático e acessível
- Evite jargões financeiros complexos; quando necessário, explique-os
- Responda em português brasileiro, usando R$ para valores monetários
- Seja objetivo e direto, sem rodeios
- Use emojis com moderação para tornar a conversa mais agradável

### Capacidades
- Analisar padrões de gastos e identificar oportunidades de economia
- Sugerir estratégias de quitação de dívidas (avalanche vs bola de neve)
- Avaliar momento ideal para compras da lista de desejos
- Orientar sobre alocação de orçamento baseado nas áreas configuradas
- Comparar receitas vs despesas e dar alertas quando necessário
- Sugerir metas financeiras realistas baseadas no perfil do usuário

### Restrições
- NUNCA sugira investimentos específicos (ações, fundos, etc.)
- NUNCA forneça consultoria tributária ou fiscal
- Sempre reforce que você é uma ferramenta de apoio, não substitui um profissional
- Base suas análises apenas nos dados fornecidos pelo usuário

### Formato de resposta
- Use parágrafos curtos e listas quando apropriado
- Destaque valores em negrito quando relevante
- Organize respostas longas com subtítulos`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, financialContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      throw new Error("Serviço de IA não configurado");
    }

    // Build context message from financial data
    let contextMessage = "";
    if (financialContext) {
      const parts: string[] = [];

      if (financialContext.monthlyIncome !== undefined) {
        parts.push(`💰 Receita mensal: R$ ${financialContext.monthlyIncome.toFixed(2)}`);
      }
      if (financialContext.monthlyExpenses !== undefined) {
        parts.push(`💸 Despesas mensais: R$ ${financialContext.monthlyExpenses.toFixed(2)}`);
      }
      if (financialContext.balance !== undefined) {
        parts.push(`📊 Saldo mensal: R$ ${financialContext.balance.toFixed(2)}`);
      }
      if (financialContext.totalCommitments !== undefined) {
        parts.push(`📋 Compromissos ativos: ${financialContext.commitmentsCount || 0} (total restante: R$ ${financialContext.totalCommitments.toFixed(2)})`);
      }
      if (financialContext.thisMonthCommitments !== undefined) {
        parts.push(`📅 Compromissos este mês: R$ ${financialContext.thisMonthCommitments.toFixed(2)}`);
      }
      if (financialContext.budgetAreas && financialContext.budgetAreas.length > 0) {
        parts.push(`🎯 Áreas do orçamento: ${financialContext.budgetAreas.map((a: any) => `${a.name} (${a.percentage}%)`).join(", ")}`);
      }
      if (financialContext.topExpenseCategories && financialContext.topExpenseCategories.length > 0) {
        parts.push(`🔥 Top categorias de gasto: ${financialContext.topExpenseCategories.map((c: any) => `${c.name}: R$ ${c.amount.toFixed(2)}`).join(", ")}`);
      }
      if (financialContext.activeGoals && financialContext.activeGoals.length > 0) {
        parts.push(`🎯 Metas ativas: ${financialContext.activeGoals.map((g: any) => `${g.name} (R$ ${g.current.toFixed(2)} / R$ ${g.target.toFixed(2)})`).join(", ")}`);
      }
      if (financialContext.wishlistItems && financialContext.wishlistItems.length > 0) {
        parts.push(`🛒 Lista de desejos: ${financialContext.wishlistItems.map((w: any) => `${w.name}: R$ ${w.price.toFixed(2)}`).join(", ")}`);
      }

      if (parts.length > 0) {
        contextMessage = `\n\n--- DADOS FINANCEIROS DO USUÁRIO ---\n${parts.join("\n")}\n--- FIM DOS DADOS ---`;
      }
    }

    console.log("Sending request to Lovable AI with context:", contextMessage ? "yes" : "no");

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content: SYSTEM_PROMPT + contextMessage,
            },
            ...messages,
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({
            error: "Muitas requisições. Aguarde um momento e tente novamente.",
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({
            error: "Créditos insuficientes. Adicione créditos ao seu workspace.",
          }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({ error: "Erro no serviço de IA" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Streaming response from AI gateway");

    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
      },
    });
  } catch (e) {
    console.error("financial-advisor error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Erro desconhecido",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
