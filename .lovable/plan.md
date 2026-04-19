

## Análise

**Problemas identificados na página `/compromissos`:**

1. **Empréstimos sem CRUD** — os cards na aba "Empréstimos" só têm os botões **Pagar**, **Detalhes** e **Sniper (antecipação)**. Não há **Editar** nem **Excluir**, embora as mutations `updateLoan` e `deleteLoan` já existam em `useLoans.ts` (linhas 151-197).

2. **Pagamento exige banco/transação obrigatórios** — no `PayCommitmentDialog`, o checkbox "Registrar transação financeira" existe mas inicia desmarcado e o fluxo é confuso. O usuário quer um botão **explícito de "Apenas marcar como pago"** (atualizar status sem mexer em saldo de conta), separado do fluxo de "pagar com débito em conta".

3. **Não existe `EditLoanDialog`** — a única edição hoje está em `/emprestimos` (página antiga `Loans.tsx`), forçando o usuário a sair da War Room.

---

## Plano de Refatoração

### 1. Criar `EditLoanDialog.tsx` (novo)

`src/components/compromissos/EditLoanDialog.tsx`

Campos editáveis (apenas metadados — não recalcula parcelas):
- Nome
- Descrição
- Banco vinculado
- Categoria / Subcategoria
- Tipo de empréstimo (`pessoal` | `consignado` | `consignado_clt` | `fatura_parcelada`)
- Status (`active` | `paid` | `overdue`)

**Bloqueado para edição** (com aviso): principal, taxa, número de parcelas, frequência. Motivo: alterar isso quebraria a Tabela Price já gerada.

Usa `updateLoan` do `useLoans`. Estilo glassmorphism (`rounded-3xl`, `bg-card/40`).

### 2. Refatorar `PayCommitmentDialog.tsx`

**Mudança no fluxo:**
- Substituir o checkbox "Registrar transação financeira" por um **toggle de modo** com 2 opções claras no topo:
  - 🏦 **"Pagar com débito em conta"** → exige banco, cria transação (atualiza saldo)
  - ✅ **"Apenas marcar como pago"** (default) → não exige banco, **só atualiza o status** das parcelas. Útil para "atualizar sistema defasado" sem mexer em saldo atual.
- Quando modo = "marcar como pago", esconder completamente o seletor de banco e o aviso.
- Botão final muda label conforme o modo: `"Confirmar Pagamento"` vs `"Marcar como Pago"`.
- Manter seleção de parcelas, data, desconto.

**Lógica em `Compromissos.tsx`** (`handleConfirmPayment`): já suporta `createTransaction: boolean` — basta o dialog passar o valor correto. Ajustar a chamada para `markInstallmentsPaid` (já existe em `useInstallments`) e `payMultipleLoanInstallments` com `createTransaction: false`.

### 3. Adicionar ações de CRUD ao `CommitmentCard` (em `Compromissos.tsx`)

Apenas para `commitment.kind === "loan"`, adicionar dropdown menu (`MoreVertical` ícone, lucide) no canto superior direito do card com:
- ✏️ **Editar** → abre `EditLoanDialog`
- 🗑️ **Excluir** → abre `ConfirmDialog` (já existe em `src/components/ConfirmDialog.tsx`) → chama `deleteLoan.mutate(originalId)`

Manter o `SniperButton` na barra inferior.

### 4. Wire-up em `Compromissos.tsx`

- Importar `useLoans` (já importado), expor `updateLoan` e `deleteLoan`
- Importar `ConfirmDialog` e novo `EditLoanDialog`
- Estados: `editLoanDialogOpen`, `deleteLoanDialogOpen`, `selectedLoan`
- Handlers: `handleEditLoan(commitment)`, `handleDeleteLoan(commitment)`, `confirmDeleteLoan()`

---

## Arquivos Modificados

| Arquivo | Ação |
|---|---|
| `src/components/compromissos/EditLoanDialog.tsx` | **Novo** — dialog de edição de metadados do empréstimo |
| `src/components/compromissos/PayCommitmentDialog.tsx` | Refatorar: toggle "Pagar com débito" vs "Apenas marcar como pago" no topo, esconder banco no modo simples |
| `src/pages/Compromissos.tsx` | Adicionar dropdown CRUD nos cards de empréstimo, wire-up de edit/delete dialogs |

**Sem alterações de banco** — `updateLoan` e `deleteLoan` já existem e a tabela `loans` tem CASCADE em `loan_payments` via RLS.

