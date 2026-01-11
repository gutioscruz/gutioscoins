import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CardStatement, CardStatementStatus } from '@/types/finance';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { startOfMonth, endOfMonth, format, addMonths } from 'date-fns';

interface CardStatementRow {
  id: string;
  card_id: string;
  reference_month: string;
  closing_date: string;
  due_date: string;
  total_amount: number;
  paid_amount: number;
  status: string;
  paid_at: string | null;
  paid_from_bank_id: string | null;
  created_at: string;
  updated_at: string;
}

const mapRowToStatement = (row: CardStatementRow): CardStatement => ({
  id: row.id,
  cardId: row.card_id,
  referenceMonth: new Date(row.reference_month),
  closingDate: new Date(row.closing_date),
  dueDate: new Date(row.due_date),
  totalAmount: Number(row.total_amount),
  paidAmount: Number(row.paid_amount),
  status: row.status as CardStatementStatus,
  paidAt: row.paid_at ? new Date(row.paid_at) : undefined,
  paidFromBankId: row.paid_from_bank_id || undefined,
});

export const useCardStatements = (cardId?: string) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Fetch all statements for a card
  const { data: statements = [], isLoading } = useQuery({
    queryKey: ['card-statements', cardId],
    queryFn: async () => {
      if (!cardId) return [];

      const { data, error } = await supabase
        .from('card_statements')
        .select('*')
        .eq('card_id', cardId)
        .order('reference_month', { ascending: false });

      if (error) throw error;
      return (data as CardStatementRow[]).map(mapRowToStatement);
    },
    enabled: !!user && !!cardId,
  });

  // Calculate statement total from transactions
  const calculateStatementTotal = async (cardId: string, startDate: Date, endDate: Date): Promise<number> => {
    const { data, error } = await supabase
      .from('transactions')
      .select('amount')
      .eq('card_id', cardId)
      .eq('type', 'expense')
      .gte('date', startDate.toISOString())
      .lte('date', endDate.toISOString());

    if (error) throw error;
    return data?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
  };

  // Get or create statement for a month
  const getOrCreateStatement = useMutation({
    mutationFn: async ({ cardId, month, closingDay = 1, dueDay = 10 }: { 
      cardId: string; 
      month: Date;
      closingDay?: number;
      dueDay?: number;
    }) => {
      const referenceMonth = startOfMonth(month);
      const referenceMonthStr = format(referenceMonth, 'yyyy-MM-dd');

      // Check if statement exists
      const { data: existing, error: checkError } = await supabase
        .from('card_statements')
        .select('*')
        .eq('card_id', cardId)
        .eq('reference_month', referenceMonthStr)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existing) {
        return mapRowToStatement(existing as CardStatementRow);
      }

      // Calculate closing and due dates
      const closingDate = new Date(referenceMonth.getFullYear(), referenceMonth.getMonth(), closingDay);
      const nextMonth = addMonths(referenceMonth, 1);
      const dueDate = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), dueDay);

      // Calculate total from transactions
      const totalAmount = await calculateStatementTotal(
        cardId, 
        startOfMonth(referenceMonth), 
        endOfMonth(referenceMonth)
      );

      // Create new statement
      const { data, error } = await supabase
        .from('card_statements')
        .insert({
          card_id: cardId,
          reference_month: referenceMonthStr,
          closing_date: format(closingDate, 'yyyy-MM-dd'),
          due_date: format(dueDate, 'yyyy-MM-dd'),
          total_amount: totalAmount,
          status: 'open',
        })
        .select()
        .single();

      if (error) throw error;
      return mapRowToStatement(data as CardStatementRow);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card-statements'] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar fatura: ${error.message}`);
    },
  });

  // Update statement total (recalculate from transactions)
  const updateStatementTotal = useMutation({
    mutationFn: async (statementId: string) => {
      const { data: statement, error: fetchError } = await supabase
        .from('card_statements')
        .select('*')
        .eq('id', statementId)
        .single();

      if (fetchError) throw fetchError;

      const stmnt = statement as CardStatementRow;
      const refMonth = new Date(stmnt.reference_month);
      
      const totalAmount = await calculateStatementTotal(
        stmnt.card_id,
        startOfMonth(refMonth),
        endOfMonth(refMonth)
      );

      const { data, error } = await supabase
        .from('card_statements')
        .update({ total_amount: totalAmount })
        .eq('id', statementId)
        .select()
        .single();

      if (error) throw error;
      return mapRowToStatement(data as CardStatementRow);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card-statements'] });
    },
  });

  // Close statement (mark as closed)
  const closeStatement = useMutation({
    mutationFn: async (statementId: string) => {
      const { data, error } = await supabase
        .from('card_statements')
        .update({ status: 'closed' })
        .eq('id', statementId)
        .select()
        .single();

      if (error) throw error;
      return mapRowToStatement(data as CardStatementRow);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card-statements'] });
      toast.success('Fatura fechada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao fechar fatura: ${error.message}`);
    },
  });

  // Pay statement (full or partial)
  const payStatement = useMutation({
    mutationFn: async ({ 
      statementId, 
      amount, 
      bankId,
      cardId,
      categoryId,
      referenceMonth,
    }: { 
      statementId: string; 
      amount: number; 
      bankId: string;
      cardId: string;
      categoryId?: string;
      referenceMonth: Date;
    }) => {
      // Get current statement
      const { data: statement, error: fetchError } = await supabase
        .from('card_statements')
        .select('*')
        .eq('id', statementId)
        .single();

      if (fetchError) throw fetchError;

      const stmnt = statement as CardStatementRow;
      const totalAmount = Number(stmnt.total_amount);
      const newPaidAmount = Number(stmnt.paid_amount) + amount;
      const newStatus: CardStatementStatus = newPaidAmount >= totalAmount ? 'paid' : 'partial';

      // Update statement
      const { error: updateError } = await supabase
        .from('card_statements')
        .update({
          paid_amount: newPaidAmount,
          status: newStatus,
          paid_at: new Date().toISOString(),
          paid_from_bank_id: bankId,
        })
        .eq('id', statementId);

      if (updateError) throw updateError;

      // Reduce card used_amount
      const { data: card, error: cardFetchError } = await supabase
        .from('cards')
        .select('used_amount')
        .eq('id', cardId)
        .single();

      if (cardFetchError) throw cardFetchError;

      const newUsedAmount = Math.max(0, Number(card.used_amount) - amount);
      
      const { error: cardUpdateError } = await supabase
        .from('cards')
        .update({ used_amount: newUsedAmount })
        .eq('id', cardId);

      if (cardUpdateError) throw cardUpdateError;

      // Create expense transaction in the bank account (payment of the invoice)
      const monthStr = format(referenceMonth, 'MMMM/yyyy');
      
      // Get card name for description
      const { data: cardData } = await supabase
        .from('cards')
        .select('name')
        .eq('id', cardId)
        .single();

      const description = `Pagamento Fatura ${cardData?.name || 'Cartão'} - ${monthStr}`;

      // Find or use default category for card payment
      let paymentCategoryId = categoryId;
      
      if (!paymentCategoryId) {
        // Try to find "Fatura Cartão" category
        const { data: categories } = await supabase
          .from('categories')
          .select('id')
          .eq('name', 'Fatura Cartão')
          .eq('type', 'expense')
          .maybeSingle();

        if (categories) {
          paymentCategoryId = categories.id;
        } else {
          // Use first expense category if not found
          const { data: fallback } = await supabase
            .from('categories')
            .select('id')
            .eq('type', 'expense')
            .limit(1)
            .single();

          if (fallback) {
            paymentCategoryId = fallback.id;
          }
        }
      }

      if (paymentCategoryId) {
        const { error: transactionError } = await supabase
          .from('transactions')
          .insert({
            user_id: (await supabase.auth.getUser()).data.user?.id,
            description,
            amount,
            type: 'expense',
            category_id: paymentCategoryId,
            bank_id: bankId,
            date: new Date().toISOString(),
            // Note: card_id is NOT set here - this is a bank transaction, not a card transaction
          });

        if (transactionError) throw transactionError;
      }

      return { newStatus, newPaidAmount };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['card-statements'] });
      queryClient.invalidateQueries({ queryKey: ['banks'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Pagamento registrado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao pagar fatura: ${error.message}`);
    },
  });

  // Reopen statement
  const reopenStatement = useMutation({
    mutationFn: async (statementId: string) => {
      const { data, error } = await supabase
        .from('card_statements')
        .update({ status: 'open', paid_amount: 0, paid_at: null, paid_from_bank_id: null })
        .eq('id', statementId)
        .select()
        .single();

      if (error) throw error;
      return mapRowToStatement(data as CardStatementRow);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card-statements'] });
      toast.success('Fatura reaberta!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao reabrir fatura: ${error.message}`);
    },
  });

  // Update statement (edit closing date, due date, etc.)
  const updateStatement = useMutation({
    mutationFn: async ({ 
      statementId, 
      data 
    }: { 
      statementId: string; 
      data: {
        closingDate?: Date;
        dueDate?: Date;
        status?: string;
      }
    }) => {
      const updatePayload: Record<string, any> = {};
      
      if (data.closingDate) {
        updatePayload.closing_date = format(data.closingDate, 'yyyy-MM-dd');
      }
      if (data.dueDate) {
        updatePayload.due_date = format(data.dueDate, 'yyyy-MM-dd');
      }
      if (data.status) {
        updatePayload.status = data.status;
      }

      const { data: result, error } = await supabase
        .from('card_statements')
        .update(updatePayload)
        .eq('id', statementId)
        .select()
        .single();

      if (error) throw error;
      return mapRowToStatement(result as CardStatementRow);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card-statements'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-statements-overview'] });
      toast.success('Fatura atualizada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar fatura: ${error.message}`);
    },
  });

  // Delete statement
  const deleteStatement = useMutation({
    mutationFn: async (statementId: string) => {
      const { error } = await supabase
        .from('card_statements')
        .delete()
        .eq('id', statementId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card-statements'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-statements-overview'] });
      toast.success('Fatura excluída com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir fatura: ${error.message}`);
    },
  });

  return {
    statements,
    isLoading,
    getOrCreateStatement: getOrCreateStatement.mutateAsync,
    updateStatementTotal: updateStatementTotal.mutate,
    closeStatement: closeStatement.mutate,
    payStatement: payStatement.mutate,
    reopenStatement: reopenStatement.mutate,
    updateStatement: updateStatement.mutate,
    deleteStatement: deleteStatement.mutate,
    isPayingStatement: payStatement.isPending,
    isUpdatingStatement: updateStatement.isPending,
  };
};

// Hook to get transactions for a specific statement period
export const useStatementTransactions = (cardId: string, referenceMonth: Date) => {
  const { user } = useAuth();
  const startDate = startOfMonth(referenceMonth);
  const endDate = endOfMonth(referenceMonth);

  return useQuery({
    queryKey: ['statement-transactions', cardId, format(referenceMonth, 'yyyy-MM')],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          categories:category_id (id, name, type)
        `)
        .eq('card_id', cardId)
        .eq('type', 'expense')
        .gte('date', startDate.toISOString())
        .lte('date', endDate.toISOString())
        .order('date', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!cardId,
  });
};
