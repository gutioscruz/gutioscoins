

# Plano: Agente Autônomo com CRUD Completo (incluindo Transações)

## Visao Geral

Transformar o consultor financeiro em um agente autônomo com tool-calling capaz de ler e modificar dados de **Patrimonio** (Contas/Investimentos), **Compromissos** (Emprestimos/Parcelas) e **Transacoes** — sempre com confirmacao explicita do usuario (Human-in-the-Loop).

---

## Arquitetura

```text
Usuario digita mensagem
        |
        v
Edge Function (financial-advisor)
  - System Prompt "Arquiteto Financeiro"
  - tools[] com 6 ferramentas
  - Retorna texto (streaming) OU tool_call (JSON)
        |
        v
useFinancialAdvisor.ts
  - Detecta tool_call na resposta
  - Seta pendingAction (pausa execucao)
  - Se read-only (get_financial_summary): auto-aprova
        |
        v
FinancialAdvisorChat.tsx
  - Renderiza PendingActionCard dinamico
  - Icones contextuais por modulo
  - Botoes Aprovar / Cancelar
        |
  [Aprovar] -> Executa CRUD via Supabase client
            -> Invalida queries TanStack
            -> Envia resultado de volta ao AI
```

---

## 6 Ferramentas (Tools)

| Tool | Acao | Tabela |
|------|------|--------|
| `get_financial_summary` | Leitura completa (auto-aprovada) | banks, investments, loans, transactions |
| `manage_bank_account` | add / update / delete | banks |
| `manage_investment` | add / update / delete | investments |
| `manage_loan` | create / update (incl. Consignado CLT) | loans, loan_payments |
| `manage_installment` | add / edit parcelas | transactions (is_installment=true) |
| `manage_transaction` | add / update / delete transacoes | transactions |

### Tool `manage_transaction` — Detalhes

Parametros:
- `action`: "add" | "update" | "delete"
- `transaction_id` (para update/delete)
- `description`, `amount`, `type` ("income"/"expense"), `date`
- `bank_id`, `category_id`, `subcategory` (opcional)
- `card_id` (opcional, para despesas em cartao)

Exemplos de uso pelo AI:
- "Vou registrar essa despesa de R$ 85 no Supermercado para voce"
- "Vou corrigir o valor dessa transacao de R$ 100 para R$ 120"
- "Vou remover essa transacao duplicada"

---

## Etapas de Implementacao

### 1. Edge Function — Tools + Prompt Atualizado

**Arquivo:** `supabase/functions/financial-advisor/index.ts`

- Adicionar array `tools` com 6 definicoes (JSON Schema para cada ferramenta)
- `manage_transaction` com schema: action (enum), transaction_id, description, amount, type, date, bank_id, category_id, subcategory, card_id
- Atualizar system prompt para persona "Arquiteto Financeiro" com regra: "NUNCA execute sem apresentar plano com O QUE, COMO e QUAL IMPACTO"
- Detectar `finish_reason: "tool_calls"` na resposta do AI gateway
- Se tool_call: retornar JSON `{type: "tool_call", calls: [...]}` (nao streaming)
- Se texto: retornar streaming (comportamento atual)

### 2. Hook — Deteccao e Execucao de Tool Calls

**Arquivo:** `src/hooks/useFinancialAdvisor.ts`

- Novo tipo `PendingToolCall { toolName, arguments, planText }`
- Novo state `pendingAction: PendingToolCall | null`
- No `sendMessage`: detectar resposta JSON com `type: "tool_call"` vs SSE streaming
- Para tool_calls: extrair plan text + argumentos, setar `pendingAction`
- `get_financial_summary`: auto-aprovar (read-only), buscar dados e enviar como tool response
- `approveAction()`:
  - `manage_bank_account` → `supabase.from('banks').insert/update/delete`
  - `manage_investment` → `supabase.from('investments').insert/update/delete`
  - `manage_loan` → `supabase.from('loans').insert/update/delete` + gerar loan_payments
  - `manage_installment` → `supabase.from('transactions').insert/update` com campos de parcela
  - `manage_transaction` → `supabase.from('transactions').insert/update/delete`
- Apos execucao: invalidar queries TanStack (`banks`, `investments`, `loans`, `installments`, `transactions`)
- Enviar resultado de volta ao AI para resumo final
- `cancelAction()`: limpar pendingAction, notificar AI

### 3. UI — Card de Acao Pendente Dinamico

**Arquivo:** `src/components/ai/FinancialAdvisorChat.tsx`

- Componente `PendingActionCard` com rendering condicional:
  - **Patrimonio** (bank/investment): icones Landmark/TrendingUp, valores atuais vs propostos
  - **Compromissos** (loan/installment): icones Receipt/CreditCard, barra de progresso da divida
  - **Transacoes** (transaction): icone ArrowUpDown/Wallet, descricao, valor, banco/categoria
- Estilo glassmorphism: `rounded-3xl bg-card/40 backdrop-blur-md border border-purple-500/20 p-4`
- Botoes "Aprovar" (verde) e "Cancelar" (muted)
- Exibe o `planText` do AI como explicacao acima dos botoes

### 4. System Prompt Completo

Regras chave no prompt:
- Autoridade sobre transacoes, saldos, investimentos, emprestimos e parcelas
- Obrigatorio: texto explicativo antes de qualquer tool_call (O QUE / COMO / IMPACTO)
- Contexto do atleta (dieta = prioridade, nunca criticar)
- Transicao SP (R$ 6.800 meta)
- Sugerir amortizacoes inteligentes quando houver saldo sobrando
- Regra das 48h para compras impulsivas
- NUNCA executar sem aprovacao

---

## Arquivos Modificados

| Arquivo | Acao |
|---|---|
| `supabase/functions/financial-advisor/index.ts` | Reescrever: tools[], dual response mode, prompt arquiteto |
| `src/hooks/useFinancialAdvisor.ts` | Expandir: deteccao tool_call, approve/cancel, CRUD para 6 ferramentas |
| `src/components/ai/FinancialAdvisorChat.tsx` | Adicionar: PendingActionCard dinamico com contexto visual por modulo |

## Sem Alteracoes de Banco

Nenhuma migration necessaria — todas as operacoes usam tabelas existentes (`banks`, `investments`, `loans`, `loan_payments`, `transactions`).

