import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { Transaction, Category, Bank, Investment, Card, RecurringTransaction, FinancialGoal, Alert, Loan, LoanPayment, defaultIncomeCategories, defaultExpenseCategories } from "@/types/finance";

interface FinanceContextType {
  transactions: Transaction[];
  recurringTransactions: RecurringTransaction[];
  categories: Category[];
  banks: Bank[];
  investments: Investment[];
  goals: FinancialGoal[];
  alerts: Alert[];
  loans: Loan[];
  addTransaction: (transaction: Omit<Transaction, "id">) => void;
  addCategory: (category: Omit<Category, "id">) => void;
  updateCategory: (id: string, category: Omit<Category, "id">) => void;
  deleteCategory: (id: string) => void;
  addSubcategory: (categoryId: string, subcategory: string) => void;
  removeSubcategory: (categoryId: string, subcategory: string) => void;
  addBank: (bank: Omit<Bank, "id">) => void;
  updateBank: (id: string, bank: Omit<Bank, "id">) => void;
  deleteBank: (id: string) => void;
  addCardToBank: (bankId: string, card: Omit<Card, "id">) => void;
  updateCard: (bankId: string, cardId: string, card: Omit<Card, "id">) => void;
  deleteCard: (bankId: string, cardId: string) => void;
  addInvestment: (investment: Omit<Investment, "id">) => void;
  updateInvestment: (id: string, investment: Omit<Investment, "id">) => void;
  deleteInvestment: (id: string) => void;
  addRecurringTransaction: (transaction: Omit<RecurringTransaction, "id">) => void;
  updateRecurringTransaction: (id: string, transaction: Omit<RecurringTransaction, "id">) => void;
  deleteRecurringTransaction: (id: string) => void;
  toggleRecurringTransaction: (id: string) => void;
  addGoal: (goal: Omit<FinancialGoal, "id" | "createdAt">) => void;
  updateGoal: (id: string, goal: Omit<FinancialGoal, "id" | "createdAt">) => void;
  deleteGoal: (id: string) => void;
  updateGoalProgress: (id: string, amount: number) => void;
  markAlertAsRead: (id: string) => void;
  clearAllAlerts: () => void;
  addLoan: (loan: Omit<Loan, "id" | "payments" | "totalPaid" | "totalInterest">) => void;
  updateLoan: (id: string, loan: Partial<Omit<Loan, "id">>) => void;
  deleteLoan: (id: string) => void;
  payLoanInstallment: (loanId: string, installmentNumber: number, paidDate?: Date) => void;
  payLoanInstallmentsAhead: (loanId: string, numberOfInstallments: number) => void;
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
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([
    {
      id: "r1",
      description: "Salário",
      amount: 5000,
      type: "income",
      categoryId: "1",
      subcategory: "Salário Base",
      bankId: "1",
      frequency: "monthly",
      startDate: new Date(2024, 0, 5),
      isActive: true,
      lastGenerated: new Date(2025, 10, 5),
    },
    {
      id: "r2",
      description: "Aluguel",
      amount: 1500,
      type: "expense",
      categoryId: "7",
      subcategory: "Aluguel",
      bankId: "1",
      frequency: "monthly",
      startDate: new Date(2024, 0, 10),
      isActive: true,
      lastGenerated: new Date(2025, 10, 10),
    },
  ]);
  const [categories, setCategories] = useState<Category[]>([
    ...defaultIncomeCategories,
    ...defaultExpenseCategories,
  ]);
  const [banks, setBanks] = useState<Bank[]>([
    { id: "1", name: "Nubank", type: "checking", balance: 5420.50, color: "#8B5CF6", cards: [] },
    { id: "2", name: "Inter", type: "savings", balance: 12000.00, color: "#FF6B00", cards: [] },
    { 
      id: "3", 
      name: "Itaú", 
      type: "credit", 
      limit: 8000.00, 
      balance: 2340.00, 
      color: "#EC7000",
      cards: [
        { id: "c1", name: "Cartão Principal", limit: 8000, used: 2340, color: "#EC7000" }
      ]
    },
  ]);
  const [investments, setInvestments] = useState<Investment[]>([
    { id: "i1", name: "Tesouro Selic", type: "fixed-income", amount: 15000, profitability: 12.5, color: "#10b981" },
    { id: "i2", name: "Ações ITSA4", type: "stocks", amount: 8500, profitability: 8.2, color: "#3b82f6" },
  ]);
  const [goals, setGoals] = useState<FinancialGoal[]>([
    {
      id: "g1",
      name: "Reserva de Emergência",
      description: "6 meses de despesas",
      type: "emergency-fund",
      targetAmount: 30000,
      currentAmount: 12000,
      deadline: new Date(2026, 11, 31),
      status: "active",
      createdAt: new Date(2025, 0, 1),
    },
    {
      id: "g2",
      name: "Viagem para Europa",
      description: "Férias de verão",
      type: "savings",
      targetAmount: 15000,
      currentAmount: 5000,
      deadline: new Date(2026, 5, 30),
      status: "active",
      createdAt: new Date(2025, 0, 15),
    },
  ]);
  const [alerts, setAlerts] = useState<Alert[]>([
    {
      id: "a1",
      type: "warning",
      title: "Gastos acima da média",
      message: "Seus gastos com Alimentação estão 25% acima da média dos últimos 3 meses",
      createdAt: new Date(),
      read: false,
    },
    {
      id: "a2",
      type: "success",
      title: "Meta atingida!",
      message: "Você atingiu 40% da sua meta 'Reserva de Emergência'. Continue assim!",
      createdAt: new Date(),
      read: false,
    },
  ]);
  const [loans, setLoans] = useState<Loan[]>([]);

  // Gerar transações recorrentes automaticamente
  useEffect(() => {
    const generateRecurringTransactions = () => {
      const now = new Date();
      const newTransactions: Transaction[] = [];

      recurringTransactions.forEach((recurring) => {
        if (!recurring.isActive) return;
        
        const lastGen = recurring.lastGenerated || recurring.startDate;
        let nextDate = new Date(lastGen);
        
        // Calcular próxima data baseada na frequência
        switch (recurring.frequency) {
          case "daily":
            nextDate.setDate(nextDate.getDate() + 1);
            break;
          case "weekly":
            nextDate.setDate(nextDate.getDate() + 7);
            break;
          case "monthly":
            nextDate.setMonth(nextDate.getMonth() + 1);
            break;
          case "yearly":
            nextDate.setFullYear(nextDate.getFullYear() + 1);
            break;
        }

        // Se a próxima data é hoje ou passou, gerar transação
        if (nextDate <= now && (!recurring.endDate || nextDate <= recurring.endDate)) {
          const newTransaction: Transaction = {
            id: `${recurring.id}-${Date.now()}`,
            description: recurring.description,
            amount: recurring.amount,
            type: recurring.type,
            categoryId: recurring.categoryId,
            subcategory: recurring.subcategory,
            bankId: recurring.bankId,
            date: nextDate,
            recurringTransactionId: recurring.id,
          };
          
          newTransactions.push(newTransaction);

          // Atualizar lastGenerated
          setRecurringTransactions(prev => 
            prev.map(rt => 
              rt.id === recurring.id 
                ? { ...rt, lastGenerated: nextDate }
                : rt
            )
          );
        }
      });

      if (newTransactions.length > 0) {
        setTransactions(prev => [...newTransactions, ...prev]);
      }
    };

    generateRecurringTransactions();
    const interval = setInterval(generateRecurringTransactions, 1000 * 60 * 60); // Check every hour
    
    return () => clearInterval(interval);
  }, [recurringTransactions]);

  const addTransaction = (transaction: Omit<Transaction, "id">) => {
    const newTransaction: Transaction = {
      ...transaction,
      id: Date.now().toString(),
    };
    setTransactions([newTransaction, ...transactions]);
  };

  const addCategory = (category: Omit<Category, "id">) => {
    const newCategory: Category = {
      ...category,
      id: Date.now().toString(),
    };
    setCategories([...categories, newCategory]);
  };

  const updateCategory = (id: string, category: Omit<Category, "id">) => {
    setCategories(categories.map(cat => 
      cat.id === id ? { ...category, id } : cat
    ));
  };

  const deleteCategory = (id: string) => {
    setCategories(categories.filter(cat => cat.id !== id));
  };

  const addSubcategory = (categoryId: string, subcategory: string) => {
    setCategories(categories.map(cat =>
      cat.id === categoryId
        ? { ...cat, subcategories: [...cat.subcategories, subcategory] }
        : cat
    ));
  };

  const removeSubcategory = (categoryId: string, subcategory: string) => {
    setCategories(categories.map(cat =>
      cat.id === categoryId
        ? { ...cat, subcategories: cat.subcategories.filter(s => s !== subcategory) }
        : cat
    ));
  };

  const addBank = (bank: Omit<Bank, "id">) => {
    const newBank: Bank = {
      ...bank,
      id: Date.now().toString(),
    };
    setBanks([...banks, newBank]);
  };

  const updateBank = (id: string, bank: Omit<Bank, "id">) => {
    setBanks(banks.map(b => 
      b.id === id ? { ...bank, id } : b
    ));
  };

  const deleteBank = (id: string) => {
    setBanks(banks.filter(b => b.id !== id));
  };

  const addCardToBank = (bankId: string, card: Omit<Card, "id">) => {
    const newCard: Card = {
      ...card,
      id: Date.now().toString(),
    };
    setBanks(banks.map(b => 
      b.id === bankId 
        ? { ...b, cards: [...(b.cards || []), newCard] }
        : b
    ));
  };

  const updateCard = (bankId: string, cardId: string, card: Omit<Card, "id">) => {
    setBanks(banks.map(b => 
      b.id === bankId 
        ? { 
            ...b, 
            cards: (b.cards || []).map(c => 
              c.id === cardId ? { ...card, id: cardId } : c
            )
          }
        : b
    ));
  };

  const deleteCard = (bankId: string, cardId: string) => {
    setBanks(banks.map(b => 
      b.id === bankId 
        ? { ...b, cards: (b.cards || []).filter(c => c.id !== cardId) }
        : b
    ));
  };

  const addInvestment = (investment: Omit<Investment, "id">) => {
    const newInvestment: Investment = {
      ...investment,
      id: Date.now().toString(),
    };
    setInvestments([...investments, newInvestment]);
  };

  const updateInvestment = (id: string, investment: Omit<Investment, "id">) => {
    setInvestments(investments.map(inv => 
      inv.id === id ? { ...investment, id } : inv
    ));
  };

  const deleteInvestment = (id: string) => {
    setInvestments(investments.filter(inv => inv.id !== id));
  };

  const addRecurringTransaction = (transaction: Omit<RecurringTransaction, "id">) => {
    const newRecurring: RecurringTransaction = {
      ...transaction,
      id: Date.now().toString(),
    };
    setRecurringTransactions([...recurringTransactions, newRecurring]);
  };

  const updateRecurringTransaction = (id: string, transaction: Omit<RecurringTransaction, "id">) => {
    setRecurringTransactions(recurringTransactions.map(rt => 
      rt.id === id ? { ...transaction, id } : rt
    ));
  };

  const deleteRecurringTransaction = (id: string) => {
    setRecurringTransactions(recurringTransactions.filter(rt => rt.id !== id));
  };

  const toggleRecurringTransaction = (id: string) => {
    setRecurringTransactions(recurringTransactions.map(rt =>
      rt.id === id ? { ...rt, isActive: !rt.isActive } : rt
    ));
  };

  const addGoal = (goal: Omit<FinancialGoal, "id" | "createdAt">) => {
    const newGoal: FinancialGoal = {
      ...goal,
      id: Date.now().toString(),
      createdAt: new Date(),
    };
    setGoals([...goals, newGoal]);
  };

  const updateGoal = (id: string, goal: Omit<FinancialGoal, "id" | "createdAt">) => {
    setGoals(goals.map(g => {
      if (g.id === id) {
        const updated = { ...goal, id, createdAt: g.createdAt };
        // Check if goal was just completed
        if (updated.currentAmount >= updated.targetAmount && g.status === "active") {
          updated.status = "completed";
          // Add success alert
          const newAlert: Alert = {
            id: `alert-${Date.now()}`,
            type: "success",
            title: "Meta Concluída! 🎉",
            message: `Parabéns! Você atingiu a meta "${updated.name}"!`,
            createdAt: new Date(),
            read: false,
          };
          setAlerts(prev => [newAlert, ...prev]);
        }
        return updated;
      }
      return g;
    }));
  };

  const deleteGoal = (id: string) => {
    setGoals(goals.filter(g => g.id !== id));
  };

  const updateGoalProgress = (id: string, amount: number) => {
    setGoals(goals.map(g => 
      g.id === id ? { ...g, currentAmount: amount } : g
    ));
  };

  const markAlertAsRead = (id: string) => {
    setAlerts(alerts.map(a => a.id === id ? { ...a, read: true } : a));
  };

  const clearAllAlerts = () => {
    setAlerts([]);
  };

  const calculateLoanPayments = (
    principal: number,
    interestRate: number,
    installments: number,
    paymentFrequency: string,
    startDate: Date
  ): LoanPayment[] => {
    const periodsPerYear = paymentFrequency === "monthly" ? 12 : paymentFrequency === "biweekly" ? 26 : 52;
    const periodRate = (interestRate / 100) / periodsPerYear;
    
    const installmentAmount = principal * (periodRate * Math.pow(1 + periodRate, installments)) / (Math.pow(1 + periodRate, installments) - 1);
    
    const payments: LoanPayment[] = [];
    let remainingPrincipal = principal;
    
    for (let i = 1; i <= installments; i++) {
      const interestPayment = remainingPrincipal * periodRate;
      const principalPayment = installmentAmount - interestPayment;
      
      const dueDate = new Date(startDate);
      if (paymentFrequency === "monthly") {
        dueDate.setMonth(dueDate.getMonth() + i);
      } else if (paymentFrequency === "biweekly") {
        dueDate.setDate(dueDate.getDate() + (i * 14));
      } else {
        dueDate.setDate(dueDate.getDate() + (i * 7));
      }
      
      payments.push({
        id: `payment-${i}`,
        installmentNumber: i,
        dueDate,
        amount: installmentAmount,
        principal: principalPayment,
        interest: interestPayment,
        paid: false,
      });
      
      remainingPrincipal -= principalPayment;
    }
    
    return payments;
  };

  const addLoan = (loan: Omit<Loan, "id" | "payments" | "totalPaid" | "totalInterest">) => {
    const payments = calculateLoanPayments(
      loan.principal,
      loan.interestRate,
      loan.installments,
      loan.paymentFrequency,
      loan.startDate
    );
    
    const totalInterest = payments.reduce((sum, p) => sum + p.interest, 0);
    
    const newLoan: Loan = {
      ...loan,
      id: Date.now().toString(),
      payments,
      totalPaid: 0,
      totalInterest,
      status: "active",
    };
    
    setLoans([...loans, newLoan]);
  };

  const updateLoan = (id: string, loanUpdate: Partial<Omit<Loan, "id">>) => {
    setLoans(loans.map(l => 
      l.id === id ? { ...l, ...loanUpdate } : l
    ));
  };

  const deleteLoan = (id: string) => {
    setLoans(loans.filter(l => l.id !== id));
  };

  const payLoanInstallment = (loanId: string, installmentNumber: number, paidDate?: Date) => {
    setLoans(loans.map(loan => {
      if (loan.id !== loanId) return loan;
      
      const updatedPayments = loan.payments.map(p => 
        p.installmentNumber === installmentNumber 
          ? { ...p, paid: true, paidDate: paidDate || new Date() }
          : p
      );
      
      const paidPayment = updatedPayments.find(p => p.installmentNumber === installmentNumber);
      const totalPaid = loan.totalPaid + (paidPayment?.amount || 0);
      
      const allPaid = updatedPayments.every(p => p.paid);
      
      return {
        ...loan,
        payments: updatedPayments,
        totalPaid,
        status: allPaid ? "paid" : "active",
      };
    }));
  };

  const payLoanInstallmentsAhead = (loanId: string, numberOfInstallments: number) => {
    setLoans(loans.map(loan => {
      if (loan.id !== loanId) return loan;
      
      const unpaidPayments = loan.payments.filter(p => !p.paid);
      const paymentsToPay = unpaidPayments.slice(0, numberOfInstallments);
      
      const updatedPayments = loan.payments.map(p => {
        const shouldPay = paymentsToPay.some(ptp => ptp.installmentNumber === p.installmentNumber);
        return shouldPay ? { ...p, paid: true, paidDate: new Date() } : p;
      });
      
      const totalPaid = loan.totalPaid + paymentsToPay.reduce((sum, p) => sum + p.amount, 0);
      const allPaid = updatedPayments.every(p => p.paid);
      
      return {
        ...loan,
        payments: updatedPayments,
        totalPaid,
        status: allPaid ? "paid" : "active",
      };
    }));
  };

  return (
    <FinanceContext.Provider
      value={{
        transactions,
        recurringTransactions,
        categories,
        banks,
        investments,
        goals,
        alerts,
        loans,
        addTransaction,
        addCategory,
        updateCategory,
        deleteCategory,
        addSubcategory,
        removeSubcategory,
        addBank,
        updateBank,
        deleteBank,
        addCardToBank,
        updateCard,
        deleteCard,
        addInvestment,
        updateInvestment,
        deleteInvestment,
        addRecurringTransaction,
        updateRecurringTransaction,
        deleteRecurringTransaction,
        toggleRecurringTransaction,
        addGoal,
        updateGoal,
        deleteGoal,
        updateGoalProgress,
        markAlertAsRead,
        clearAllAlerts,
        addLoan,
        updateLoan,
        deleteLoan,
        payLoanInstallment,
        payLoanInstallmentsAhead,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
};
