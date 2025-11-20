import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RecurringTransaction } from '@/types/finance';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export const useRecurringTransactions = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: recurringTransactions = [], isLoading, error } = useQuery({
    queryKey: ['recurringTransactions'],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('recurring_transactions')
        .select('*')
        .order('start_date', { ascending: false });

      if (error) throw error;
      
      return data.map(rt => ({
        id: rt.id,
        description: rt.description,
        amount: Number(rt.amount),
        type: rt.type as 'income' | 'expense',
        categoryId: rt.category_id,
        subcategory: rt.subcategory || undefined,
        bankId: rt.bank_id,
        frequency: rt.frequency as RecurringTransaction['frequency'],
        startDate: new Date(rt.start_date),
        endDate: rt.end_date ? new Date(rt.end_date) : undefined,
        isActive: rt.is_active,
        lastGenerated: rt.last_generated ? new Date(rt.last_generated) : undefined,
      })) as RecurringTransaction[];
    },
    enabled: !!user,
  });

  const addRecurringTransaction = useMutation({
    mutationFn: async (transaction: Omit<RecurringTransaction, 'id'>) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('recurring_transactions')
        .insert({
          user_id: user.id,
          description: transaction.description,
          amount: transaction.amount,
          type: transaction.type,
          category_id: transaction.categoryId,
          subcategory: transaction.subcategory,
          bank_id: transaction.bankId,
          frequency: transaction.frequency,
          start_date: transaction.startDate.toISOString(),
          end_date: transaction.endDate?.toISOString(),
          is_active: transaction.isActive,
          last_generated: transaction.lastGenerated?.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurringTransactions'] });
      toast.success('Transação recorrente adicionada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(`Erro ao adicionar transação recorrente: ${error.message}`);
    },
  });

  const updateRecurringTransaction = useMutation({
    mutationFn: async ({ id, transaction }: { id: string; transaction: Omit<RecurringTransaction, 'id'> }) => {
      const { data, error } = await supabase
        .from('recurring_transactions')
        .update({
          description: transaction.description,
          amount: transaction.amount,
          type: transaction.type,
          category_id: transaction.categoryId,
          subcategory: transaction.subcategory,
          bank_id: transaction.bankId,
          frequency: transaction.frequency,
          start_date: transaction.startDate.toISOString(),
          end_date: transaction.endDate?.toISOString(),
          is_active: transaction.isActive,
          last_generated: transaction.lastGenerated?.toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurringTransactions'] });
      toast.success('Transação recorrente atualizada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(`Erro ao atualizar transação recorrente: ${error.message}`);
    },
  });

  const deleteRecurringTransaction = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('recurring_transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurringTransactions'] });
      toast.success('Transação recorrente excluída com sucesso!');
    },
    onError: (error: any) => {
      toast.error(`Erro ao excluir transação recorrente: ${error.message}`);
    },
  });

  const toggleRecurringTransaction = useMutation({
    mutationFn: async (id: string) => {
      const current = recurringTransactions.find(rt => rt.id === id);
      if (!current) throw new Error('Transação não encontrada');

      const { data, error } = await supabase
        .from('recurring_transactions')
        .update({ is_active: !current.isActive })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurringTransactions'] });
      toast.success('Status atualizado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(`Erro ao atualizar status: ${error.message}`);
    },
  });

  return {
    recurringTransactions,
    isLoading,
    error,
    addRecurringTransaction: addRecurringTransaction.mutate,
    updateRecurringTransaction: updateRecurringTransaction.mutate,
    deleteRecurringTransaction: deleteRecurringTransaction.mutate,
    toggleRecurringTransaction: toggleRecurringTransaction.mutate,
  };
};
