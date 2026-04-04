import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é o **Arquiteto Financeiro Pessoal** do usuário no app GutiosCoins. Seu tom é altamente profissional, empático, polido e matemático. Você domina fórmulas financeiras (Tabela Price, juros compostos, TIR).

## Autoridade e Capacidades

Você tem autoridade para:
- **Transações**: Registrar, editar e remover receitas e despesas
- **Patrimônio**: Ajustar saldos de contas bancárias, registrar/atualizar investimentos
- **Compromissos**: Criar e gerenciar empréstimos (incluindo Consignado CLT), adicionar parcelas
- **Leitura**: Consultar o resumo financeiro completo para embasar suas análises

## Perfil do Cliente

- Preparando **mudança estratégica de Salvador para São Paulo (Consolação)**, trabalho híbrido no Cetrus (Vila Mariana), 3x/semana.
- **Atleta** de basquete e Hyrox, 1,96m e 100kg. Gastos com supermercado (proteínas, dieta limpa) e saúde (TotalPass) são **investimentos inegociáveis** na performance — NUNCA critique esses gastos.
- Meta principal: **zerar empréstimos** e **poupar 15-20%** do salário (~R$ 6.800 brutos).

## Regras de Atuação

### 🔒 REGRA ABSOLUTA: Planejamento Obrigatório
ANTES de qualquer tool_call, você DEVE obrigatoriamente gerar um texto explicando:
1. **O QUE** você identificou (situação atual)
2. **COMO** pretende alterar o sistema (ação específica)
3. **QUAL O IMPACTO** (efeito no saldo, limite, dívida, etc.)

NUNCA execute uma ferramenta sem antes apresentar esse plano textual. O usuário precisa aprovar clicando no botão antes da ação ser executada.

### 📊 Análise Matemática
Sempre apresente impacto com números concretos. Mostre projeções e custos de oportunidade.

### 🛑 Controle de Impulso
Para compras de eletrônicos/gadgets/lazer caros, apresente o custo de oportunidade com dados. Sugira a Wishlist e a regra das 48h.

### 🥦 Defesa da Dieta
Valide gastos com hortifrúti, atacarejos, suplementos. Elogie o fato de cozinhar em casa.

### 💡 Amortização Inteligente
Ao lidar com Compromissos, SEMPRE sugira amortizações inteligentes se houver saldo sobrando. Calcule a economia de juros.

### 🔄 Sincronização de Patrimônio
Ao lidar com contas bancárias, mantenha os saldos sempre sincronizados com o que o usuário relata.

## Formato de Resposta
- Parágrafos curtos, listas quando apropriado
- Destaque valores em **negrito**
- Subtítulos com ## para respostas longas
- Emojis com moderação
- Sempre em português brasileiro, usando R$
- Mostre fórmulas/raciocínio brevemente nos cálculos`;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "get_financial_summary",
      description: "Busca o resumo financeiro completo do usuário: contas bancárias, investimentos, empréstimos ativos e transações recentes. Use para embasar análises.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "manage_bank_account",
      description: "Gerencia contas bancárias: adicionar, atualizar saldo/limite ou remover.",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["add", "update", "delete"] },
          bank_id: { type: "string", description: "ID da conta (obrigatório para update/delete)" },
          name: { type: "string" },
          type: { type: "string", enum: ["checking", "savings", "credit"] },
          balance: { type: "number" },
          limit_amount: { type: "number" },
          color: { type: "string" },
        },
        required: ["action"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "manage_investment",
      description: "Gerencia investimentos: adicionar, atualizar ou remover.",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["add", "update", "delete"] },
          investment_id: { type: "string", description: "ID do investimento (obrigatório para update/delete)" },
          name: { type: "string" },
          type: { type: "string", enum: ["stocks", "funds", "crypto", "fixed-income", "other"] },
          amount: { type: "number" },
          profitability: { type: "number" },
          color: { type: "string" },
        },
        required: ["action"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "manage_loan",
      description: "Gerencia empréstimos: criar ou atualizar (incluindo Consignado CLT, Fatura Parcelada, Pessoal). Usa Tabela Price para amortização.",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["create", "update"] },
          loan_id: { type: "string", description: "ID do empréstimo (obrigatório para update)" },
          name: { type: "string" },
          description: { type: "string" },
          principal: { type: "number" },
          interest_rate: { type: "number", description: "Taxa de juros mensal em %" },
          installments: { type: "integer" },
          payment_frequency: { type: "string", enum: ["monthly", "biweekly", "weekly"] },
          start_date: { type: "string", description: "Data de início ISO" },
          loan_type: { type: "string", enum: ["consignado", "fatura_parcelada", "pessoal"] },
          bank_id: { type: "string" },
          category_id: { type: "string" },
          subcategory: { type: "string" },
          status: { type: "string", enum: ["active", "paid", "overdue"] },
        },
        required: ["action"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "manage_installment",
      description: "Gerencia compras parceladas: adicionar ou editar transações parceladas.",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["add", "update"] },
          transaction_id: { type: "string", description: "ID da transação pai (para update)" },
          description: { type: "string" },
          total_amount: { type: "number", description: "Valor total da compra" },
          installment_count: { type: "integer", description: "Número de parcelas" },
          bank_id: { type: "string" },
          card_id: { type: "string" },
          category_id: { type: "string" },
          subcategory: { type: "string" },
          start_date: { type: "string", description: "Data da primeira parcela ISO" },
        },
        required: ["action"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "manage_transaction",
      description: "Gerencia transações avulsas: adicionar, atualizar ou remover receitas e despesas.",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["add", "update", "delete"] },
          transaction_id: { type: "string", description: "ID da transação (obrigatório para update/delete)" },
          description: { type: "string" },
          amount: { type: "number" },
          type: { type: "string", enum: ["income", "expense"] },
          date: { type: "string", description: "Data ISO" },
          bank_id: { type: "string" },
          card_id: { type: "string" },
          category_id: { type: "string" },
          subcategory: { type: "string" },
        },
        required: ["action"],
        additionalProperties: false,
      },
    },
  },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, financialContext, toolResults } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      throw new Error("Serviço de IA não configurado");
    }

    let contextMessage = "";
    if (financialContext) {
      const parts: string[] = [];
      if (financialContext.monthlyIncome !== undefined)
        parts.push(`💰 Receita mensal: R$ ${financialContext.monthlyIncome.toFixed(2)}`);
      if (financialContext.monthlyExpenses !== undefined)
        parts.push(`💸 Despesas mensais: R$ ${financialContext.monthlyExpenses.toFixed(2)}`);
      if (financialContext.balance !== undefined)
        parts.push(`📊 Saldo mensal: R$ ${financialContext.balance.toFixed(2)}`);
      if (financialContext.totalCommitments !== undefined)
        parts.push(`📋 Compromissos ativos: ${financialContext.commitmentsCount || 0} (total restante: R$ ${financialContext.totalCommitments.toFixed(2)})`);
      if (financialContext.thisMonthCommitments !== undefined)
        parts.push(`📅 Compromissos este mês: R$ ${financialContext.thisMonthCommitments.toFixed(2)}`);
      if (financialContext.budgetAreas?.length > 0)
        parts.push(`🎯 Áreas do orçamento: ${financialContext.budgetAreas.map((a: any) => `${a.name} (${a.percentage}%)`).join(", ")}`);
      if (financialContext.topExpenseCategories?.length > 0)
        parts.push(`🔥 Top categorias de gasto: ${financialContext.topExpenseCategories.map((c: any) => `${c.name}: R$ ${c.amount.toFixed(2)}`).join(", ")}`);
      if (financialContext.activeGoals?.length > 0)
        parts.push(`🎯 Metas ativas: ${financialContext.activeGoals.map((g: any) => `${g.name} (R$ ${g.current.toFixed(2)} / R$ ${g.target.toFixed(2)})`).join(", ")}`);
      if (financialContext.wishlistItems?.length > 0)
        parts.push(`🛒 Lista de desejos: ${financialContext.wishlistItems.map((w: any) => `${w.name}: R$ ${w.price.toFixed(2)}`).join(", ")}`);
      if (parts.length > 0)
        contextMessage = `\n\n--- DADOS FINANCEIROS ATUAIS DO CLIENTE ---\n${parts.join("\n")}\n--- FIM DOS DADOS ---`;
    }

    // Build the messages array for the AI
    const aiMessages: any[] = [
      { role: "system", content: SYSTEM_PROMPT + contextMessage },
      ...messages,
    ];

    // If we have tool results, append them
    if (toolResults && toolResults.length > 0) {
      for (const tr of toolResults) {
        aiMessages.push({
          role: "tool",
          tool_call_id: tr.tool_call_id,
          content: JSON.stringify(tr.result),
        });
      }
    }

    console.log("Sending request to Lovable AI with tools:", TOOLS.length, "context:", contextMessage ? "yes" : "no");

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
          messages: aiMessages,
          tools: TOOLS,
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

    // We need to check if the response contains tool_calls.
    // Since we're streaming, we need to collect the full response and detect tool_calls.
    // We'll buffer the stream and check for tool_calls in the final message.
    
    // Strategy: Read the stream, collect tool_call deltas. If we detect tool_calls,
    // return a JSON response. Otherwise, re-stream the text content.
    
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let collectedContent = "";
    let toolCalls: any[] = [];
    let hasToolCalls = false;
    const allChunks: string[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
        let line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") continue;

        allChunks.push(line + "\n");

        try {
          const parsed = JSON.parse(jsonStr);
          const choice = parsed.choices?.[0];
          
          if (choice?.delta?.content) {
            collectedContent += choice.delta.content;
          }
          
          if (choice?.delta?.tool_calls) {
            hasToolCalls = true;
            for (const tc of choice.delta.tool_calls) {
              const idx = tc.index ?? 0;
              if (!toolCalls[idx]) {
                toolCalls[idx] = { id: tc.id || "", function: { name: "", arguments: "" } };
              }
              if (tc.id) toolCalls[idx].id = tc.id;
              if (tc.function?.name) toolCalls[idx].function.name += tc.function.name;
              if (tc.function?.arguments) toolCalls[idx].function.arguments += tc.function.arguments;
            }
          }
          
          if (choice?.finish_reason === "tool_calls") {
            hasToolCalls = true;
          }
        } catch { /* partial JSON, skip */ }
      }
    }

    if (hasToolCalls && toolCalls.length > 0) {
      // Parse the tool call arguments
      const parsedCalls = toolCalls.map((tc) => {
        let args = {};
        try { args = JSON.parse(tc.function.arguments); } catch { /* empty */ }
        return {
          id: tc.id,
          toolName: tc.function.name,
          arguments: args,
        };
      });

      console.log("Tool calls detected:", parsedCalls.map(c => c.toolName));

      return new Response(
        JSON.stringify({
          type: "tool_call",
          planText: collectedContent || "",
          calls: parsedCalls,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // No tool calls — return as SSE stream (reconstruct from collected chunks)
    const body = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        for (const chunk of allChunks) {
          controller.enqueue(encoder.encode(chunk));
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    return new Response(body, {
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
