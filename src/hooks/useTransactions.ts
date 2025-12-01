import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Transaction } from '@/types/finance';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { transactionSchema } from '@/lib/validations';

export const useTransactions = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: transactions = [], isLoading, error } = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      
      return data.map(t => ({
        id: t.id,
        description: t.description,
        amount: Number(t.amount),
        type: t.type as 'income' | 'expense',
        categoryId: t.category_id,
        subcategory: t.subcategory || undefined,
        bankId: t.bank_id,
        cardId: t.card_id || undefined,
        date: new Date(t.date),
        recurringTransactionId: t.recurring_transaction_id || undefined,
        isInstallment: t.is_installment || false,
        installmentCount: t.installment_count || undefined,
        installmentNumber: t.installment_number || 1,
        parentTransactionId: t.parent_transaction_id || undefined,
      })) as Transaction[];
    },
    enabled: !!user,
  });

  const addTransaction = useMutation({
    mutationFn: async (transaction: Omit<Transaction, 'id'>) => {
      if (!user) throw new Error('User not authenticated');

      // Validate input
      const validated = transactionSchema.parse({
        description: transaction.description,
        amount: transaction.amount,
        type: transaction.type,
        date: new Date(transaction.date),
        categoryId: transaction.categoryId,
        bankId: transaction.bankId,
        subcategory: transaction.subcategory,
        isInstallment: transaction.isInstallment,
        installmentCount: transaction.installmentCount,
        installmentNumber: transaction.installmentNumber,
        parentTransactionId: transaction.parentTransactionId,
      });

      // If it's an installment, create all installments
      if (validated.isInstallment && validated.installmentCount && validated.installmentCount > 1) {
        const installments = [];
        const baseDate = new Date(validated.date);
        
        for (let i = 1; i <= validated.installmentCount; i++) {
          const installmentDate = new Date(baseDate);
          installmentDate.setMonth(baseDate.getMonth() + (i - 1));
          
          installments.push({
            user_id: user.id,
            description: `${validated.description} (${i}/${validated.installmentCount})`,
            amount: validated.amount,
            type: validated.type,
            category_id: validated.categoryId,
            subcategory: validated.subcategory,
            bank_id: validated.bankId,
            card_id: transaction.cardId,
            date: installmentDate.toISOString().split('T')[0] + 'T00:00:00.000Z',
            is_installment: true,
            installment_count: validated.installmentCount,
            installment_number: i,
            parent_transaction_id: i === 1 ? null : undefined, // Will be updated after first insert
          });
        }

        // Insert first installment
        const { data: firstInstallment, error: firstError } = await supabase
          .from('transactions')
          .insert(installments[0])
          .select()
          .single();

        if (firstError) throw firstError;

        // Update remaining installments with parent_transaction_id
        const remainingInstallments = installments.slice(1).map(inst => ({
          ...inst,
          parent_transaction_id: firstInstallment.id,
        }));

        if (remainingInstallments.length > 0) {
          const { error: remainingError } = await supabase
            .from('transactions')
            .insert(remainingInstallments);

          if (remainingError) throw remainingError;
        }

        return firstInstallment;
      }

      // Regular transaction
      const { data, error } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          description: validated.description,
          amount: validated.amount,
          type: validated.type,
          category_id: validated.categoryId,
          subcategory: validated.subcategory,
          bank_id: validated.bankId,
          card_id: transaction.cardId,
          date: validated.date.toISOString().split('T')[0] + 'T00:00:00.000Z',
          recurring_transaction_id: transaction.recurringTransactionId,
          is_installment: validated.isInstallment,
          installment_count: validated.installmentCount,
          installment_number: validated.installmentNumber,
          parent_transaction_id: validated.parentTransactionId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Transação adicionada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(`Erro ao adicionar transação: ${error.message}`);
    },
  });

  const updateTransaction = useMutation({
    mutationFn: async ({ id, transaction }: { id: string; transaction: Partial<Transaction> }) => {
      // Validate if we have all required fields for full validation
      if (transaction.description && transaction.amount && transaction.type && transaction.date && transaction.categoryId && transaction.bankId) {
        const validated = transactionSchema.parse({
          description: transaction.description,
          amount: transaction.amount,
          type: transaction.type,
          date: new Date(transaction.date),
          categoryId: transaction.categoryId,
          bankId: transaction.bankId,
          subcategory: transaction.subcategory,
        });

        const { data, error } = await supabase
          .from('transactions')
          .update({
            description: validated.description,
            amount: validated.amount,
            type: validated.type,
            category_id: validated.categoryId,
            subcategory: validated.subcategory,
            bank_id: validated.bankId,
            card_id: transaction.cardId,
            date: validated.date.toISOString().split('T')[0] + 'T00:00:00.000Z',
          })
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        return data;
      }

      // Partial update without full validation
      const { data, error } = await supabase
        .from('transactions')
        .update({
          description: transaction.description,
          amount: transaction.amount,
          type: transaction.type,
          category_id: transaction.categoryId,
          subcategory: transaction.subcategory,
          bank_id: transaction.bankId,
          card_id: transaction.cardId,
          date: transaction.date?.toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Transação atualizada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(`Erro ao atualizar transação: ${error.message}`);
    },
  });

  const deleteTransaction = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Transação excluída com sucesso!');
    },
    onError: (error: any) => {
      toast.error(`Erro ao excluir transação: ${error.message}`);
    },
  });

  return {
    transactions,
    isLoading,
    error,
    addTransaction: addTransaction.mutate,
    updateTransaction: updateTransaction.mutate,
    deleteTransaction: deleteTransaction.mutate,
  };
};
