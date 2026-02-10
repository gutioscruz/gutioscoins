

## Plano: Melhorias no CRUD de Parcelas e Pagamento Seletivo

### Problemas Identificados

1. **CRUD incompleto de parcelas/parcelamentos**: Nao e possivel editar descricao, categoria, subcategoria ou detalhes de um grupo de parcelamento. Na pagina de Emprestimos, o botao "Pagar" na lista de parcelas nao oferece opcoes (banco, transacao, desconto).
2. **Pagamento nao permite selecionar parcelas especificas**: O `PayCommitmentDialog` usa um slider que paga sequencialmente (1, 2, 3...). O usuario quer escolher QUAIS parcelas pagar (ex: parcela 3 e 5, mas nao a 4).
3. **Antecipacao rigida**: O dialog de antecipacao exige banco obrigatoriamente. O usuario quer poder antecipar e escolher se foi paga em outra fatura (sem criar debito em conta).

---

### Mudancas Planejadas

#### 1. PayCommitmentDialog - Selecao Individual de Parcelas

Substituir o slider de quantidade por uma lista de checkboxes onde o usuario seleciona exatamente quais parcelas quer pagar.

**Arquivo**: `src/components/compromissos/PayCommitmentDialog.tsx`

- Remover o `Slider` de contagem
- Adicionar lista scrollavel com `Checkbox` para cada parcela pendente
- Botoes "Selecionar Todas" e "Limpar"
- Manter o checkbox "Registrar transacao financeira" (banco opcional)
- Manter campo de desconto
- Resumo atualiza dinamicamente com base nas parcelas selecionadas

**Interface visual:**
```text
+-------------------------------------------+
| Pagar Parcelas                            |
| Compra X - Cartao Y                       |
+-------------------------------------------+
| Pendentes: 8 de 12                        |
| R$ 450,00/parcela                         |
+-------------------------------------------+
| [Selecionar Todas]  [Limpar]              |
|                                           |
| [x] Parcela 5/12 - 15/03 - R$ 450,00     |
| [x] Parcela 6/12 - 15/04 - R$ 450,00     |
| [ ] Parcela 7/12 - 15/05 - R$ 450,00     |
| [ ] Parcela 8/12 - 15/06 - R$ 450,00     |
| ...                                       |
+-------------------------------------------+
| [x] Registrar transacao financeira        |
|     [Selecione a conta: Banco Inter  v]   |
| Data: [15/02/2026]                        |
| Desconto: [0,00]                          |
+-------------------------------------------+
| 2 parcelas selecionadas                   |
| Subtotal: R$ 900,00                       |
| Desconto: -R$ 0,00                        |
| Total: R$ 900,00                          |
+-------------------------------------------+
|        [Cancelar]  [Confirmar Pagamento]   |
+-------------------------------------------+
```

#### 2. Atualizar PayCommitmentDialog Props

O dialog precisara receber a lista de parcelas individuais (installments ou loan_payments) para exibir os checkboxes. Modificar:

- `Compromissos.tsx` - Passar `installmentGroup` ou `loan` ao dialog
- O dialog extrai as parcelas pendentes e exibe para selecao

**Arquivo**: `src/components/compromissos/PayCommitmentDialog.tsx`
- Nova prop: `installmentGroup?: InstallmentGroup`
- Nova prop: `loan?: Loan`
- Retornar `selectedIds: string[]` no callback em vez de `count: number`

#### 3. Compromissos.tsx - Atualizar handleConfirmPayment

**Arquivo**: `src/pages/Compromissos.tsx`

- Passar `installmentGroup` e `loan` para o `PayCommitmentDialog`
- Atualizar `handleConfirmPayment` para receber `selectedIds` em vez de `count`
- Para parcelamentos: usar `markInstallmentsPaid` ou `anticipateMultipleInstallments` com os IDs selecionados
- Para emprestimos: iterar sobre os IDs selecionados e chamar `payLoanInstallment` para cada um

#### 4. Antecipacao com Opcao "Pago em Outra Fatura"

**Arquivo**: `src/components/installments/AnticipateDialog.tsx`

- Adicionar checkbox "Pago em outra fatura" (similar ao "Registrar transacao")
- Quando marcado: nao exige banco, apenas marca a parcela como paga/antecipada sem criar transacao de debito
- Quando desmarcado: comportamento atual (exige banco, cria transacao)

**Arquivo**: `src/components/installments/InstallmentDetailsDialog.tsx`

- No modo "Antecipar Multiplas", adicionar checkbox "Registrar transacao financeira"
- Banco so aparece quando checkbox esta marcado
- Quando desmarcado, usa `markInstallmentsPaid` em vez de `anticipateMultipleInstallments`

#### 5. CRUD Completo para Parcelamentos

**Arquivo novo**: `src/components/installments/EditInstallmentGroupDialog.tsx`

Dialog para editar detalhes do grupo de parcelamento:
- Descricao (nome da compra)
- Categoria (select com categorias de despesa)
- Subcategoria (texto)
- Atualiza TODAS as transacoes do grupo de uma vez

**Arquivo**: `src/hooks/useInstallments.ts`

- Nova mutation `updateInstallmentGroup` que atualiza descricao, category_id e subcategory em todas as transacoes do grupo

**Arquivo**: `src/components/installments/InstallmentsList.tsx`

- Adicionar botao "Editar" nos cards de parcelamento

**Arquivo**: `src/pages/Installments.tsx`

- Integrar o `EditInstallmentGroupDialog`

#### 6. Pagamento na Pagina de Emprestimos

**Arquivo**: `src/pages/Loans.tsx`

- O botao "Pagar" de cada parcela individual agora abre um mini-dialog (ou usa o PayCommitmentDialog) com opcoes de banco, desconto e checkbox de transacao
- Em vez de chamar `payLoanInstallment` diretamente sem opcoes

---

### Resumo de Arquivos

**Criar:**
| Arquivo | Descricao |
|---------|-----------|
| `src/components/installments/EditInstallmentGroupDialog.tsx` | Dialog para editar grupo de parcelamento |

**Modificar:**
| Arquivo | Modificacao |
|---------|-------------|
| `src/components/compromissos/PayCommitmentDialog.tsx` | Selecao individual de parcelas com checkboxes |
| `src/pages/Compromissos.tsx` | Passar dados de parcelas ao dialog, atualizar handler |
| `src/components/installments/AnticipateDialog.tsx` | Checkbox "pago em outra fatura" (banco opcional) |
| `src/components/installments/InstallmentDetailsDialog.tsx` | Checkbox "registrar transacao" na antecipacao multipla |
| `src/components/installments/InstallmentsList.tsx` | Botao Editar nos cards |
| `src/pages/Installments.tsx` | Integrar EditInstallmentGroupDialog |
| `src/hooks/useInstallments.ts` | Nova mutation updateInstallmentGroup |
| `src/pages/Loans.tsx` | Dialog de pagamento com opcoes no botao Pagar |

---

### Ordem de Implementacao

1. Atualizar `PayCommitmentDialog` com selecao individual de parcelas
2. Atualizar `Compromissos.tsx` para passar dados e usar nova interface
3. Atualizar `AnticipateDialog` e `InstallmentDetailsDialog` com opcao de banco opcional
4. Criar `EditInstallmentGroupDialog` e mutation `updateInstallmentGroup`
5. Integrar edicao em `InstallmentsList` e `Installments.tsx`
6. Melhorar pagamento individual na pagina `Loans.tsx`

