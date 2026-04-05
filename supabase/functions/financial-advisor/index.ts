import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é o **Wealth Manager** pessoal do usuário no GutiosCoins — um gestor de patrimônio de elite, sofisticado e com raciocínio matemático afiado.

## Tom e Estilo

Fale de forma fluida, elegante e direta. Nada de listas mecânicas ou relatórios burocráticos. Converse como um consultor financeiro premium conversaria com seu cliente de confiança — natural, perspicaz, com pitadas de humor quando apropriado.

## Capacidades

Você tem acesso direto ao sistema para:
- **Transações**: Registrar, editar e remover receitas/despesas
- **Patrimônio**: Ajustar saldos bancários, gerir investimentos
- **Compromissos**: Criar/editar empréstimos (Price Table), parcelas
- **Leitura**: Consultar resumo financeiro completo

## Contexto Estratégico (use com sutileza)

O cliente está em transição para São Paulo e é atleta de alta performance (100kg, basquete/Hyrox). Gastos com alimentação de qualidade e saúde são investimentos na performance — valide-os naturalmente sem mencionar isso a cada interação. Meta de salário: ~R$ 6.800.

## 🔒 REGRA DE OURO: Human-in-the-Loop

Quando o cliente pedir uma alteração, proponha elegantemente — por exemplo:
*"Perfeito. Posso registar esse salário na sua Inter para atualizarmos o fluxo de Abril?"*

Ao propor uma ação que modifica dados, use a ferramenta adequada. O sistema interceptará e mostrará um card de confirmação. Você NUNCA executa sem aprovação.

## 🧠 Mapeamento Técnico de IDs

**CRÍTICO**: No contexto financeiro você recebe um objeto \`dataMap\` com os dados reais do usuário (banks, categories, loans) incluindo seus UUIDs. Ao chamar ferramentas de CRUD, use ESTRITAMENTE os UUIDs desse mapeamento. NUNCA invente IDs ou use nomes como identificadores.

Exemplo: Se o usuário diz "coloca na Inter", procure no dataMap.banks o objeto com name contendo "Inter" e use o UUID dele como bank_id.

## Inteligência Financeira

- Quando há saldo sobrando e dívidas ativas, sugira amortizações — calcule a economia de juros
- Use Tabela Price nos cálculos de empréstimos
- Apresente números concretos, não generalidades
- Para compras impulsivas > R$150: sugira a Wishlist e a regra das 48h

## Operações em Lote (Bulk Actions)
Quando o usuário pedir para consertar problemas de fatura (ex: "transferir transações do banco Inter para a fatura do cartão Inter"), informe EXPLICITAMENTE os filtros que serão utilizados antes da aprovação do card.
As ferramentas suportam "bulk_link_card" (mover para cartão de crédito) e "bulk_delete" (apagar em lote). Use sempre "source_bank_id" identificando o banco dono da transação original e forneça um range de datas ("start_date", "end_date") para limitar o estrago e proteger a integridade dos demais meses. Respeite OBRIGATORIAMENTE os UUIDs que vêm no 'dataMap'. Filtrar datas limita a query de update!

## Formato

- Parágrafos curtos, markdown com moderação
- Valores em **negrito**
- Emojis com parcimônia
- Sempre em PT-BR, usando R$`;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "get_financial_summary",
      description: "Busca o resumo financeiro completo: contas, investimentos, empréstimos e transações recentes.",
      parameters: { type: "object", properties: {}, required: [], additionalProperties: false },
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
          bank_id: { type: "string", description: "UUID da conta (obrigatório para update/delete)" },
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
          investment_id: { type: "string", description: "UUID do investimento (obrigatório para update/delete)" },
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
      description: "Gerencia empréstimos (Consignado CLT, Fatura Parcelada, Pessoal). Usa Tabela Price.",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["create", "update"] },
          loan_id: { type: "string", description: "UUID do empréstimo (obrigatório para update)" },
          name: { type: "string" },
          description: { type: "string" },
          principal: { type: "number" },
          interest_rate: { type: "number", description: "Taxa mensal em %" },
          installments: { type: "integer" },
          payment_frequency: { type: "string", enum: ["monthly", "biweekly", "weekly"] },
          start_date: { type: "string", description: "ISO date" },
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
      description: "Gerencia compras parceladas: adicionar ou editar.",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["add", "update"] },
          transaction_id: { type: "string", description: "UUID da transação pai (para update)" },
          description: { type: "string" },
          total_amount: { type: "number" },
          installment_count: { type: "integer" },
          bank_id: { type: "string" },
          card_id: { type: "string" },
          category_id: { type: "string" },
          subcategory: { type: "string" },
          start_date: { type: "string", description: "ISO date da primeira parcela" },
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
      description: "Gerencia transações avulsas: adicionar, atualizar ou remover receitas/despesas E ações em lote (bulk_link_card e bulk_delete).",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["add", "update", "delete", "bulk_link_card", "bulk_delete"] },
          transaction_id: { type: "string", description: "UUID da transação (para update/delete único)" },
          description: { type: "string" },
          amount: { type: "number" },
          type: { type: "string", enum: ["income", "expense"] },
          date: { type: "string", description: "ISO date" },
          bank_id: { type: "string" },
          card_id: { type: "string", description: "Opcional. Se 'action' for 'bulk_link_card', usar target_card_id ao invés de card_id." },
          target_card_id: { type: "string", description: "Para bulk_link_card: UUID do cartão destino" },
          source_bank_id: { type: "string", description: "Para bulk_link_card/bulk_delete: UUID da conta bancária de origem cujas transações serão alteradas" },
          start_date: { type: "string", description: "Para bulk_link_card/bulk_delete: ISO date do início do filtro (ex: 2026-03-01)" },
          end_date: { type: "string", description: "Para bulk_link_card/bulk_delete: ISO date final do filtro (ex: 2026-03-31)" },
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
    const { messages, financialContext, dataMap, toolResults } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      throw new Error("Serviço de IA não configurado");
    }

    // Build context injection
    let contextBlock = "";

    // Inject dataMap (real UUIDs for CRUD)
    if (dataMap) {
      contextBlock += `\n\n--- MAPEAMENTO DE DADOS (dataMap) ---\n${JSON.stringify(dataMap, null, 2)}\n--- FIM dataMap ---`;
    }

    // Inject financial summary
    if (financialContext) {
      const parts: string[] = [];
      if (financialContext.monthlyIncome !== undefined)
        parts.push(`Receita mensal: R$ ${financialContext.monthlyIncome.toFixed(2)}`);
      if (financialContext.monthlyExpenses !== undefined)
        parts.push(`Despesas mensais: R$ ${financialContext.monthlyExpenses.toFixed(2)}`);
      if (financialContext.balance !== undefined)
        parts.push(`Saldo mensal: R$ ${financialContext.balance.toFixed(2)}`);
      if (financialContext.totalCommitments !== undefined)
        parts.push(`Compromissos ativos: ${financialContext.commitmentsCount || 0} (restante: R$ ${financialContext.totalCommitments.toFixed(2)})`);
      if (financialContext.thisMonthCommitments !== undefined)
        parts.push(`Compromissos este mês: R$ ${financialContext.thisMonthCommitments.toFixed(2)}`);
      if (financialContext.budgetAreas?.length > 0)
        parts.push(`Áreas orçamento: ${financialContext.budgetAreas.map((a: any) => `${a.name} (${a.percentage}%)`).join(", ")}`);
      if (financialContext.topExpenseCategories?.length > 0)
        parts.push(`Top gastos: ${financialContext.topExpenseCategories.map((c: any) => `${c.name}: R$ ${c.amount.toFixed(2)}`).join(", ")}`);
      if (financialContext.activeGoals?.length > 0)
        parts.push(`Metas: ${financialContext.activeGoals.map((g: any) => `${g.name} (R$ ${g.current.toFixed(2)}/${g.target.toFixed(2)})`).join(", ")}`);
      if (financialContext.wishlistItems?.length > 0)
        parts.push(`Wishlist: ${financialContext.wishlistItems.map((w: any) => `${w.name}: R$ ${w.price.toFixed(2)}`).join(", ")}`);
      if (parts.length > 0)
        contextBlock += `\n\n--- RESUMO FINANCEIRO ---\n${parts.join("\n")}\n--- FIM RESUMO ---`;
    }

    const aiMessages: any[] = [
      { role: "system", content: SYSTEM_PROMPT + contextBlock },
      ...messages,
    ];

    if (toolResults && toolResults.length > 0) {
      for (const tr of toolResults) {
        aiMessages.push({
          role: "tool",
          tool_call_id: tr.tool_call_id,
          content: JSON.stringify(tr.result),
        });
      }
    }

    console.log("AI request — tools:", TOOLS.length, "dataMap:", dataMap ? "yes" : "no");

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
          JSON.stringify({ error: "Muitas requisições. Aguarde um momento." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Erro no serviço de IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Buffer stream to detect tool_calls vs text
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
        } catch { /* partial JSON */ }
      }
    }

    if (hasToolCalls && toolCalls.length > 0) {
      const parsedCalls = toolCalls.map((tc) => {
        let args = {};
        try { args = JSON.parse(tc.function.arguments); } catch { /* */ }
        return { id: tc.id, toolName: tc.function.name, arguments: args };
      });

      console.log("Tool calls:", parsedCalls.map(c => c.toolName));

      return new Response(
        JSON.stringify({ type: "tool_call", planText: collectedContent || "", calls: parsedCalls }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Text response — re-stream
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
