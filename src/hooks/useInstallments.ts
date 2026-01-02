import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { startOfMonth, endOfMonth, addMonths, isBefore, isAfter, parseISO, format } from "date-fns";

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
        .select("*, banks!inner(id, name, user_id)")
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

      if (existing) {
        existing.totalAmount += group.totalAmount;
        existing.remainingAmount += group.remainingAmount;
        existing.count += 1;
      } else {
        breakdown.set(group.categoryId, {
          categoryId: group.categoryId,
          categoryName: category?.name || "Sem categoria",
          totalAmount: group.totalAmount,
          remainingAmount: group.remainingAmount,
          count: 1,
          color: `hsl(${Math.random() * 360}, 70%, 50%)`,
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
      // Get the installment transaction
      const { data: installment, error: fetchError } = await supabase
        .from("transactions")
        .select("*")
        .eq("id", installmentId)
        .single();

      if (fetchError) throw fetchError;

      // Update the installment date to anticipation date
      const { error: updateError } = await supabase
        .from("transactions")
        .update({ date: anticipationDate.toISOString() })
        .eq("id", installmentId);

      if (updateError) throw updateError;

      // Create a debit transaction in the selected bank account
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

      // Update all pending installments to the payment date
      const updatePromises = pendingInstallments.map((installment) =>
        supabase
          .from("transactions")
          .update({ date: paymentDate.toISOString() })
          .eq("id", installment.id)
      );

      await Promise.all(updatePromises);

      // Create a single debit transaction for the total amount
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

  return {
    installmentGroups,
    monthlyCommitments,
    categoryBreakdown,
    summary,
    isLoading: isLoadingTransactions,
    anticipateInstallment,
    payOffInstallments,
    banks,
  };
}
