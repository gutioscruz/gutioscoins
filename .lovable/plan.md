
## Plano de Implementacao: Lista de Desejos com Projecao Financeira

### Visao Geral

Implementar uma funcionalidade de "Lista de Desejos" (Wishlist) integrada ao painel de Metas, onde o usuario pode adicionar itens desejados com preco, categoria e subcategoria. O sistema calculara automaticamente uma projecao financeira indicando o melhor momento para comprar cada item.

---

### Modelo de Dados

**Nova tabela: `wishlist_items`**

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| `id` | uuid | Identificador unico |
| `user_id` | uuid | Referencia ao usuario |
| `name` | text | Nome do item desejado |
| `description` | text | Descricao opcional |
| `price` | numeric | Preco estimado do item |
| `category_id` | uuid | Categoria (para analise de gastos) |
| `subcategory` | text | Subcategoria opcional |
| `priority` | text | Prioridade: 'low', 'medium', 'high' |
| `url` | text | Link opcional para o produto |
| `image_url` | text | Imagem opcional do item |
| `status` | text | Status: 'pending', 'purchased', 'cancelled' |
| `target_date` | date | Data alvo desejada (opcional) |
| `purchased_at` | timestamp | Data da compra (se comprado) |
| `created_at` | timestamp | Data de criacao |
| `updated_at` | timestamp | Data de atualizacao |

**Politicas RLS:**
- Usuarios podem apenas ver/criar/editar/deletar seus proprios itens

---

### Logica de Projecao Financeira

O sistema calculara o "melhor momento para comprar" baseado em:

1. **Saldo Disponivel Mensal**
   - Receita mensal (salario configurado ou calculado automaticamente)
   - Menos: Despesas fixas (transacoes recorrentes)
   - Menos: Compromissos mensais (parcelas + emprestimos)
   - Igual: Saldo livre mensal

2. **Regra do Orcamento**
   - Verificar a categoria do item na area de orcamento
   - Calcular quanto sobra nessa area apos gastos realizados
   - Projetar acumulo mensal para essa categoria

3. **Calculo da Data de Compra**
   - Se o preco do item cabe no saldo livre atual: "Pode comprar agora"
   - Caso contrario: Calcular quantos meses de economia serao necessarios
   - Considerar prioridade para ordenar sugestoes

4. **Insights Inteligentes**
   - "Voce pode comprar este item em X meses economizando R$ Y/mes"
   - "Baseado no seu padrao de gastos, abril seria o melhor mes"
   - "Se reduzir gastos em [categoria], pode antecipar para [data]"

---

### Arquivos a Criar

| Arquivo | Descricao |
|---------|-----------|
| `src/hooks/useWishlist.ts` | Hook para CRUD da lista de desejos |
| `src/components/wishlist/WishlistCard.tsx` | Card de item da lista |
| `src/components/wishlist/WishlistDialog.tsx` | Dialog para adicionar/editar item |
| `src/components/wishlist/WishlistProjection.tsx` | Componente de projecao financeira |
| `src/components/wishlist/WishlistInsights.tsx` | Componente de insights inteligentes |

---

### Arquivos a Modificar

| Arquivo | Modificacao |
|---------|-------------|
| `src/pages/Goals.tsx` | Adicionar aba/secao para Lista de Desejos |
| `src/types/finance.ts` | Adicionar interface `WishlistItem` e tipos relacionados |
| `src/lib/validations.ts` | Adicionar schema de validacao `wishlistItemSchema` |
| `src/contexts/FinanceContext.tsx` | Expor hook de wishlist (opcional, pode usar direto) |

---

### Interface do Usuario

**Pagina de Metas (Goals) - Nova Estrutura:**

```
text
[Tabs]
- Metas Financeiras (atual)
- Lista de Desejos (novo)

[Lista de Desejos]
+------------------------------------------+
| [+ Novo Item]                   [Filtros] |
+------------------------------------------+
| Item: iPhone 15 Pro              R$ 8.999 |
| Categoria: Compras > Eletronicos         |
| Prioridade: Alta                          |
| Projecao: Pode comprar em Maio/2026      |
| [Economizando R$ 1.800/mes por 5 meses]  |
|                        [Editar] [Comprei!]|
+------------------------------------------+
| Item: Viagem Portugal           R$ 15.000 |
| Categoria: Lazer > Viagens               |
| Prioridade: Media                         |
| Projecao: Pode comprar em Outubro/2026   |
| [Reduzindo gastos em Lazer: Agosto/2026] |
|                        [Editar] [Comprei!]|
+------------------------------------------+
```

**Dialog de Adicionar Item:**

- Nome do item (obrigatorio)
- Preco (obrigatorio)
- Categoria (select com categorias de despesa)
- Subcategoria (opcional)
- Prioridade (baixa/media/alta)
- Data alvo (opcional - para itens com prazo)
- Link do produto (opcional)
- Descricao/Notas (opcional)

---

### Calculo de Projecao

**Hook `useWishlistProjection`:**

```typescript
interface WishlistProjection {
  canBuyNow: boolean;
  monthsToSave: number;
  monthlySavingsNeeded: number;
  suggestedDate: Date;
  alternativeDate?: Date; // Se reduzir gastos
  potentialSavings: number; // Economia possivel na categoria
  tips: string[];
}
```

**Dados utilizados:**
- `useUserSettings` - Salario mensal
- `useTransactions` - Historico de gastos
- `useCommitments` - Compromissos futuros
- `useBudgetAreas` - Orcamento por categoria
- `useBudgetAllocation` - Alocacao real vs planejada

---

### Fluxo do Usuario

1. Usuario acessa "Metas" e clica na aba "Lista de Desejos"
2. Clica em "Novo Item" e preenche os dados
3. Sistema calcula automaticamente a projecao
4. Card mostra:
   - Informacoes do item
   - Projecao de quando pode comprar
   - Sugestoes de economia
5. Ao comprar, usuario clica "Comprei!" que:
   - Pergunta se quer registrar a transacao
   - Move item para "Comprados"
   - Atualiza estatisticas

---

### Detalhes Tecnicos

**Migracao SQL:**

```sql
CREATE TABLE wishlist_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  name text NOT NULL,
  description text,
  price numeric NOT NULL,
  category_id uuid REFERENCES categories(id),
  subcategory text,
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  url text,
  image_url text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'purchased', 'cancelled')),
  target_date date,
  purchased_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS Policies
ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wishlist items"
  ON wishlist_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own wishlist items"
  ON wishlist_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own wishlist items"
  ON wishlist_items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own wishlist items"
  ON wishlist_items FOR DELETE
  USING (auth.uid() = user_id);
```

**Tipo TypeScript:**

```typescript
export type WishlistPriority = 'low' | 'medium' | 'high';
export type WishlistStatus = 'pending' | 'purchased' | 'cancelled';

export interface WishlistItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  categoryId?: string;
  subcategory?: string;
  priority: WishlistPriority;
  url?: string;
  imageUrl?: string;
  status: WishlistStatus;
  targetDate?: Date;
  purchasedAt?: Date;
  createdAt: Date;
}
```

---

### Integracao com Dashboard

Adicionar widget no Dashboard mostrando:
- "Proximos itens da lista de desejos"
- Items com prioridade alta que podem ser comprados em breve
- Resumo: X itens pendentes, total R$ Y

---

### Resultado Esperado

- **Lista de Desejos**: Adicionar e gerenciar itens desejados
- **Projecao Inteligente**: Sistema calcula quando o usuario pode comprar cada item
- **Insights**: Sugestoes de economia e otimizacao
- **Integracao**: Conectado ao sistema de transacoes para registrar compras
- **Dashboard**: Widget resumo no painel principal
