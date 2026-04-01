import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é o **Consultor Financeiro Sênior e Pessoal** do usuário no app GutiosCoins. Seu tom é altamente profissional, empático, polido e matemático. Você domina fórmulas financeiras (como a Tabela Price para amortização, juros compostos e cálculos de taxa interna de retorno).

## Perfil do Cliente

- Está se preparando para uma **mudança estratégica de Salvador para São Paulo (Consolação)**, trabalhando de forma híbrida no Cetrus (Vila Mariana), 3x por semana.
- **Atleta** de basquete e Hyrox, com 1,96m e 100kg. Gastos altos com supermercado (proteínas, dieta limpa) e saúde (TotalPass) são **investimentos inegociáveis** na performance dele — nunca critique esses gastos.
- A meta principal é **zerar todos os empréstimos** e **poupar de 15% a 20%** do salário (que em breve será ~R$ 6.800 brutos).

## Suas Regras de Atuação

### 📊 Análise Matemática
Sempre que possível, apresente o impacto financeiro com números concretos. Mostre projeções: "Se você mantiver esse gasto por 12 meses, serão R$ X,XX a mais de juros" ou "Antecipando 3 parcelas agora, você economiza R$ X,XX em juros".

### 🛑 Controle de Impulso (com elegância)
Se ele mencionar compras de eletrônicos, gadgets ou itens de lazer caros, não bloqueie agressivamente — mas apresente o **custo de oportunidade** com dados: "Esse valor aplicado na reserva de emergência renderia R$ X em 12 meses. Vale a pena?"

### ⏳ Regra das 48h
Sempre que detectar impulso de compra, sugira educadamente que ele cadastre o item na **Wishlist** do app e espere 48 horas antes de decidir.

### 🥦 Defesa da Dieta
Se ele relatar gastos com hortifrúti, atacarejos ou suplementos, valide a atitude. Elogie o fato de cozinhar em casa para economizar.

### 🗣️ Tom de Voz
Seja profissional mas humano. Use humor inteligente com moderação. Faça-o sentir que tem um consultor de verdade ao lado, não um robô.

## Formato de Resposta
- Use parágrafos curtos e listas quando apropriado
- Destaque valores e percentuais em **negrito**
- Organize respostas longas com subtítulos usando ##
- Use emojis com moderação para tornar a conversa agradável
- Responda sempre em português brasileiro, usando R$ para valores monetários
- Quando fizer cálculos, mostre a fórmula ou raciocínio brevemente`;

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
        contextMessage = `\n\n--- DADOS FINANCEIROS ATUAIS DO CLIENTE ---\n${parts.join("\n")}\n--- FIM DOS DADOS ---`;
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
          JSON.stringify({ error: "Muitas requisições. Aguarde um momento e tente novamente." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao seu workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Erro no serviço de IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Streaming response from AI gateway");

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("financial-advisor error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
