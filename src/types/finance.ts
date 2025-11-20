export type TransactionType = "income" | "expense";
export type BankType = "checking" | "savings" | "credit";
export type InvestmentType = "stocks" | "funds" | "crypto" | "fixed-income" | "other";
export type RecurrenceFrequency = "daily" | "weekly" | "monthly" | "yearly";
export type GoalType = "savings" | "debt-payment" | "expense-reduction" | "investment" | "emergency-fund";
export type GoalStatus = "active" | "completed" | "paused" | "failed";
export type LoanStatus = "active" | "paid" | "overdue";
export type PaymentFrequency = "monthly" | "biweekly" | "weekly";

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

export interface FinancialGoal {
  id: string;
  name: string;
  description: string;
  type: GoalType;
  targetAmount: number;
  currentAmount: number;
  deadline: Date;
  status: GoalStatus;
  createdAt: Date;
  categoryId?: string;
}

export interface Alert {
  id: string;
  type: "warning" | "success" | "info";
  title: string;
  message: string;
  createdAt: Date;
  read: boolean;
}

export interface LoanPayment {
  id: string;
  installmentNumber: number;
  dueDate: Date;
  amount: number;
  principal: number;
  interest: number;
  paid: boolean;
  paidDate?: Date;
  transactionId?: string;
}

export interface Loan {
  id: string;
  name: string;
  description: string;
  principal: number;
  interestRate: number;
  installments: number;
  paymentFrequency: PaymentFrequency;
  startDate: Date;
  status: LoanStatus;
  bankId?: string;
  payments: LoanPayment[];
  totalPaid: number;
  totalInterest: number;
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
  recurringTransactionId?: string;
  isInstallment: boolean;
  installmentCount?: number;
  installmentNumber: number;
  parentTransactionId?: string;
}

export interface RecurringTransaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  subcategory?: string;
  bankId: string;
  frequency: RecurrenceFrequency;
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
  lastGenerated?: Date;
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
