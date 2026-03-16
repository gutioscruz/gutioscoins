

## Plano: FAB Stacking + Chat em Sheet + Redesign de Transações

### 1. FAB Stacking (Chat acima do botão de transação)

**Arquivo:** `src/components/ai/FinancialAdvisorChat.tsx`
- Botão fechado: `fixed bottom-24 right-6 z-50` (acima do FAB de transação em `bottom-6`)

### 2. Migração do Chat para Sheet/Drawer

**Arquivo:** `src/components/ai/FinancialAdvisorChat.tsx`

Substituir a `div` customizada por:
- **Desktop** (`useIsMobile() === false`): `Sheet` do shadcn com `side="right"`, largura `w-[420px]`
- **Mobile** (`useIsMobile() === true`): `Drawer` (ou `Sheet side="bottom"`) com altura `h-[85vh]`

Estrutura interna mantida (header, ScrollArea de mensagens, input), mas agora dentro do `SheetContent`/`DrawerContent`, ganhando overlay escuro, animação nativa e scroll correto.

O botão FAB vira o `SheetTrigger` / controla `open` state do Sheet.

### 3. Redesign da TransactionList - Agrupamento por Data

**Arquivo:** `src/components/finance/TransactionList.tsx`

No modo "cards", agrupar transações por data usando `date-fns`:
- Criar `Map<string, Transaction[]>` agrupando por `format(date, 'yyyy-MM-dd')`
- Renderizar headers de grupo: "Hoje", "Ontem", ou "12 de março" (formatado com `ptBR`)
- Cada header é um `<div>` com texto `text-sm font-medium text-muted-foreground` e um `Separator`

### 4. Redesign da Linha de Transação

**Arquivo:** `src/components/finance/TransactionList.tsx`

Redesenhar cada item:
- **Esquerda**: Ícone circular com `ArrowUpCircle`/`ArrowDownCircle` usando cores dinâmicas (`bg-green-100 text-green-600` para receita, `bg-red-100 text-red-600` para despesa) — já existe parcialmente, refinar cores
- **Centro**: Descrição em `font-semibold text-sm`, abaixo subcategoria + banco em `text-xs text-muted-foreground`
- **Direita**: Valor formatado em `font-semibold`, badge de parcela se aplicável
- Ações (edit/delete/anticipate) mantidas no hover

### 5. Filtros Rápidos Inline

**Arquivo:** `src/components/finance/TransactionList.tsx`

Mover o filtro de tipo (Todas/Receitas/Despesas) e banco para uma barra de filtros compacta logo abaixo do título:
- Tipo: usar `ToggleGroup` com 3 opções ("Todas", "Receitas", "Despesas") estilo pill/badge
- Banco: manter `BankFilterChips` logo abaixo (já existe, apenas garantir posicionamento)
- Toggle de visualização (cards/table) fica inline na mesma barra

O `PeriodFilter` (seletor de mês) permanece no header da página `Transactions.tsx`, pois controla a query de dados.

---

### Resumo de Arquivos

| Arquivo | Modificação |
|---------|-------------|
| `src/components/ai/FinancialAdvisorChat.tsx` | Migrar para Sheet (desktop) / Drawer (mobile); FAB em `bottom-24` |
| `src/components/finance/TransactionList.tsx` | Agrupar por data, redesign de linha, filtros inline com ToggleGroup |

### Detalhes Técnicos

**Agrupamento por data** — lógica:
```typescript
const grouped = useMemo(() => {
  const map = new Map<string, Transaction[]>();
  const sorted = [...filteredTransactions].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  sorted.forEach(t => {
    const key = format(t.date, 'yyyy-MM-dd');
    map.set(key, [...(map.get(key) || []), t]);
  });
  return map;
}, [filteredTransactions]);
```

**Labels de data**: "Hoje" se `isToday(date)`, "Ontem" se `isYesterday(date)`, senão `format(date, "d 'de' MMMM", { locale: ptBR })`.

**Sheet vs Drawer**: Usar `useIsMobile()` para decidir qual componente renderizar. Ambos controlados pelo mesmo `isOpen` state.

