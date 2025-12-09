import { useMemo } from "react";
import type { BudgetArea, BudgetAreaAllocation, Category, Transaction } from "@/types/finance";

interface UseBudgetAllocationProps {
  transactions: Transaction[];
  budgetAreas: BudgetArea[];
  categories: Category[];
  salary: number;
  selectedMonth: number;
  selectedYear: number;
}

export const useBudgetAllocation = ({
  transactions,
  budgetAreas,
  categories,
  salary,
  selectedMonth,
  selectedYear,
}: UseBudgetAllocationProps) => {
  const allocations = useMemo((): BudgetAreaAllocation[] => {
    return budgetAreas.map((area) => {
      const plannedAmount = (area.percentage / 100) * salary;

      // Get categories for this area
      const areaCategories = categories.filter((c) =>
        area.categoryIds.includes(c.id)
      );

      // Calculate actual spending from transactions in these categories
      const actualAmount = transactions
        .filter((t) => {
          const transDate = new Date(t.date);
          return (
            t.type === "expense" &&
            area.categoryIds.includes(t.categoryId) &&
            transDate.getMonth() === selectedMonth &&
            transDate.getFullYear() === selectedYear
          );
        })
        .reduce((sum, t) => sum + t.amount, 0);

      const variance = actualAmount - plannedAmount;
      const variancePercentage =
        plannedAmount > 0 ? (variance / plannedAmount) * 100 : 0;

      return {
        area,
        plannedAmount,
        actualAmount,
        variance,
        variancePercentage,
        categories: areaCategories,
      };
    });
  }, [budgetAreas, categories, transactions, salary, selectedMonth, selectedYear]);

  const totalPlanned = useMemo(
    () => allocations.reduce((sum, a) => sum + a.plannedAmount, 0),
    [allocations]
  );

  const totalActual = useMemo(
    () => allocations.reduce((sum, a) => sum + a.actualAmount, 0),
    [allocations]
  );

  const totalPercentage = useMemo(
    () => budgetAreas.reduce((sum, a) => sum + a.percentage, 0),
    [budgetAreas]
  );

  return {
    allocations,
    totalPlanned,
    totalActual,
    totalVariance: totalActual - totalPlanned,
    totalPercentage,
    isBalanced: Math.abs(totalPercentage - 100) < 0.01,
  };
};
