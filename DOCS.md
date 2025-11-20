# 💰 GutiosCoins - Aplicação de Controle Financeiro

## 📋 Sobre o Projeto

GutiosCoins é uma aplicação web completa para gerenciamento de finanças pessoais, desenvolvida com React, TypeScript e Tailwind CSS. O app oferece funcionalidades avançadas para controle de receitas, despesas, investimentos, metas e empréstimos.

## ✨ Funcionalidades Principais

### 📊 Dashboard Inteligente
- Visão geral do mês atual comparado ao anterior
- Projeção de saldo futuro
- Top categorias de gastos
- Detecção automática de gastos incomuns
- Sistema de alertas personalizados
- Acompanhamento de metas ativas

### 💸 Transações
- Registro de receitas e despesas
- Filtros por período
- Visualização em lista e gráficos
- Categorização detalhada
- Integração com bancos/contas

### 🔄 Transações Recorrentes
- Automatização de pagamentos fixos
- Frequências configuráveis (diária, semanal, mensal, anual)
- Controle de ativação/pausa
- Datas de início e fim

### 🏷️ Categorias
- Criação de categorias personalizadas
- Sistema de subcategorias
- Separação por tipo (receita/despesa)
- Categorias padrão incluídas

### 🏦 Bancos & Investimentos
- Gerenciamento de contas bancárias
- Controle de cartões de crédito
- Portfólio de investimentos
- Visualização de patrimônio total

### 📈 Orçamento
- Análise histórica (últimos 3 meses)
- Sugestões automáticas de orçamento
- Comparação estimado vs realizado
- Alertas de gastos excessivos

### 🎯 Metas Financeiras
- Criação de objetivos financeiros
- Tipos: poupança, dívida, investimento, emergência
- Acompanhamento visual de progresso
- Notificações de conclusão

### 💳 Empréstimos & Dívidas
- Calculadora de empréstimos
- Simulação de cenários
- Cronograma de pagamentos
- Simulador de antecipação
- Cálculo de economia com antecipação

## 🛠️ Stack Tecnológica

- **React 18** - Framework UI
- **TypeScript** - Tipagem estática
- **Vite** - Build tool
- **Tailwind CSS** - Estilização
- **shadcn/ui** - Componentes UI
- **React Router** - Navegação
- **Recharts** - Gráficos e visualizações
- **date-fns** - Manipulação de datas
- **Lucide React** - Biblioteca de ícones
- **Sonner** - Sistema de notificações

## 📱 Estrutura de Páginas

| Rota | Página | Descrição |
|------|--------|-----------|
| `/` | Transações | Página principal com todas as transações |
| `/dashboard` | Dashboard | Visão geral inteligente e insights |
| `/recurring` | Recorrentes | Configuração de transações automáticas |
| `/categories` | Categorias | Gerenciamento de categorias |
| `/banks` | Patrimônio | Bancos, cartões e investimentos |
| `/budget` | Orçamento | Planejamento e análise orçamentária |
| `/goals` | Metas | Objetivos e metas financeiras |
| `/loans` | Empréstimos | Gestão de empréstimos e dívidas |

## 🎨 Design System

### Cores
O app utiliza um sistema de cores HSL com tokens semânticos:
- `primary` - Cor principal da marca
- `secondary` - Cor secundária
- `income` - Verde para receitas
- `expense` - Vermelho para despesas
- `muted` - Tons suaves para backgrounds
- `accent` - Cor de destaque

### Temas
- **Modo Escuro** (padrão)
- **Modo Claro**
- Toggle de tema na sidebar

### Tipografia
- **Sans**: Inter (textos gerais)
- **Serif**: Lora (títulos especiais)
- **Mono**: Space Mono (números e códigos)

## 📂 Estrutura de Arquivos

```
src/
├── components/
│   ├── ui/              # Componentes shadcn/ui
│   ├── finance/         # Componentes específicos de finanças
│   ├── AppSidebar.tsx   # Barra lateral de navegação
│   ├── NavLink.tsx      # Link de navegação customizado
│   └── theme-provider.tsx
├── contexts/
│   └── FinanceContext.tsx  # Contexto global de finanças
├── pages/
│   ├── Dashboard.tsx
│   ├── Transactions.tsx
│   ├── RecurringTransactions.tsx
│   ├── Categories.tsx
│   ├── Banks.tsx
│   ├── Budget.tsx
│   ├── Goals.tsx
│   ├── Loans.tsx
│   └── NotFound.tsx
├── types/
│   └── finance.ts       # Tipos TypeScript
├── lib/
│   └── utils.ts         # Utilitários
├── App.tsx              # Componente raiz
└── main.tsx            # Entry point
```

## 🚀 Iniciando

### Pré-requisitos
- Node.js 18+
- npm ou yarn

### Instalação

```bash
# Clone o repositório
git clone [seu-repo-url]

# Entre no diretório
cd gutioscoins

# Instale as dependências
npm install

# Inicie o servidor de desenvolvimento
npm run dev
```

O app estará disponível em `http://localhost:5173`

## 💾 Armazenamento de Dados

**Importante**: Atualmente, os dados são armazenados apenas em memória (React State). Isso significa que:
- ✅ Perfeito para testes e demonstração
- ❌ Dados são perdidos ao recarregar a página
- ⚠️ Não há persistência entre sessões

### Próximos Passos para Persistência

1. **Lovable Cloud (Recomendado)**
   ```typescript
   // Integração com Supabase
   - Habilitar Lovable Cloud
   - Criar tabelas no banco
   - Implementar queries
   - Adicionar RLS policies
   ```

2. **LocalStorage (Simples)**
   ```typescript
   // Salvar localmente no navegador
   - Adicionar hooks para sync
   - Implementar save/load
   - Gerenciar versioning
   ```

## 🔒 Segurança

- ✅ Validação de formulários
- ✅ Sanitização de inputs
- ✅ Tipos TypeScript estritos
- ✅ Sem dados sensíveis no código
- ⚠️ Implementar autenticação para produção
- ⚠️ Adicionar RLS no Supabase

## 📊 Análise de Código

### Métricas
- **Páginas**: 8
- **Componentes**: 50+
- **Linhas de código**: ~5000
- **Tipos TypeScript**: 100% tipado
- **Componentes UI**: 30+ (shadcn/ui)

### Qualidade
- ✅ TypeScript strict mode
- ✅ ESLint configurado
- ✅ Componentes funcionais com hooks
- ✅ Design system consistente
- ✅ Código limpo e documentado

## 🎯 Roadmap Futuro

### Curto Prazo
- [ ] Persistência com Lovable Cloud
- [ ] Autenticação de usuários
- [ ] Exportação de relatórios
- [ ] Filtros avançados

### Médio Prazo
- [ ] Gráficos de evolução patrimonial
- [ ] Sistema de notificações
- [ ] Upload de comprovantes
- [ ] Múltiplas moedas

### Longo Prazo
- [ ] Sincronização bancária (Open Banking)
- [ ] App mobile (React Native)
- [ ] IA para sugestões financeiras
- [ ] Compartilhamento de orçamentos

## 🤝 Contribuindo

Sugestões e contribuições são bem-vindas! Sinta-se livre para:
- Reportar bugs
- Sugerir novas funcionalidades
- Melhorar a documentação
- Enviar pull requests

## 📄 Licença

MIT License - use e modifique livremente!

---

**Desenvolvido com ❤️ usando [Lovable](https://lovable.dev)**
