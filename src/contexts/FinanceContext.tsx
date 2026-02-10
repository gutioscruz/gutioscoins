import { createContext, useContext, ReactNode } from "react";
import { useTransactions } from "@/hooks/useTransactions";
import { useCategories } from "@/hooks/useCategories";
import { useBanks } from "@/hooks/useBanks";
import { useInvestments } from "@/hooks/useInvestments";
import { useGoals } from "@/hooks/useGoals";
import { useAlerts } from "@/hooks/useAlerts";
import { useLoans } from "@/hooks/useLoans";
import { useRecurringTransactions } from "@/hooks/useRecurringTransactions";
import { useInitializeUserData } from "@/hooks/useInitializeUserData";
import { useCards } from "@/hooks/useCards";
import { Transaction, Category, Bank, Investment, Card, RecurringTransaction, FinancialGoal, Alert, Loan } from "@/types/finance";

interface FinanceContextType {
  // Data
  transactions: Transaction[];
  recurringTransactions: RecurringTransaction[];
  categories: Category[];
  banks: Bank[];
  investments: Investment[];
  goals: FinancialGoal[];
  alerts: Alert[];
  loans: Loan[];
  
  // Loading states
  isLoadingTransactions: boolean;
  isLoadingCategories: boolean;
  isLoadingBanks: boolean;
  isLoadingInvestments: boolean;
  isLoadingGoals: boolean;
  isLoadingAlerts: boolean;
  isLoadingLoans: boolean;
  isLoadingRecurring: boolean;
  
  // Transaction methods
  addTransaction: (transaction: Omit<Transaction, "id">) => void;
  updateTransaction: (id: string, transaction: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  
  // Category methods
  addCategory: (category: Omit<Category, "id">) => void;
  updateCategory: (id: string, category: Omit<Category, "id">) => void;
  deleteCategory: (id: string) => void;
  addSubcategory: (categoryId: string, subcategory: string) => void;
  removeSubcategory: (categoryId: string, subcategory: string) => void;
  
  // Bank methods
  addBank: (bank: Omit<Bank, "id">) => void;
  updateBank: (id: string, bank: Omit<Bank, "id">) => void;
  deleteBank: (id: string) => void;
  addCardToBank: (bankId: string, card: Omit<Card, "id">) => void;
  updateCard: (bankId: string, cardId: string, card: Omit<Card, "id">) => void;
  deleteCard: (bankId: string, cardId: string) => void;
  
  // Investment methods
  addInvestment: (investment: Omit<Investment, "id">) => void;
  updateInvestment: (id: string, investment: Omit<Investment, "id">) => void;
  deleteInvestment: (id: string) => void;
  
  // Recurring transaction methods
  addRecurringTransaction: (transaction: Omit<RecurringTransaction, "id">) => void;
  updateRecurringTransaction: (id: string, transaction: Omit<RecurringTransaction, "id">) => void;
  deleteRecurringTransaction: (id: string) => void;
  toggleRecurringTransaction: (id: string) => void;
  
  // Goal methods
  addGoal: (goal: Omit<FinancialGoal, "id" | "createdAt">) => void;
  updateGoal: (id: string, goal: Omit<FinancialGoal, "id" | "createdAt">) => void;
  deleteGoal: (id: string) => void;
  updateGoalProgress: (id: string, amount: number) => void;
  
  // Alert methods
  markAlertAsRead: (id: string) => void;
  clearAllAlerts: () => void;
  
  // Loan methods
  addLoan: (loan: Omit<Loan, "id" | "payments" | "totalPaid" | "totalInterest">) => void;
  updateLoan: (id: string, loan: Partial<Omit<Loan, "id">>) => void;
  deleteLoan: (id: string) => void;
  payLoanInstallment: (params: { loanId: string; installmentId: string; bankId?: string; discount?: number; createTransaction?: boolean }) => void;
  payLoanInstallmentsAhead: (params: { loanId: string; count: number; bankId?: string; discount?: number; createTransaction?: boolean }) => void;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error("useFinance must be used within a FinanceProvider");
  }
  return context;
};

interface FinanceProviderProps {
  children: ReactNode;
}

export const FinanceProvider = ({ children }: FinanceProviderProps) => {
  // Initialize user data (categories for new users)
  useInitializeUserData();
  
  // Use hooks
  const transactionsHook = useTransactions();
  const categoriesHook = useCategories();
  const banksHook = useBanks();
  const investmentsHook = useInvestments();
  const goalsHook = useGoals();
  const alertsHook = useAlerts();
  const loansHook = useLoans();
  const recurringHook = useRecurringTransactions();
  const cardsHook = useCards();

  // Category helper methods
  const addSubcategory = (categoryId: string, subcategory: string) => {
    const category = categoriesHook.categories.find(c => c.id === categoryId);
    if (category) {
      categoriesHook.updateCategory({
        id: categoryId,
        category: {
          ...category,
          subcategories: [...category.subcategories, subcategory],
        },
      });
    }
  };

  const removeSubcategory = (categoryId: string, subcategory: string) => {
    const category = categoriesHook.categories.find(c => c.id === categoryId);
    if (category) {
      categoriesHook.updateCategory({
        id: categoryId,
        category: {
          ...category,
          subcategories: category.subcategories.filter(s => s !== subcategory),
        },
      });
    }
  };

  // Card management (now fully implemented with Supabase)
  const addCardToBank = (bankId: string, card: Omit<Card, "id">) => {
    cardsHook.addCard({ bankId, card });
  };

  const updateCard = (bankId: string, cardId: string, card: Omit<Card, "id">) => {
    cardsHook.updateCard({ cardId, card });
  };

  const deleteCard = (bankId: string, cardId: string) => {
    cardsHook.deleteCard(cardId);
  };

  // Goal progress update
  const updateGoalProgress = (id: string, amount: number) => {
    const goal = goalsHook.goals.find(g => g.id === id);
    if (goal) {
      goalsHook.updateGoal({
        id,
        goal: {
          ...goal,
          currentAmount: amount,
        },
      });
    }
  };


  const value: FinanceContextType = {
    // Data
    transactions: transactionsHook.transactions,
    recurringTransactions: recurringHook.recurringTransactions,
    categories: categoriesHook.categories,
    banks: banksHook.banks,
    investments: investmentsHook.investments,
    goals: goalsHook.goals,
    alerts: alertsHook.alerts,
    loans: loansHook.loans,
    
    // Loading states
    isLoadingTransactions: transactionsHook.isLoading,
    isLoadingCategories: categoriesHook.isLoading,
    isLoadingBanks: banksHook.isLoading,
    isLoadingInvestments: investmentsHook.isLoading,
    isLoadingGoals: goalsHook.isLoading,
    isLoadingAlerts: alertsHook.isLoading,
    isLoadingLoans: loansHook.isLoading,
    isLoadingRecurring: recurringHook.isLoading,
    
    // Transaction methods
    addTransaction: transactionsHook.addTransaction,
    updateTransaction: (id, transaction) => transactionsHook.updateTransaction({ id, transaction }),
    deleteTransaction: transactionsHook.deleteTransaction,
    
    // Category methods
    addCategory: categoriesHook.addCategory,
    updateCategory: (id, category) => categoriesHook.updateCategory({ id, category }),
    deleteCategory: categoriesHook.deleteCategory,
    addSubcategory,
    removeSubcategory,
    
    // Bank methods
    addBank: banksHook.addBank,
    updateBank: (id, bank) => banksHook.updateBank({ id, bank }),
    deleteBank: banksHook.deleteBank,
    addCardToBank,
    updateCard,
    deleteCard,
    
    // Investment methods
    addInvestment: investmentsHook.addInvestment,
    updateInvestment: (id, investment) => investmentsHook.updateInvestment({ id, investment }),
    deleteInvestment: investmentsHook.deleteInvestment,
    
    // Recurring transaction methods
    addRecurringTransaction: recurringHook.addRecurringTransaction,
    updateRecurringTransaction: (id, transaction) => recurringHook.updateRecurringTransaction({ id, transaction }),
    deleteRecurringTransaction: recurringHook.deleteRecurringTransaction,
    toggleRecurringTransaction: recurringHook.toggleRecurringTransaction,
    
    // Goal methods
    addGoal: goalsHook.addGoal,
    updateGoal: (id, goal) => goalsHook.updateGoal({ id, goal }),
    deleteGoal: goalsHook.deleteGoal,
    updateGoalProgress,
    
    // Alert methods
    markAlertAsRead: alertsHook.markAsRead,
    clearAllAlerts: alertsHook.clearAll,
    
    // Loan methods
    addLoan: loansHook.addLoan,
    updateLoan: (id, loan) => loansHook.updateLoan({ id, loan }),
    deleteLoan: loansHook.deleteLoan,
    payLoanInstallment: loansHook.payLoanInstallment,
    payLoanInstallmentsAhead: loansHook.payLoanInstallmentsAhead,
  };

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
};
