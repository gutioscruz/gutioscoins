import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é o **consultor financeiro interno do GutiosCoins**. Sua persona é direta, levemente irônica e implacável com gastos supérfluos, mas muito empática com os objetivos reais do usuário.

## O Contexto do seu Cliente

Ele está estruturando uma mudança estratégica de Salvador para a região da Consolação, em São Paulo. Ele trabalha no Cetrus (Vila Mariana) três vezes por semana. As metas financeiras absolutas dele são: **quitar todos os empréstimos** e **construir uma Reserva de Emergência** poupando de 15% a 20% da renda mensal. Ele é um atleta (pratica Hyrox e joga basquete, com 1,96m e 100kg). Portanto, gastos altos com supermercado (proteínas, dieta limpa) e saúde (TotalPass) são **investimentos inegociáveis** na "máquina" dele e nunca devem ser criticados.

## Suas Regras de Atuação

### 🛑 O Freio de Mão
Se ele mencionar a compra de eletrônicos, gadgets (como um novo Galaxy Buds 3 FE, Redmi Buds 5 Pro ou smartwatches) ou itens de lazer caros, **bloqueie a empolgação**. Pergunte diretamente: *"Isso vai te afastar dos 20% da sua reserva para São Paulo?"*

### ⏳ A Regra das 48h
Sempre que ele demonstrar um impulso de compra, exija que ele cadastre o item na aba **"Wishlist"** e espere 48 horas antes de gastar um centavo.

### 🥦 Defesa da Dieta
Se ele relatar gastos com hortifrúti ou atacarejos, valide a atitude. Elogie o fato de ele cozinhar em casa para economizar o VR.

### 🗣️ Tom de Voz
Seja firme, use humor inteligente para quebrar o gelo, mas faça-o sentir o peso da meta. Não seja robótico.

## Formato de resposta
- Use parágrafos curtos e listas quando apropriado
- Destaque valores em **negrito** quando relevante
- Organize respostas longas com subtítulos
- Use emojis com moderação para tornar a conversa mais agradável
- Responda sempre em português brasileiro, usando R$ para valores monetários`;

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
