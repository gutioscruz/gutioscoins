import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RecurringTransaction } from '@/types/finance';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { recurringTransactionSchema } from '@/lib/validations';
import { addDays, addWeeks, addMonths, addYears, isBefore, startOfDay, isAfter, isSameDay } from 'date-fns';
import { useCallback, useEffect, useRef } from 'react';

const getNextDate = (date: Date, frequency: RecurringTransaction['frequency']): Date => {
  switch (frequency) {
    case 'daily':
      return addDays(date, 1);
    case 'weekly':
      return addWeeks(date, 1);
    case 'monthly':
      return addMonths(date, 1);
    case 'yearly':
      return addYears(date, 1);
    default:
      return addMonths(date, 1);
  }
};

export const useRecurringTransactions = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const generationInProgress = useRef(false);

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

  const generatePendingTransactions = useCallback(async () => {
    if (!user || generationInProgress.current) return;
    
    generationInProgress.current = true;
    const today = startOfDay(new Date());

    try {
      // Get all active recurring transactions
      const { data: activeRecurrings, error: fetchError } = await supabase
        .from('recurring_transactions')
        .select('*')
        .eq('is_active', true);

      if (fetchError) throw fetchError;
      if (!activeRecurrings || activeRecurrings.length === 0) return;

      // Get existing transactions linked to recurring transactions
      const recurringIds = activeRecurrings.map(r => r.id);
      const { data: existingTransactions, error: txError } = await supabase
        .from('transactions')
        .select('recurring_transaction_id, date')
        .in('recurring_transaction_id', recurringIds);

      if (txError) throw txError;

      // Create a map of existing transaction dates per recurring
      const existingDatesMap = new Map<string, Set<string>>();
      existingTransactions?.forEach(tx => {
        if (tx.recurring_transaction_id) {
          if (!existingDatesMap.has(tx.recurring_transaction_id)) {
            existingDatesMap.set(tx.recurring_transaction_id, new Set());
          }
          existingDatesMap.get(tx.recurring_transaction_id)!.add(tx.date.split('T')[0]);
        }
      });

      const transactionsToCreate: any[] = [];

      for (const recurring of activeRecurrings) {
        const startDate = startOfDay(new Date(recurring.start_date));
        const endDate = recurring.end_date ? startOfDay(new Date(recurring.end_date)) : null;
        const existingDates = existingDatesMap.get(recurring.id) || new Set();

        let currentDate = startDate;
        let latestGeneratedDate = startDate;

        // Iterate through all dates from start to today
        while (isBefore(currentDate, today) || isSameDay(currentDate, today)) {
          // Stop if we've passed the end date
          if (endDate && isAfter(currentDate, endDate)) break;

          const dateString = currentDate.toISOString().split('T')[0];

          // Only create transaction if it doesn't exist
          if (!existingDates.has(dateString)) {
            transactionsToCreate.push({
              user_id: user.id,
              description: recurring.description,
              amount: recurring.amount,
              type: recurring.type,
              category_id: recurring.category_id,
              subcategory: recurring.subcategory,
              bank_id: recurring.bank_id,
              date: currentDate.toISOString(),
              recurring_transaction_id: recurring.id,
              is_installment: false,
            });
          }

          latestGeneratedDate = currentDate;
          currentDate = getNextDate(currentDate, recurring.frequency as RecurringTransaction['frequency']);
        }

        // Update last_generated for this recurring
        if (latestGeneratedDate && transactionsToCreate.some(t => t.recurring_transaction_id === recurring.id)) {
          await supabase
            .from('recurring_transactions')
            .update({ last_generated: latestGeneratedDate.toISOString() })
            .eq('id', recurring.id);
        }
      }

      // Batch insert all new transactions
      if (transactionsToCreate.length > 0) {
        const { error: insertError } = await supabase
          .from('transactions')
          .insert(transactionsToCreate);

        if (insertError) throw insertError;

        console.log(`Generated ${transactionsToCreate.length} recurring transactions`);
        
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
        queryClient.invalidateQueries({ queryKey: ['recurringTransactions'] });
      }
    } catch (error) {
      console.error('Error generating recurring transactions:', error);
    } finally {
      generationInProgress.current = false;
    }
  }, [user, queryClient]);

  // Auto-generate on load when recurring transactions are available
  useEffect(() => {
    if (!isLoading && recurringTransactions.length > 0 && user) {
      generatePendingTransactions();
    }
  }, [isLoading, recurringTransactions.length, user, generatePendingTransactions]);

  const addRecurringTransaction = useMutation({
    mutationFn: async (transaction: Omit<RecurringTransaction, 'id'>) => {
      if (!user) throw new Error('User not authenticated');

      // Validate input
      const validated = recurringTransactionSchema.parse({
        description: transaction.description,
        amount: transaction.amount,
        type: transaction.type,
        frequency: transaction.frequency,
        startDate: transaction.startDate,
        endDate: transaction.endDate,
        isActive: transaction.isActive,
        categoryId: transaction.categoryId,
        bankId: transaction.bankId,
        subcategory: transaction.subcategory,
      });

      const { data, error } = await supabase
        .from('recurring_transactions')
        .insert({
          user_id: user.id,
          description: validated.description,
          amount: validated.amount,
          type: validated.type,
          category_id: validated.categoryId,
          subcategory: validated.subcategory,
          bank_id: validated.bankId,
          frequency: validated.frequency,
          start_date: validated.startDate.toISOString(),
          end_date: validated.endDate?.toISOString(),
          is_active: validated.isActive,
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
      // Trigger generation for the new recurring transaction
      setTimeout(() => generatePendingTransactions(), 500);
    },
    onError: (error: any) => {
      toast.error(`Erro ao adicionar transação recorrente: ${error.message}`);
    },
  });

  const updateRecurringTransaction = useMutation({
    mutationFn: async ({ id, transaction }: { id: string; transaction: Omit<RecurringTransaction, 'id'> }) => {
      // Validate input
      const validated = recurringTransactionSchema.parse({
        description: transaction.description,
        amount: transaction.amount,
        type: transaction.type,
        frequency: transaction.frequency,
        startDate: transaction.startDate,
        endDate: transaction.endDate,
        isActive: transaction.isActive,
        categoryId: transaction.categoryId,
        bankId: transaction.bankId,
        subcategory: transaction.subcategory,
      });

      const { data, error } = await supabase
        .from('recurring_transactions')
        .update({
          description: validated.description,
          amount: validated.amount,
          type: validated.type,
          category_id: validated.categoryId,
          subcategory: validated.subcategory,
          bank_id: validated.bankId,
          frequency: validated.frequency,
          start_date: validated.startDate.toISOString(),
          end_date: validated.endDate?.toISOString(),
          is_active: validated.isActive,
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
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['recurringTransactions'] });
      toast.success('Status atualizado com sucesso!');
      // If we just activated a recurring transaction, generate pending transactions
      const current = recurringTransactions.find(rt => rt.id === id);
      if (current && !current.isActive) {
        setTimeout(() => generatePendingTransactions(), 500);
      }
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
    generatePendingTransactions,
  };
};