import { useMemo } from "react";
import { addMonths, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useTransactions } from "@/hooks/useTransactions";
import { useRecurringTransactions } from "@/hooks/useRecurringTransactions";
import { useInstallments } from "@/hooks/useInstallments";
import { useBudgetAreas } from "@/hooks/useBudgetAreas";
import { WishlistItem } from "@/hooks/useWishlist";

export interface WishlistProjection {
  canBuyNow: boolean;
  monthsToSave: number;
  monthlySavingsNeeded: number;
  suggestedDate: Date;
  freeBudgetMonthly: number;
  categoryBudgetRemaining: number | null;
  tips: string[];
}

export const useWishlistProjection = (item: WishlistItem): WishlistProjection => {
  const { settings } = useUserSettings();
  const { transactions } = useTransactions({});
  const { recurringTransactions } = useRecurringTransactions();
  const { monthlyCommitments } = useInstallments();
  const { budgetAreas } = useBudgetAreas();

  return useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Get monthly salary
    const monthlySalary = settings?.monthlySalary || 0;

    // Calculate average monthly expenses from recurring transactions
    const monthlyRecurringExpenses = recurringTransactions
      .filter(rt => rt.type === 'expense' && rt.isActive)
      .reduce((sum, rt) => sum + rt.amount, 0);

    // Calculate average monthly installment commitments from monthlyCommitments
    const avgMonthlyInstallments = monthlyCommitments.length > 0
      ? monthlyCommitments.slice(0, 6).reduce((sum, mc) => sum + mc.amount, 0) / Math.min(6, monthlyCommitments.length)
      : 0;

    // Calculate average monthly expenses from last 3 months
    const threeMonthsAgo = new Date(currentYear, currentMonth - 3, 1);
    const recentExpenses = transactions.filter(t => {
      const date = new Date(t.date);
      return t.type === 'expense' && date >= threeMonthsAgo;
    });
    const averageMonthlyExpenses = recentExpenses.length > 0
      ? recentExpenses.reduce((sum, t) => sum + t.amount, 0) / 3
      : monthlyRecurringExpenses;

    // Calculate free budget monthly
    const freeBudgetMonthly = Math.max(0, monthlySalary - averageMonthlyExpenses - avgMonthlyInstallments);

    // Calculate category budget remaining (if item has category)
    let categoryBudgetRemaining: number | null = null;
    if (item.categoryId) {
      const categoryArea = budgetAreas.find(area => 
        area.categoryIds?.includes(item.categoryId!)
      );
      if (categoryArea && monthlySalary > 0) {
        const categoryBudget = (categoryArea.percentage / 100) * monthlySalary;
        const categoryExpenses = recentExpenses
          .filter(t => t.categoryId === item.categoryId)
          .reduce((sum, t) => sum + t.amount, 0) / 3;
        categoryBudgetRemaining = Math.max(0, categoryBudget - categoryExpenses);
      }
    }

    // Calculate months to save
    const savingsPerMonth = categoryBudgetRemaining !== null 
      ? Math.min(freeBudgetMonthly, categoryBudgetRemaining) 
      : freeBudgetMonthly;
    
    const canBuyNow = savingsPerMonth >= item.price || freeBudgetMonthly >= item.price;
    const monthsToSave = savingsPerMonth > 0 
      ? Math.ceil(item.price / savingsPerMonth) 
      : Infinity;
    
    const suggestedDate = canBuyNow 
      ? now 
      : addMonths(now, monthsToSave);

    // Generate tips
    const tips: string[] = [];
    
    if (canBuyNow) {
      tips.push("Você pode comprar este item agora com seu orçamento disponível!");
    } else if (monthsToSave !== Infinity) {
      tips.push(
        `Economizando ${formatCurrency(savingsPerMonth)}/mês, você pode comprar em ${format(suggestedDate, "MMMM 'de' yyyy", { locale: ptBR })}`
      );
    }

    if (monthlySalary === 0) {
      tips.push("Configure seu salário mensal em Orçamento para projeções mais precisas");
    }

    if (item.priority === 'high' && monthsToSave > 3) {
      tips.push("Item de alta prioridade - considere reduzir gastos em outras áreas");
    }

    if (categoryBudgetRemaining !== null && categoryBudgetRemaining < savingsPerMonth) {
      tips.push(`Seu orçamento para esta categoria está limitado. Considere aumentar a alocação.`);
    }

    return {
      canBuyNow,
      monthsToSave: monthsToSave === Infinity ? 0 : monthsToSave,
      monthlySavingsNeeded: savingsPerMonth,
      suggestedDate,
      freeBudgetMonthly,
      categoryBudgetRemaining,
      tips,
    };
  }, [item, settings, transactions, recurringTransactions, monthlyCommitments, budgetAreas]);
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};
