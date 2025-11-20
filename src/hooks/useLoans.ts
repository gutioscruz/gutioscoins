import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loan } from '@/types/finance';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export const useLoans = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: loans = [], isLoading, error } = useQuery({
    queryKey: ['loans'],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('loans')
        .select('*, loan_payments(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return data.map(l => ({
        id: l.id,
        name: l.name,
        description: l.description || undefined,
        principal: Number(l.principal),
        interestRate: Number(l.interest_rate),
        installments: l.installments,
        paymentFrequency: l.payment_frequency as 'monthly' | 'biweekly' | 'weekly',
        startDate: new Date(l.start_date),
        status: l.status as 'active' | 'paid' | 'overdue',
        totalPaid: Number(l.total_paid),
        totalInterest: Number(l.total_interest),
        bankId: l.bank_id || undefined,
        payments: l.loan_payments?.map(p => ({
          id: p.id,
          installmentNumber: p.installment_number,
          dueDate: new Date(p.due_date),
          amount: Number(p.amount),
          principal: Number(p.principal),
          interest: Number(p.interest),
          paid: p.paid,
          paidDate: p.paid_date ? new Date(p.paid_date) : undefined,
        })) || [],
      })) as Loan[];
    },
    enabled: !!user,
  });

  const addLoan = useMutation({
    mutationFn: async (loan: Omit<Loan, 'id' | 'payments' | 'totalPaid' | 'totalInterest'>) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('loans')
        .insert({
          user_id: user.id,
          name: loan.name,
          description: loan.description,
          principal: loan.principal,
          interest_rate: loan.interestRate,
          installments: loan.installments,
          payment_frequency: loan.paymentFrequency,
          start_date: loan.startDate.toISOString(),
          status: loan.status,
          bank_id: loan.bankId,
          total_interest: 0,
          total_paid: 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      toast.success('Empréstimo adicionado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(`Erro ao adicionar empréstimo: ${error.message}`);
    },
  });

  const updateLoan = useMutation({
    mutationFn: async ({ id, loan }: { id: string; loan: Partial<Loan> }) => {
      const { data, error } = await supabase
        .from('loans')
        .update({
          name: loan.name,
          description: loan.description,
          status: loan.status,
          total_paid: loan.totalPaid,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      toast.success('Empréstimo atualizado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(`Erro ao atualizar empréstimo: ${error.message}`);
    },
  });

  const deleteLoan = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('loans')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      toast.success('Empréstimo excluído com sucesso!');
    },
    onError: (error: any) => {
      toast.error(`Erro ao excluir empréstimo: ${error.message}`);
    },
  });

  return {
    loans,
    isLoading,
    error,
    addLoan: addLoan.mutate,
    updateLoan: updateLoan.mutate,
    deleteLoan: deleteLoan.mutate,
  };
};
