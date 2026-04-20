

# Plano: Revisao de KPIs, Graficos de Parcelamentos e CRUD de Emprestimos na War Room

## Problema

1. **KPIs misturam parcelamentos e emprestimos** — "Saldo Devedor Restante" soma tudo junto, mas compras parceladas nao sao dividas com juros. Precisam de separacao clara.
2. **Sem graficos para parcelamentos** — a aba "Parcelamentos" so lista cards, sem visualizacao analitica.
3. **Sem criacao de emprestimos na War Room** — o `addLoan` existe no hook mas nao ha botao/dialog na pagina Compromissos.
4. **Sem forma simplificada de marcar parcelas pagas retroativamente** — o usuario quer indicar que ja pagou X parcelas e informar a data, sem precisar selecionar banco.

---

## Mudancas

### 1. Separacao dos KPIs (Compromissos.tsx)

Substituir os 4 KPI cards atuais por **6 KPIs** em grid responsivo (`grid-cols-2 md:grid-cols-3 lg:grid-cols-6`):

| KPI | Calculo |
|---|---|
| Parcelas este mes | `monthlyProjections[0].installmentsAmount` |
| Dividas este mes | `monthlyProjections[0].loansAmount` |
| Total Parcelado Restante | Soma `remainingAmount` de commitments kind=installment |
| Divida com Juros Restante | Soma `remainingAmount` de commitments kind=loan |
| Parcelamentos Ativos | Count installments |
| Emprestimos Ativos | Count loans |

Os KPIs de parcelamentos usam cor `text-primary`, os de emprestimos usam `text-destructive` — separacao visual clara.

### 2. Graficos na aba "Parcelamentos" (Compromissos.tsx)

Antes da lista de cards, adicionar uma secao com 2 graficos lado a lado (`grid md:grid-cols-2`):

**a) Projecao Mensal de Parcelamentos (BarChart)**
- Dados: `monthlyProjections` usando apenas `installmentsAmount` por mes.
- Mostra quanto o usuario paga de parcelas em cada um dos proximos 12 meses.
- Barras em cor `primary`.

**b) Distribuicao por Categoria (PieChart/Donut)**
- Dados: agrupar `installmentCommitments` por `categoryName`, somando `remainingAmount`.
- Mostra onde o dinheiro parcelado esta concentrado (ex: Lazer 40%, Compras 35%).
- Cores via `getCategoryColor`.

Importar `BarChart, Bar, PieChart, Pie, Cell` do recharts (ja instalado).

### 3. CRUD de Emprestimos na aba "Emprestimos"

**a) Botao "Novo Emprestimo"**
- Adicionar botao `+ Novo Emprestimo` no topo da aba "Emprestimos".
- Abre `AddLoanDialog` (novo componente).

**b) `AddLoanDialog.tsx` (novo)**
- Campos: Nome, Descricao, Valor Principal, Taxa de Juros (% a.m.), Numero de Parcelas, Frequencia (mensal/quinzenal/semanal), Data Inicio, Banco, Categoria, Tipo (pessoal/consignado/consignado_clt/fatura_parcelada).
- Ao submeter, chama `addLoan.mutate(...)` do `useLoans` — que ja calcula a Tabela Price e gera os `loan_payments`.
- Estilo glassmorphism (`rounded-3xl`, `bg-card/95`, `backdrop-blur-xl`).

**c) Marcar parcelas pagas retroativamente (simplificado)**
- No `CommitmentDetailsDialog` ou via novo botao "Atualizar Historico" no card de emprestimo, abrir um **dialog de checklist** (`BulkMarkPaidDialog.tsx`, novo).
- Lista todas as parcelas do emprestimo em ordem, com checkbox + campo de data de pagamento.
- Pre-seleciona parcelas vencidas ate hoje. O usuario pode marcar/desmarcar e definir a data real de pagamento.
- Ao confirmar, faz batch update no `loan_payments`: `paid = true`, `paid_date = data informada`, `final_paid_amount = amount`. Sem criar transacao financeira (modo simples).
- Atualiza `loans.total_paid` com a soma dos valores marcados.

### 4. Burndown Chart separado

No grafico de Burndown (aba "Visao Geral"), adicionar **duas areas empilhadas** em vez de uma unica:
- Area 1: `remainingInstallments` (cor primary, opacidade baixa)
- Area 2: `remainingLoans` (cor destructive)

Legenda diferenciando "Parcelamentos" de "Dividas com Juros".

---

## Arquivos Modificados

| Arquivo | Acao |
|---|---|
| `src/pages/Compromissos.tsx` | KPIs separados, graficos na aba Parcelamentos, burndown dual, botao Novo Emprestimo, botao Atualizar Historico |
| `src/components/compromissos/AddLoanDialog.tsx` | **Novo** — formulario de criacao de emprestimo com Tabela Price |
| `src/components/compromissos/BulkMarkPaidDialog.tsx` | **Novo** — checklist de parcelas com data de pagamento para atualizacao retroativa |
| `src/hooks/useLoans.ts` | Adicionar mutation `bulkMarkPaid` — batch update de `loan_payments` (paid, paid_date) e recalculo de `total_paid` |
| `src/hooks/useCommitments.ts` | Expandir `summary` com campos separados: `installmentsRemainingAmount`, `loansRemainingAmount`, `thisMonthInstallments`, `thisMonthLoans` |

**Sem migrations** — todas as tabelas e colunas necessarias ja existem (`loans`, `loan_payments.paid`, `loan_payments.paid_date`, `loan_payments.final_paid_amount`).

