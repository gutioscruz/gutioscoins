import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { startOfMonth, endOfMonth, addMonths, isBefore, isAfter, parseISO, format, differenceInDays } from "date-fns";
import { getCategoryColor } from "@/lib/categoryColors";

export interface InstallmentGroup {
  id: string;
  description: string;
  totalAmount: number;
  installmentAmount: number;
  totalCount: number;
  paidCount: number;
  remainingCount: number;
  remainingAmount: number;
  startDate: Date;
  endDate: Date;
  nextDueDate?: Date;
  daysUntilNextDue?: number;
  categoryId: string;
  categoryName?: string;
  cardId?: string;
  cardName?: string;
  bankId: string;
  bankName?: string;
  installments: Array<{
    id: string;
    date: Date;
    amount: number;
    installmentNumber: number;
    isPaid: boolean;
  }>;
}

export interface MonthlyCommitment {
  month: Date;
  monthLabel: string;
  amount: number;
  count: number;
}

export interface CategoryBreakdown {
  categoryId: string;
  categoryName: string;
  totalAmount: number;
  remainingAmount: number;
  count: number;
  color: string;
}

export function useInstallments() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: transactions, isLoading: isLoadingTransactions } = useQuery({
    queryKey: ["installment-transactions", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user!.id)
        .eq("is_installment", true)
        .eq("type", "expense")
        .order("date", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: categories } = useQuery({
    queryKey: ["categories", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("user_id", user!.id);

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: cards } = useQuery({
    queryKey: ["cards", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cards")
        .select("*, banks!cards_bank_id_fkey!inner(id, name, user_id)")
        .eq("banks.user_id", user!.id);

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: banks } = useQuery({
    queryKey: ["banks", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("banks")
        .select("*")
        .eq("user_id", user!.id);

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const installmentGroups = useMemo<InstallmentGroup[]>(() => {
    if (!transactions) return [];

    const today = new Date();
    const groups = new Map<string, InstallmentGroup>();

    transactions.forEach((tx) => {
      const groupId = tx.parent_transaction_id || tx.id;
      const txDate = parseISO(tx.date);
      const isPaid = isBefore(txDate, today) || txDate.toDateString() === today.toDateString();

      if (!groups.has(groupId)) {
        const category = categories?.find((c) => c.id === tx.category_id);
        const card = cards?.find((c) => c.id === tx.card_id);
        const bank = banks?.find((b) => b.id === tx.bank_id);

        groups.set(groupId, {
          id: groupId,
          description: tx.description,
          totalAmount: 0,
          installmentAmount: tx.amount,
          totalCount: tx.installment_count || 1,
          paidCount: 0,
          remainingCount: 0,
          remainingAmount: 0,
          startDate: txDate,
          endDate: txDate,
          categoryId: tx.category_id,
          categoryName: category?.name,
          cardId: tx.card_id || undefined,
          cardName: card?.name,
          bankId: tx.bank_id,
          bankName: bank?.name,
          installments: [],
        });
      }

      const group = groups.get(groupId)!;
      group.totalAmount += tx.amount;
      group.installments.push({
        id: tx.id,
        date: txDate,
        amount: tx.amount,
        installmentNumber: tx.installment_number || 1,
        isPaid,
      });

      if (isPaid) {
        group.paidCount += 1;
      } else {
        group.remainingCount += 1;
        group.remainingAmount += tx.amount;
        
        if (!group.nextDueDate || isBefore(txDate, group.nextDueDate)) {
          group.nextDueDate = txDate;
          group.daysUntilNextDue = differenceInDays(txDate, today);
        }
      }

      if (isBefore(txDate, group.startDate)) {
        group.startDate = txDate;
      }
      if (isAfter(txDate, group.endDate)) {
        group.endDate = txDate;
      }
    });

    return Array.from(groups.values())
      .filter((g) => g.remainingCount > 0)
      .sort((a, b) => a.endDate.getTime() - b.endDate.getTime());
  }, [transactions, categories, cards, banks]);

  const monthlyCommitments = useMemo<MonthlyCommitment[]>(() => {
    if (!transactions) return [];

    const today = new Date();
    const commitments: MonthlyCommitment[] = [];

    for (let i = 0; i < 12; i++) {
      const monthStart = startOfMonth(addMonths(today, i));
      const monthEnd = endOfMonth(monthStart);

      const monthTransactions = transactions.filter((tx) => {
        const txDate = parseISO(tx.date);
        return !isBefore(txDate, monthStart) && !isAfter(txDate, monthEnd) && isAfter(txDate, today);
      });

      commitments.push({
        month: monthStart,
        monthLabel: format(monthStart, "MMM/yy"),
        amount: monthTransactions.reduce((sum, tx) => sum + tx.amount, 0),
        count: monthTransactions.length,
      });
    }

    return commitments;
  }, [transactions]);

  const categoryBreakdown = useMemo<CategoryBreakdown[]>(() => {
    const breakdown = new Map<string, CategoryBreakdown>();

    installmentGroups.forEach((group) => {
      const existing = breakdown.get(group.categoryId);
      const category = categories?.find((c) => c.id === group.categoryId);
      const categoryName = category?.name || "Sem categoria";

      if (existing) {
        existing.totalAmount += group.totalAmount;
        existing.remainingAmount += group.remainingAmount;
        existing.count += 1;
      } else {
        breakdown.set(group.categoryId, {
          categoryId: group.categoryId,
          categoryName,
          totalAmount: group.totalAmount,
          remainingAmount: group.remainingAmount,
          count: 1,
          color: getCategoryColor(categoryName),
        });
      }
    });

    return Array.from(breakdown.values()).sort((a, b) => b.remainingAmount - a.remainingAmount);
  }, [installmentGroups, categories]);

  const summary = useMemo(() => {
    const activeCount = installmentGroups.length;
    const totalAmount = installmentGroups.reduce((sum, g) => sum + g.totalAmount, 0);
    const remainingAmount = installmentGroups.reduce((sum, g) => sum + g.remainingAmount, 0);
    const paidAmount = totalAmount - remainingAmount;

    return {
      activeCount,
      totalAmount,
      remainingAmount,
      paidAmount,
    };
  }, [installmentGroups]);

  const updateCardUsedAmount = async (cardId: string, amountToDecrease: number) => {
    const { data: card, error: fetchError } = await supabase
      .from("cards")
      .select("used_amount")
      .eq("id", cardId)
      .single();

    if (fetchError) throw fetchError;

    if (card) {
      const newUsedAmount = Math.max(0, Number(card.used_amount) - amountToDecrease);
      const { error: updateError } = await supabase
        .from("cards")
        .update({ used_amount: newUsedAmount })
        .eq("id", cardId);

      if (updateError) throw updateError;
    }
  };

  const anticipateInstallment = useMutation({
    mutationFn: async ({
      installmentId,
      bankId,
      anticipationDate,
    }: {
      installmentId: string;
      bankId: string;
      anticipationDate: Date;
    }) => {
      const { data: installment, error: fetchError } = await supabase
        .from("transactions")
        .select("*")
        .eq("id", installmentId)
        .single();

      if (fetchError) throw fetchError;

      const { error: updateError } = await supabase
        .from("transactions")
        .update({ date: anticipationDate.toISOString() })
        .eq("id", installmentId);

      if (updateError) throw updateError;

      if (installment.card_id) {
        await updateCardUsedAmount(installment.card_id, installment.amount);
      }

      const { error: debitError } = await supabase.from("transactions").insert({
        user_id: user!.id,
        description: `Antecipação: ${installment.description} (${installment.installment_number}/${installment.installment_count})`,
        amount: installment.amount,
        type: "expense",
        category_id: installment.category_id,
        bank_id: bankId,
        date: anticipationDate.toISOString(),
        is_installment: false,
      });

      if (debitError) throw debitError;

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["installment-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["cards"] });
      queryClient.invalidateQueries({ queryKey: ["banks"] });
      toast.success("Parcela antecipada com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao antecipar parcela: ${error.message}`);
    },
  });

  const anticipateMultipleInstallments = useMutation({
    mutationFn: async ({
      installmentIds,
      bankId,
      anticipationDate,
    }: {
      installmentIds: string[];
      bankId: string;
      anticipationDate: Date;
    }) => {
      let totalAmount = 0;
      let cardId: string | null = null;
      let categoryId: string | null = null;
      let description = "";

      const { data: installments, error: fetchError } = await supabase
        .from("transactions")
        .select("*")
        .in("id", installmentIds);

      if (fetchError) throw fetchError;
      if (!installments || installments.length === 0) throw new Error("Parcelas não encontradas");

      const updatePromises = installments.map((installment) => {
        totalAmount += installment.amount;
        cardId = installment.card_id;
        categoryId = installment.category_id;
        description = installment.description;

        return supabase
          .from("transactions")
          .update({ date: anticipationDate.toISOString() })
          .eq("id", installment.id);
      });

      await Promise.all(updatePromises);

      if (cardId) {
        await updateCardUsedAmount(cardId, totalAmount);
      }

      const { error: debitError } = await supabase.from("transactions").insert({
        user_id: user!.id,
        description: `Antecipação: ${description} (${installments.length} parcelas)`,
        amount: totalAmount,
        type: "expense",
        category_id: categoryId,
        bank_id: bankId,
        date: anticipationDate.toISOString(),
        is_installment: false,
      });

      if (debitError) throw debitError;

      return { success: true, count: installments.length, total: totalAmount };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["installment-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["cards"] });
      queryClient.invalidateQueries({ queryKey: ["banks"] });
      toast.success(`${data.count} parcelas antecipadas com sucesso!`);
    },
    onError: (error) => {
      toast.error(`Erro ao antecipar parcelas: ${error.message}`);
    },
  });

  const payOffInstallments = useMutation({
    mutationFn: async ({
      groupId,
      bankId,
      paymentDate,
    }: {
      groupId: string;
      bankId: string;
      paymentDate: Date;
    }) => {
      const group = installmentGroups.find((g) => g.id === groupId);
      if (!group) throw new Error("Parcelamento não encontrado");

      const pendingInstallments = group.installments.filter((i) => !i.isPaid);

      const updatePromises = pendingInstallments.map((installment) =>
        supabase
          .from("transactions")
          .update({ date: paymentDate.toISOString() })
          .eq("id", installment.id)
      );

      await Promise.all(updatePromises);

      if (group.cardId) {
        await updateCardUsedAmount(group.cardId, group.remainingAmount);
      }

      const { error: debitError } = await supabase.from("transactions").insert({
        user_id: user!.id,
        description: `Quitação: ${group.description} (${pendingInstallments.length} parcelas)`,
        amount: group.remainingAmount,
        type: "expense",
        category_id: group.categoryId,
        bank_id: bankId,
        date: paymentDate.toISOString(),
        is_installment: false,
      });

      if (debitError) throw debitError;

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["installment-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["cards"] });
      queryClient.invalidateQueries({ queryKey: ["banks"] });
      toast.success("Parcelamento quitado com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao quitar parcelamento: ${error.message}`);
    },
  });

  const markInstallmentsPaid = useMutation({
    mutationFn: async ({
      installmentIds,
      paymentDate,
    }: {
      installmentIds: string[];
      paymentDate: Date;
    }) => {
      const updatePromises = installmentIds.map((id) =>
        supabase
          .from("transactions")
          .update({ date: paymentDate.toISOString() })
          .eq("id", id)
      );

      await Promise.all(updatePromises);

      return { count: installmentIds.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["installment-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success(`${data.count} parcela(s) marcada(s) como paga(s)!`);
    },
    onError: (error) => {
      toast.error(`Erro ao marcar parcelas: ${error.message}`);
    },
  });

  const updateInstallmentGroup = useMutation({
    mutationFn: async ({
      groupId,
      description,
      categoryId,
      subcategory,
    }: {
      groupId: string;
      description: string;
      categoryId: string;
      subcategory?: string;
    }) => {
      const group = installmentGroups.find((g) => g.id === groupId);
      if (!group) throw new Error("Parcelamento não encontrado");

      const ids = group.installments.map((i) => i.id);

      const { error } = await supabase
        .from("transactions")
        .update({
          description,
          category_id: categoryId,
          subcategory: subcategory || null,
        })
        .in("id", ids);

      if (error) throw error;
      return { count: ids.length };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["installment-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Parcelamento atualizado com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar parcelamento: ${error.message}`);
    },
  });

  return {
    installmentGroups,
    monthlyCommitments,
    categoryBreakdown,
    summary,
    isLoading: isLoadingTransactions,
    anticipateInstallment,
    anticipateMultipleInstallments,
    payOffInstallments,
    markInstallmentsPaid,
    updateInstallmentGroup,
    banks,
    categories,
    cards,
  };
}
