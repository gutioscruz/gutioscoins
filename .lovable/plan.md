
## Plano de Melhoria de UX - Modulo Transacoes

### Objetivo
Melhorar a experiencia do usuario na visualizacao e gerenciamento de transacoes, adicionando filtros visuais, otimizando a tabela e permitindo antecipacao de parcelas diretamente da lista de transacoes.

---

### FASE 1: Integracao de Filtros Visuais

O componente `TransactionFilters` ja existe, mas nao esta sendo usado na pagina de Transacoes. Vamos integra-lo.

**Arquivo:** `src/pages/Transactions.tsx`

**Modificacoes:**
- Adicionar estados para controlar os filtros (banco, categoria, busca, valor min/max)
- Importar e integrar o componente `TransactionFilters`
- Passar os filtros para o hook `useTransactions` para filtragem server-side
- Adicionar filtro rapido por banco com botoes visuais coloridos (chips)

**Nova UI de Filtros:**
- Barra de busca proeminente no topo
- Chips de bancos clicaveis com as cores dos bancos
- Popover de filtros avancados (categoria, faixa de valor)
- Indicador de filtros ativos

---

### FASE 2: Otimizacao da Tabela de Transacoes

**Arquivos:** 
- `src/components/finance/TransactionList.tsx`
- `src/components/finance/TransactionTable.tsx`

**Melhorias na Tabela:**
1. **Virtualizacao de linhas** - Para listas muito grandes (opcional, pode usar paginacao)
2. **Paginacao** - Adicionar controles de paginas (10, 25, 50, 100 por pagina)
3. **Sticky header** - Cabecalho fixo durante scroll
4. **Compressao visual** - Modo compacto para visualizar mais transacoes
5. **Sombras de scroll** - Indicadores visuais de que ha mais conteudo
6. **Botao de antecipar** - Para transacoes parceladas

**Nova estrutura do TransactionTable:**
```
| Data | Descricao | Categoria | Banco | Valor | Acoes |
|------|-----------|-----------|-------|-------|-------|
                                              [Editar] [Antecipar] [Excluir]
```

**Legenda visual:**
- Badge colorido para parcelas (ex: "2/12")
- Tooltip com informacoes adicionais ao passar o mouse

---

### FASE 3: Antecipacao de Parcelas na Lista de Transacoes

**Novo componente:** `src/components/finance/AnticipateTransactionDialog.tsx`

**Funcionalidades:**
- Permite antecipar parcela individual ou multiplas
- Seleciona banco para debito
- Define data da antecipacao
- Campo opcional para desconto
- Mostra resumo do valor a pagar

**Integracao:**
- Botao "Antecipar" aparece apenas em transacoes parceladas
- Ao clicar, abre dialog de antecipacao
- Utiliza `anticipateInstallment` ou `anticipateMultipleInstallments` do `useInstallments`

**Modificacoes em:**
- `src/components/finance/TransactionTable.tsx` - Adicionar botao de antecipar
- `src/components/finance/TransactionList.tsx` - Adicionar botao de antecipar na visao de cards

---

### FASE 4: Chips de Filtro Rapido por Banco

**Arquivo:** `src/components/finance/TransactionList.tsx`

**Nova UI:**
```tsx
<div className="flex gap-2 overflow-x-auto pb-2">
  <Button 
    variant={selectedBank === 'all' ? 'default' : 'outline'} 
    size="sm"
    onClick={() => setSelectedBank('all')}
  >
    Todos
  </Button>
  {banks.map(bank => (
    <Button 
      key={bank.id}
      variant={selectedBank === bank.id ? 'default' : 'outline'}
      size="sm"
      onClick={() => setSelectedBank(bank.id)}
      style={{ borderColor: bank.color }}
    >
      <div className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: bank.color }} />
      {bank.name}
    </Button>
  ))}
</div>
```

---

### FASE 5: Melhorias Visuais na Tabela

**Arquivo:** `src/components/finance/TransactionTable.tsx`

**Otimizacoes:**
1. **Hover states melhorados** - Destaque mais visivel
2. **Zebra striping** - Linhas alternadas com cores diferentes
3. **Transicoes suaves** - Animacoes ao filtrar/ordenar
4. **Icones de acao** - Tooltips explicativos
5. **Responsividade** - Esconder colunas menos importantes em mobile
6. **Contagem de resultados** - "Mostrando 25 de 143 transacoes"

---

## Arquivos a Criar/Modificar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `src/pages/Transactions.tsx` | Modificar | Integrar filtros e passar para TransactionList |
| `src/components/finance/TransactionList.tsx` | Modificar | Adicionar chips de banco, filtros, paginacao |
| `src/components/finance/TransactionTable.tsx` | Modificar | Otimizar visual, adicionar botao antecipar |
| `src/components/finance/AnticipateTransactionDialog.tsx` | Criar | Dialog para antecipar parcelas |

---

## Detalhes Tecnicos

### Mudancas no TransactionList

```typescript
interface TransactionListProps {
  transactions: Transaction[];
  categories: Category[];
  banks: Bank[];
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (id: string) => void;
  onAnticipate?: (transaction: Transaction) => void; // NOVO
  selectedBank?: string; // NOVO
  onBankChange?: (bankId: string) => void; // NOVO
}
```

### Mudancas no TransactionTable

```typescript
interface TransactionTableProps {
  transactions: Transaction[];
  categories: Category[];
  banks: Bank[];
  filterType: "all" | "income" | "expense";
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (id: string) => void;
  onAnticipate?: (transaction: Transaction) => void; // NOVO
  pageSize?: number; // NOVO
  showPagination?: boolean; // NOVO
}
```

### Estados adicionados em Transactions.tsx

```typescript
const [selectedBank, setSelectedBank] = useState<string>("");
const [searchTerm, setSearchTerm] = useState<string>("");
const [selectedCategory, setSelectedCategory] = useState<string>("");
const [minAmount, setMinAmount] = useState<string>("");
const [maxAmount, setMaxAmount] = useState<string>("");

// Filtros passados para o hook
const { transactions, ... } = useTransactions({ 
  startDate, 
  endDate,
  bankId: selectedBank || undefined,
  categoryId: selectedCategory || undefined,
  search: searchTerm || undefined,
});
```

---

## Fluxo de Antecipacao

1. Usuario visualiza transacao parcelada (ex: "Netflix 3/12")
2. Clica no botao "Antecipar" (icone de fast-forward)
3. Abre dialog `AnticipateTransactionDialog`
4. Dialog busca todas as parcelas pendentes desse parcelamento
5. Usuario escolhe quantas parcelas antecipar
6. Seleciona banco e data
7. Confirma antecipacao
8. Sistema:
   - Atualiza data das parcelas
   - Libera limite do cartao (se aplicavel)
   - Cria transacao de debito no banco selecionado
9. Lista atualiza automaticamente

---

## Resultado Esperado

- **Filtros Visuais**: Chips coloridos por banco, barra de busca, filtros avancados
- **Tabela Otimizada**: Paginacao, ordenacao, visual clean
- **Antecipacao**: Botao direto na lista para antecipar parcelas
- **Performance**: Filtragem server-side, cache inteligente
