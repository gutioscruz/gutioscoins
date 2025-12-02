import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Transaction } from '@/types/finance';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { transactionSchema } from '@/lib/validations';
import { BatchTransaction } from '@/components/finance/BatchTransactionDialog';

interface TransactionFilters {
  startDate?: Date;
  endDate?: Date;
  bankId?: string;
  categoryId?: string;
  search?: string;
}

export const useTransactions = (filters?: TransactionFilters) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: transactions = [], isLoading, error } = useQuery({
    queryKey: ['transactions', filters?.startDate?.toISOString(), filters?.endDate?.toISOString(), filters?.bankId, filters?.categoryId, filters?.search],
    queryFn: async () => {
      if (!user) return [];
      
      let query = supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });

      // Server-side filtering for better performance
      if (filters?.startDate) {
        query = query.gte('date', filters.startDate.toISOString());
      }
      if (filters?.endDate) {
        query = query.lte('date', filters.endDate.toISOString());
      }
      if (filters?.bankId) {
        query = query.eq('bank_id', filters.bankId);
      }
      if (filters?.categoryId) {
        query = query.eq('category_id', filters.categoryId);
      }
      if (filters?.search) {
        query = query.ilike('description', `%${filters.search}%`);
      }

      const { data, error } = await query;

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
    staleTime: 30000, // Cache for 30 seconds
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

      // If it's an installment with a card, update card limit with TOTAL value
      if (validated.isInstallment && validated.installmentCount && validated.installmentCount > 1 && transaction.cardId) {
        const totalAmount = validated.amount * validated.installmentCount;
        
        // Update card used_amount with total value
        const { error: cardError } = await supabase
          .from('cards')
          .update({ 
            used_amount: supabase.rpc('increment_card_used_amount', { 
              card_id: transaction.cardId, 
              amount_to_add: totalAmount 
            })
          })
          .eq('id', transaction.cardId);

        // If RPC doesn't exist, do manual update
        if (cardError) {
          const { data: cardData } = await supabase
            .from('cards')
            .select('used_amount')
            .eq('id', transaction.cardId)
            .single();
          
          if (cardData) {
            await supabase
              .from('cards')
              .update({ used_amount: (cardData.used_amount || 0) + totalAmount })
              .eq('id', transaction.cardId);
          }
        }
      }

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
            parent_transaction_id: i === 1 ? null : undefined,
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

      // Regular transaction (triggers will handle card update if needed)
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
      queryClient.invalidateQueries({ queryKey: ['banks'] });
      toast.success('Transação adicionada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(`Erro ao adicionar transação: ${error.message}`);
    },
  });

  const addBatchTransactions = useMutation({
    mutationFn: async (batchData: { transactions: BatchTransaction[], categories: any[], banks: any[] }) => {
      if (!user) throw new Error('User not authenticated');

      const { transactions: batchTransactions, categories, banks } = batchData;
      
      const transactionsToInsert = batchTransactions.map(t => {
        const category = categories.find(c => 
          c.name.toLowerCase() === t.categoryName.toLowerCase() && 
          c.type === t.type
        );
        const bank = banks.find(b => b.name.toLowerCase() === t.bankName.toLowerCase());

        return {
          user_id: user.id,
          description: t.description,
          amount: t.amount,
          type: t.type,
          category_id: category?.id,
          subcategory: t.subcategory,
          bank_id: bank?.id,
          date: t.date + 'T00:00:00.000Z',
          is_installment: false,
        };
      });

      // Insert in batches of 50 for better performance
      const batchSize = 50;
      for (let i = 0; i < transactionsToInsert.length; i += batchSize) {
        const batch = transactionsToInsert.slice(i, i + batchSize);
        const { error } = await supabase
          .from('transactions')
          .insert(batch);

        if (error) throw error;
      }

      return { count: transactionsToInsert.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success(`${data.count} transações importadas com sucesso!`);
    },
    onError: (error: any) => {
      toast.error(`Erro ao importar transações: ${error.message}`);
    },
  });

  const updateTransaction = useMutation({
    mutationFn: async ({ id, transaction }: { id: string; transaction: Partial<Transaction> }) => {
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
      queryClient.invalidateQueries({ queryKey: ['banks'] });
      toast.success('Transação atualizada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(`Erro ao atualizar transação: ${error.message}`);
    },
  });

  const deleteTransaction = useMutation({
    mutationFn: async (id: string) => {
      // Get transaction to check if it's the first installment with card
      const { data: txData } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', id)
        .single();

      if (txData?.is_installment && txData?.installment_number === 1 && txData?.card_id && txData?.installment_count) {
        // Release total amount from card
        const totalAmount = Number(txData.amount) * txData.installment_count;
        const { data: cardData } = await supabase
          .from('cards')
          .select('used_amount')
          .eq('id', txData.card_id)
          .single();

        if (cardData) {
          await supabase
            .from('cards')
            .update({ used_amount: Math.max(0, (cardData.used_amount || 0) - totalAmount) })
            .eq('id', txData.card_id);
        }

        // Delete all related installments
        await supabase
          .from('transactions')
          .delete()
          .eq('parent_transaction_id', id);
      }

      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['banks'] });
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
    addBatchTransactions: addBatchTransactions.mutateAsync,
    updateTransaction: updateTransaction.mutate,
    deleteTransaction: deleteTransaction.mutate,
  };
};
