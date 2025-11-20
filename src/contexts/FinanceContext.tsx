import { createContext, useContext, useState, ReactNode } from "react";
import { Transaction, Category, Bank, defaultIncomeCategories, defaultExpenseCategories } from "@/types/finance";

interface FinanceContextType {
  transactions: Transaction[];
  categories: Category[];
  banks: Bank[];
  addTransaction: (transaction: Omit<Transaction, "id">) => void;
  addCategory: (category: Omit<Category, "id">) => void;
  updateCategory: (id: string, category: Omit<Category, "id">) => void;
  deleteCategory: (id: string) => void;
  addSubcategory: (categoryId: string, subcategory: string) => void;
  removeSubcategory: (categoryId: string, subcategory: string) => void;
  addBank: (bank: Omit<Bank, "id">) => void;
  updateBank: (id: string, bank: Omit<Bank, "id">) => void;
  deleteBank: (id: string) => void;
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
    { id: "1", name: "Nubank", type: "checking", balance: 5420.50, color: "#8B5CF6" },
    { id: "2", name: "Inter", type: "savings", balance: 12000.00, color: "#FF6B00" },
    { id: "3", name: "Itaú", type: "credit", limit: 8000.00, balance: 2340.00, color: "#EC7000" },
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

  return (
    <FinanceContext.Provider
      value={{
        transactions,
        categories,
        banks,
        addTransaction,
        addCategory,
        updateCategory,
        deleteCategory,
        addSubcategory,
        removeSubcategory,
        addBank,
        updateBank,
        deleteBank,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
};
