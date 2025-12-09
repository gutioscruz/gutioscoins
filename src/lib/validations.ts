import { z } from 'zod';

// Common validation patterns
const uuidSchema = z.string().uuid('ID inválido');
const positiveAmount = z.number().positive('Valor deve ser positivo').max(999999999, 'Valor muito alto');
const optionalPositiveAmount = z.number().positive('Valor deve ser positivo').max(999999999, 'Valor muito alto').optional();
const shortText = z.string().trim().min(1, 'Campo obrigatório').max(100, 'Máximo 100 caracteres');
const mediumText = z.string().trim().min(1, 'Campo obrigatório').max(500, 'Máximo 500 caracteres');
const longText = z.string().trim().max(1000, 'Máximo 1000 caracteres').optional();
const colorHex = z.string().regex(/^#[0-9A-F]{6}$/i, 'Cor inválida');

// Transaction validation
export const transactionSchema = z.object({
  description: mediumText,
  amount: positiveAmount,
  type: z.enum(['income', 'expense'], { errorMap: () => ({ message: 'Tipo inválido' }) }),
  date: z.date(),
  categoryId: uuidSchema,
  bankId: uuidSchema,
  subcategory: z.string().trim().max(100, 'Subcategoria muito longa').optional(),
  isInstallment: z.boolean().default(false),
  installmentCount: z.number().int().min(2).max(100).optional(),
  installmentNumber: z.number().int().min(1).default(1),
  parentTransactionId: uuidSchema.optional(),
}).refine(
  (data) => {
    if (data.isInstallment && !data.installmentCount) {
      return false;
    }
    if (!data.isInstallment && data.installmentCount) {
      return false;
    }
    return true;
  },
  {
    message: "Transações parceladas devem ter quantidade de parcelas definida",
  }
);

export type TransactionInput = z.infer<typeof transactionSchema>;

// Category validation
export const categorySchema = z.object({
  name: shortText,
  type: z.enum(['income', 'expense'], { errorMap: () => ({ message: 'Tipo inválido' }) }),
  subcategories: z.array(z.string().trim().min(1).max(100)).max(50, 'Máximo 50 subcategorias').optional(),
});

export type CategoryInput = z.infer<typeof categorySchema>;

// Bank validation
export const bankSchema = z.object({
  name: shortText,
  type: z.enum(['checking', 'savings', 'credit'], { errorMap: () => ({ message: 'Tipo inválido' }) }),
  balance: optionalPositiveAmount,
  limit: optionalPositiveAmount,
  color: colorHex,
  cards: z.array(z.object({
    id: uuidSchema,
    name: shortText,
    limit: positiveAmount,
    used: z.number().min(0, 'Valor usado não pode ser negativo').max(999999999),
    color: colorHex,
  })).optional(),
});

export type BankInput = z.infer<typeof bankSchema>;

// Card validation
export const cardSchema = z.object({
  name: shortText,
  limit: z.coerce.number().positive('Limite deve ser positivo').max(999999999, 'Valor muito alto'),
  used: z.coerce.number().min(0, 'Valor usado não pode ser negativo').max(999999999).default(0),
  color: colorHex,
});

export type CardInput = z.infer<typeof cardSchema>;

// Investment validation
export const investmentSchema = z.object({
  name: shortText,
  type: z.enum(['stocks', 'funds', 'crypto', 'fixed-income', 'other'], { errorMap: () => ({ message: 'Tipo inválido' }) }),
  amount: positiveAmount,
  profitability: z.number().min(-100, 'Rentabilidade muito baixa').max(1000, 'Rentabilidade muito alta').optional(),
  color: colorHex,
});

export type InvestmentInput = z.infer<typeof investmentSchema>;

// Goal validation
export const goalSchema = z.object({
  name: shortText,
  description: longText,
  type: z.enum(['savings', 'debt-payment', 'expense-reduction', 'investment', 'emergency-fund'], { errorMap: () => ({ message: 'Tipo inválido' }) }),
  targetAmount: positiveAmount,
  currentAmount: z.number().min(0, 'Valor atual não pode ser negativo').max(999999999),
  deadline: z.date(),
  status: z.enum(['active', 'completed', 'paused', 'failed'], { errorMap: () => ({ message: 'Status inválido' }) }),
  categoryId: uuidSchema.optional(),
});

export type GoalInput = z.infer<typeof goalSchema>;

// Loan validation
export const loanSchema = z.object({
  name: shortText,
  description: longText,
  principal: positiveAmount,
  interestRate: z.number().min(0, 'Taxa não pode ser negativa').max(100, 'Taxa muito alta'),
  installments: z.number().int('Parcelas devem ser inteiras').positive('Parcelas devem ser positivas').max(1000, 'Máximo 1000 parcelas'),
  paymentFrequency: z.enum(['monthly', 'biweekly', 'weekly'], { errorMap: () => ({ message: 'Frequência inválida' }) }),
  startDate: z.date(),
  status: z.enum(['active', 'paid', 'overdue'], { errorMap: () => ({ message: 'Status inválido' }) }),
  totalInterest: z.number().min(0).max(999999999),
  totalPaid: z.number().min(0).max(999999999),
  bankId: uuidSchema.optional(),
});

export type LoanInput = z.infer<typeof loanSchema>;

// Recurring transaction validation
export const recurringTransactionSchema = z.object({
  description: mediumText,
  amount: positiveAmount,
  type: z.enum(['income', 'expense'], { errorMap: () => ({ message: 'Tipo inválido' }) }),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly'], { errorMap: () => ({ message: 'Frequência inválida' }) }),
  startDate: z.date(),
  endDate: z.date().optional(),
  isActive: z.boolean(),
  categoryId: uuidSchema,
  bankId: uuidSchema,
  subcategory: z.string().trim().max(100).optional(),
});

export type RecurringTransactionInput = z.infer<typeof recurringTransactionSchema>;

// Alert validation
export const alertSchema = z.object({
  type: z.enum(['success', 'warning', 'error', 'info'], { errorMap: () => ({ message: 'Tipo inválido' }) }),
  title: z.string().trim().min(1, 'Título obrigatório').max(200, 'Título muito longo'),
  message: z.string().trim().min(1, 'Mensagem obrigatória').max(1000, 'Mensagem muito longa'),
});

export type AlertInput = z.infer<typeof alertSchema>;

// Authentication validation
export const signUpSchema = z.object({
  email: z.string().email('Email inválido').max(255, 'Email muito longo'),
  password: z.string()
    .min(8, 'Senha deve ter pelo menos 8 caracteres')
    .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula')
    .regex(/[a-z]/, 'Senha deve conter pelo menos uma letra minúscula')
    .regex(/[0-9]/, 'Senha deve conter pelo menos um número')
    .regex(/[^A-Za-z0-9]/, 'Senha deve conter pelo menos um caractere especial'),
  fullName: z.string().trim().min(2, 'Nome muito curto').max(100, 'Nome muito longo'),
});

export const signInSchema = z.object({
  email: z.string().email('Email inválido').max(255, 'Email muito longo'),
  password: z.string().min(1, 'Senha obrigatória'),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;

// Budget Area validation
export const budgetAreaSchema = z.object({
  name: shortText,
  percentage: z.number().min(0, 'Porcentagem mínima é 0').max(100, 'Porcentagem máxima é 100'),
  color: colorHex,
  orderIndex: z.number().int().min(0),
});

export type BudgetAreaInput = z.infer<typeof budgetAreaSchema>;

// User Settings validation
export const userSettingsSchema = z.object({
  monthlySalary: z.number().positive('Salário deve ser positivo').max(999999999, 'Valor muito alto').nullable(),
  salaryAutoCalculate: z.boolean(),
});

export type UserSettingsInput = z.infer<typeof userSettingsSchema>;
