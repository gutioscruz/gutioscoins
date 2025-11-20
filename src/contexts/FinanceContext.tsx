import { createContext, useContext, useState, ReactNode } from "react";
import { Transaction, Category, Bank, Investment, Card, defaultIncomeCategories, defaultExpenseCategories } from "@/types/finance";

interface FinanceContextType {
  transactions: Transaction[];
  categories: Category[];
  banks: Bank[];
  investments: Investment[];
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

  return (
    <FinanceContext.Provider
      value={{
        transactions,
        categories,
        banks,
        investments,
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
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
};
