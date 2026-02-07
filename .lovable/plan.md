
## Plano: IA Consultor Financeiro + Melhorias em Parcelamentos e Emprestimos

### Visao Geral

Duas frentes de trabalho:
1. **Consultor Financeiro com IA** - Chat integrado ao app que analisa seus dados financeiros em tempo real
2. **Melhorias em Parcelamentos e Emprestimos** - CRUD completo, pagamento simplificado e integracao com categorias/orcamento

---

## PARTE 1: Consultor Financeiro com IA

### Arquitetura

O app ja roda em Lovable Cloud, que fornece acesso ao Lovable AI (modelos Gemini) sem necessidade de chave de API. A implementacao sera:

1. **Edge Function** (`supabase/functions/financial-advisor/index.ts`) - Recebe os dados financeiros do usuario e envia para a Lovable AI com um system prompt especializado em consultoria financeira
2. **Interface de Chat** - Widget flutuante acessivel de qualquer pagina, com streaming de respostas em tempo real

### Edge Function - financial-advisor

- Endpoint que recebe `messages` (historico do chat) + `financialContext` (dados do usuario)
- System prompt em portugues com especialidade em financas pessoais brasileiras
- Modelo: `google/gemini-3-flash-preview` (rapido e eficiente)
- Streaming SSE para respostas em tempo real
- Tratamento de erros 429 (rate limit) e 402 (creditos)

### System Prompt do Consultor

O prompt incluira instrucoes para:
- Analisar padroes de gastos e identificar oportunidades de economia
- Sugerir estrategias de quitacao de dividas (avalanche vs bola de neve)
- Avaliar momento ideal para compras da lista de desejos
- Orientar sobre alocacao de orcamento baseado nas areas configuradas
- Responder em portugues com valores em R$
- Ser didatico e acessivel, evitando jargoes financeiros complexos

### Dados Financeiros como Contexto

O frontend coletara e enviara ao backend:
- Resumo mensal (receita, despesa, saldo)
- Compromissos ativos (parcelas + emprestimos)
- Orcamento configurado (areas e porcentagens)
- Metas financeiras ativas
- Lista de desejos pendentes
- Top categorias de gasto

### Interface do Chat

- **Widget flutuante** no canto inferior direito com icone de bot
- **Painel deslizante** que abre sobre o conteudo
- **Sugestoes rapidas** pre-definidas: "Como reduzir meus gastos?", "Devo antecipar parcelas?", "Quando posso comprar X?"
- **Streaming de resposta** token por token
- **Historico** mantido durante a sessao (em memoria, sem persistencia)

### Arquivos a Criar

| Arquivo | Descricao |
|---------|-----------|
| `supabase/functions/financial-advisor/index.ts` | Edge function com Lovable AI |
| `src/components/ai/FinancialAdvisorChat.tsx` | Componente principal do chat |
| `src/components/ai/ChatMessage.tsx` | Renderizacao de mensagens |
| `src/components/ai/QuickSuggestions.tsx` | Botoes de sugestoes rapidas |
| `src/hooks/useFinancialAdvisor.ts` | Hook para streaming e estado do chat |

### Arquivos a Modificar

| Arquivo | Modificacao |
|---------|-------------|
| `src/App.tsx` | Adicionar widget flutuante do chat |
| `supabase/config.toml` | Registrar a nova edge function |

---

## PARTE 2: Melhorias em Parcelamentos e Emprestimos

### 2.1 - Adicionar Categorias e Subcategorias aos Emprestimos

**Migracao SQL:**
- Adicionar coluna `category_id` (uuid, FK para categories, nullable) na tabela `loans`
- Adicionar coluna `subcategory` (text, nullable) na tabela `loans`

**Impacto no codigo:**
- `src/hooks/useLoans.ts` - Incluir category_id e subcategory no CRUD
- `src/pages/Loans.tsx` - Adicionar seletores de categoria/subcategoria no formulario de criacao/edicao
- `src/hooks/useCommitments.ts` - Carregar nome da categoria para emprestimos (igual ja faz para parcelamentos)
- **Orcamento**: Os emprestimos com categoria passam a aparecer automaticamente no modulo de Orcamento, pois as transacoes de pagamento ja sao criadas com a categoria correta

### 2.2 - Pagamento Simplificado (sem exigir fonte)

Atualmente, `PayCommitmentDialog` e os hooks de pagamento sempre exigem `bankId`. Precisamos:

**Para Parcelamentos:**
- Criar nova mutation `markInstallmentsPaid` no `useInstallments` que apenas marca as parcelas como pagas (movendo a data para hoje) sem criar transacao de debito
- O usuario escolhe: "Registrar pagamento" (com banco) ou "Apenas marcar como pago" (sem banco)

**Para Emprestimos:**
- Modificar `payLoanInstallment` para aceitar `bankId` como verdadeiramente opcional
- Se `bankId` nao for fornecido: marca como pago, atualiza `total_paid`, mas NAO cria transacao
- Se `bankId` for fornecido: comportamento atual (marca + cria transacao)

**Mudancas na UI:**
- `PayCommitmentDialog` - Campo banco se torna opcional com checkbox "Registrar transacao financeira"
- Quando desmarcado, esconde o seletor de banco
- Botao muda para "Marcar como Pago" vs "Confirmar Pagamento"

### 2.3 - CRUD Completo

**Emprestimos (ja tem parcial):**
- Adicionar dialog de edicao completo (nome, descricao, banco, categoria, subcategoria, status)
- Adicionar confirmacao antes de excluir
- Permitir editar parcelas individuais (valor, data vencimento)

**Parcelamentos:**
- Adicionar botao "Novo Parcelamento" na pagina Installments e Compromissos (hoje so e possivel via Transacoes)
- Reutilizar o `AddTransactionDialog` ja existente com `isInstallment` pre-selecionado
- Adicionar opcao de editar descricao, categoria e subcategoria de um grupo de parcelamento

---

### Resumo de Arquivos

**Criar:**
| Arquivo | Descricao |
|---------|-----------|
| `supabase/functions/financial-advisor/index.ts` | Edge function do consultor IA |
| `src/components/ai/FinancialAdvisorChat.tsx` | Widget de chat com streaming |
| `src/components/ai/ChatMessage.tsx` | Componente de mensagem |
| `src/components/ai/QuickSuggestions.tsx` | Sugestoes rapidas |
| `src/hooks/useFinancialAdvisor.ts` | Hook de streaming |

**Modificar:**
| Arquivo | Modificacao |
|---------|-------------|
| `src/App.tsx` | Incluir widget flutuante do chat |
| `src/hooks/useLoans.ts` | Adicionar category_id/subcategory no CRUD |
| `src/hooks/useInstallments.ts` | Adicionar mutation `markInstallmentsPaid` |
| `src/hooks/useCommitments.ts` | Resolver categoryName para emprestimos |
| `src/pages/Loans.tsx` | Seletores de categoria, dialog de edicao completo |
| `src/pages/Installments.tsx` | Botao "Novo Parcelamento" |
| `src/pages/Compromissos.tsx` | Botao "Novo Parcelamento", opcao de pagamento simplificado |
| `src/components/compromissos/PayCommitmentDialog.tsx` | Banco opcional, checkbox "Registrar transacao" |
| `src/types/finance.ts` | Adicionar categoryId/subcategory ao tipo Loan |
| `src/lib/validations.ts` | Atualizar loanSchema com category_id/subcategory |

**Migracao SQL:**
- Adicionar `category_id` e `subcategory` a tabela `loans`

---

### Fluxo de Pagamento Simplificado

```text
Usuario clica "Pagar" no compromisso
            |
     Dialog abre
            |
    Seleciona quantas parcelas
            |
   [x] Registrar transacao financeira?
     |                    |
    SIM                  NAO
     |                    |
  Seleciona           Botao: "Marcar
  banco + data        como Pago"
     |                    |
  Cria transacao      Apenas marca
  de debito           parcelas como
  no banco            pagas no sistema
```

### Ordem de Implementacao

1. Migracao SQL (category_id + subcategory em loans)
2. Edge function do consultor financeiro
3. Modificacoes nos hooks (useLoans, useInstallments, useCommitments)
4. Componentes do chat IA
5. Modificacoes nas paginas (Loans, Installments, Compromissos)
6. Pagamento simplificado (PayCommitmentDialog)
7. CRUD completo (editar emprestimos, novo parcelamento)
8. Integrar widget do chat no App.tsx
