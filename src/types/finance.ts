export type TransactionType = "income" | "expense";
export type BankType = "checking" | "savings" | "credit";
export type InvestmentType = "stocks" | "funds" | "crypto" | "fixed-income" | "other";

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  subcategories: string[];
}

export interface Card {
  id: string;
  name: string;
  limit: number;
  used: number;
  color: string;
}

export interface Bank {
  id: string;
  name: string;
  type: BankType;
  balance?: number;
  limit?: number;
  color: string;
  cards?: Card[];
}

export interface Investment {
  id: string;
  name: string;
  type: InvestmentType;
  amount: number;
  profitability?: number;
  color: string;
}

export interface BudgetCategory {
  categoryId: string;
  estimatedAmount: number;
  actualAmount: number;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  subcategory?: string;
  bankId: string;
  date: Date;
}

export const defaultIncomeCategories: Category[] = [
  { id: "1", name: "Salário", type: "income", subcategories: ["Salário Base", "Bônus", "13º"] },
  { id: "2", name: "Freelance", type: "income", subcategories: ["Projeto", "Consultoria"] },
  { id: "3", name: "Investimentos", type: "income", subcategories: ["Dividendos", "Juros", "Rendimentos"] },
  { id: "4", name: "Outros Recebimentos", type: "income", subcategories: [] },
];

export const defaultExpenseCategories: Category[] = [
  { id: "5", name: "Alimentação", type: "expense", subcategories: ["Supermercado", "Restaurante", "Delivery"] },
  { id: "6", name: "Transporte", type: "expense", subcategories: ["Combustível", "Transporte Público", "Uber/Taxi"] },
  { id: "7", name: "Moradia", type: "expense", subcategories: ["Aluguel", "Condomínio", "IPTU", "Manutenção"] },
  { id: "8", name: "Saúde", type: "expense", subcategories: ["Plano de Saúde", "Medicamentos", "Consultas"] },
  { id: "9", name: "Educação", type: "expense", subcategories: ["Mensalidade", "Material", "Cursos"] },
  { id: "10", name: "Lazer", type: "expense", subcategories: ["Streaming", "Cinema", "Viagens", "Hobbies"] },
  { id: "11", name: "Compras", type: "expense", subcategories: ["Roupas", "Eletrônicos", "Casa"] },
  { id: "12", name: "Contas", type: "expense", subcategories: ["Energia", "Água", "Internet", "Telefone"] },
  { id: "13", name: "Outros Gastos", type: "expense", subcategories: [] },
];
