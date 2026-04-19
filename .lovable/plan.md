

## Análise

O `QuickEntryDialog` atual tem 3 problemas:
1. **Não suporta cartão** — não há coluna para selecionar `cardId`. Quando o usuário registra uma despesa em cartão de crédito, o sistema não associa, então o saldo do cartão não é debitado e a fatura não é gerada.
2. **Mobile inviável** — usa `grid-cols-[100px_90px_1fr_100px_140px_140px_40px]` (≈710px fixos), o que estoura horizontalmente em telas <768px. Não há layout alternativo.
3. **Bulk insert ignora `card_id`** — `addBulkSimpleTransactions` no `useTransactions.ts` não aceita nem grava o campo `card_id`.

## Plano de Refatoração

### 1. `useTransactions.ts` — suportar `cardId` no bulk
- Adicionar campo opcional `cardId?: string` ao tipo de input de `addBulkSimpleTransactions`.
- Incluir `card_id: t.cardId ?? null` no payload do `insert`. Os triggers SQL existentes já sincronizam `cards.used_amount` e `card_statements` automaticamente.

### 2. `QuickEntryDialog.tsx` — refatoração completa

**Modelo de dados**
- Adicionar `cardId: string` ao `QuickEntryRow`.
- Aceitar `banks: Bank[]` (já vem com `cards`) — reaproveitar para extrair lista de cartões por banco.

**Lógica de seleção banco/cartão**
- Quando o usuário seleciona um banco, abrir um campo "Cartão (opcional)" mostrando apenas os cartões daquele banco. Se o banco não tem cartões, o campo fica desabilitado.
- Tipo "Receita" → cartão automaticamente limpo e desabilitado (faz sentido apenas para despesas).
- Ao trocar tipo/banco, resetar `cardId`.

**Layout responsivo (dual-mode)**

Detectar mobile via `useIsMobile()`:

- **Desktop (≥768px):** manter grid-table compacto, **adicionando** a coluna "Cartão". Novo grid: `[90px_80px_1fr_90px_130px_130px_130px_36px]` (Data | Tipo | Descrição | Valor | Categoria | Banco | Cartão | Excluir). Reduz larguras para caber sem rolagem horizontal em desktops ≥1024px.

- **Mobile (<768px):** abandonar grid-table e renderizar cada linha como **card empilhado** (`rounded-2xl bg-card/40 p-4 space-y-3`) com:
  - Header: "Linha 1" + botão excluir
  - Grid 2 colunas: Data + Tipo
  - Descrição (full width)
  - Grid 2 colunas: Valor + Categoria
  - Grid 2 colunas: Banco + Cartão
  - `inputMode="decimal"` no campo valor, fonte ≥16px (para evitar zoom no iOS).

**Outros ajustes mobile/UX**
- `DialogContent`: `w-[95vw] max-w-5xl max-h-[95vh] sm:max-h-[90vh] p-4 sm:p-6 rounded-3xl`.
- Iniciar com **3 linhas** em mobile, 5 em desktop (menos scroll inicial).
- Botões do footer empilhados em mobile (`flex-col sm:flex-row`), full-width.
- ScrollArea com `max-h-[60vh] sm:max-h-[55vh]`.
- Trigger button: ícone-only em telas muito pequenas (`<span className="hidden xs:inline">Entrada Rápida</span>`).

### 3. `Transactions.tsx` — repassar `cardId`
- Adicionar `cardId?: string` ao tipo do `handleQuickBatchAdd` e propagá-lo para `addBulkSimpleTransactions`.

## Arquivos Alterados

| Arquivo | Mudança |
|---|---|
| `src/components/finance/QuickEntryDialog.tsx` | Reescrever: adicionar coluna cartão, layout dual desktop/mobile, melhorias UX mobile |
| `src/hooks/useTransactions.ts` | Adicionar `cardId` ao bulk insert |
| `src/pages/Transactions.tsx` | Propagar `cardId` no handler `handleQuickBatchAdd` |

Sem alterações de banco — `transactions.card_id` já existe e os triggers de sincronização de cartão já estão ativos.

