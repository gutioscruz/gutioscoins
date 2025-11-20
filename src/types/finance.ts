export type TransactionType = "income" | "expense";

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  date: Date;
}

export const incomeCategories = [
  "Salário",
  "Freelance",
  "Investimentos",
  "Outros Recebimentos",
];

export const expenseCategories = [
  "Alimentação",
  "Transporte",
  "Moradia",
  "Saúde",
  "Educação",
  "Lazer",
  "Compras",
  "Contas",
  "Outros Gastos",
];
