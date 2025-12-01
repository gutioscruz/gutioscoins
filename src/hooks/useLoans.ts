import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loan } from '@/types/finance';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { loanSchema } from '@/lib/validations';

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

      // Calculate total interest using loan formula
      const periodsPerYear = loan.paymentFrequency === 'monthly' ? 12 : loan.paymentFrequency === 'biweekly' ? 26 : 52;
      const periodRate = (loan.interestRate / 100) / periodsPerYear;
      const monthlyPayment = loan.principal * (periodRate * Math.pow(1 + periodRate, loan.installments)) / (Math.pow(1 + periodRate, loan.installments) - 1);
      const totalInterest = (monthlyPayment * loan.installments) - loan.principal;

      // Validate input
      const validated = loanSchema.parse({
        name: loan.name,
        description: loan.description,
        principal: loan.principal,
        interestRate: loan.interestRate,
        installments: loan.installments,
        paymentFrequency: loan.paymentFrequency,
        startDate: loan.startDate,
        status: loan.status,
        totalInterest,
        totalPaid: 0,
        bankId: loan.bankId,
      });

      const { data: loanData, error: loanError } = await supabase
        .from('loans')
        .insert({
          user_id: user.id,
          name: validated.name,
          description: validated.description,
          principal: validated.principal,
          interest_rate: validated.interestRate,
          installments: validated.installments,
          payment_frequency: validated.paymentFrequency,
          start_date: validated.startDate.toISOString(),
          status: validated.status,
          bank_id: validated.bankId,
          total_interest: validated.totalInterest,
          total_paid: validated.totalPaid,
        })
        .select()
        .single();

      if (loanError) throw loanError;

      // Generate loan payment installments
      const payments = [];
      for (let i = 1; i <= loan.installments; i++) {
        const dueDate = new Date(loan.startDate);
        
        // Calculate due date based on frequency
        if (loan.paymentFrequency === 'monthly') {
          dueDate.setMonth(dueDate.getMonth() + i);
        } else if (loan.paymentFrequency === 'biweekly') {
          dueDate.setDate(dueDate.getDate() + (i * 14));
        } else {
          dueDate.setDate(dueDate.getDate() + (i * 7));
        }

        // Calculate interest and principal for this payment (simplified amortization)
        const interestPayment = totalInterest / loan.installments;
        const principalPayment = loan.principal / loan.installments;

        payments.push({
          loan_id: loanData.id,
          installment_number: i,
          due_date: dueDate.toISOString(),
          amount: monthlyPayment,
          principal: principalPayment,
          interest: interestPayment,
          paid: false,
        });
      }

      // Insert all payments
      const { error: paymentsError } = await supabase
        .from('loan_payments')
        .insert(payments);

      if (paymentsError) throw paymentsError;

      return loanData;
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

  const payLoanInstallment = useMutation({
    mutationFn: async ({ loanId, installmentId }: { loanId: string; installmentId: string }) => {
      const { data, error } = await supabase
        .from('loan_payments')
        .update({
          paid: true,
          paid_date: new Date().toISOString(),
        })
        .eq('id', installmentId)
        .select()
        .single();

      if (error) throw error;

      // Update loan's total_paid
      const { data: loanData, error: loanError } = await supabase
        .from('loans')
        .select('total_paid')
        .eq('id', loanId)
        .single();

      if (loanError) throw loanError;

      const { error: updateError } = await supabase
        .from('loans')
        .update({
          total_paid: loanData.total_paid + data.amount,
        })
        .eq('id', loanId);

      if (updateError) throw updateError;

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      toast.success('Parcela paga com sucesso!');
    },
    onError: (error: any) => {
      toast.error(`Erro ao pagar parcela: ${error.message}`);
    },
  });

  const payLoanInstallmentsAhead = useMutation({
    mutationFn: async ({ loanId, count }: { loanId: string; count: number }) => {
      const loan = loans.find(l => l.id === loanId);
      if (!loan) throw new Error('Empréstimo não encontrado');

      const unpaidPayments = loan.payments
        .filter(p => !p.paid)
        .sort((a, b) => a.installmentNumber - b.installmentNumber)
        .slice(0, count);

      const paymentIds = unpaidPayments.map(p => p.id);

      const { error } = await supabase
        .from('loan_payments')
        .update({
          paid: true,
          paid_date: new Date().toISOString(),
        })
        .in('id', paymentIds);

      if (error) throw error;

      const totalAmount = unpaidPayments.reduce((sum, p) => sum + p.amount, 0);

      // Get current total_paid
      const { data: loanData, error: loanFetchError } = await supabase
        .from('loans')
        .select('total_paid')
        .eq('id', loanId)
        .single();

      if (loanFetchError) throw loanFetchError;

      // Update loan's total_paid
      const { error: loanError } = await supabase
        .from('loans')
        .update({
          total_paid: loanData.total_paid + totalAmount,
        })
        .eq('id', loanId);

      if (loanError) throw loanError;

      return { count, totalAmount };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      toast.success(`${data.count} parcelas pagas com sucesso!`);
    },
    onError: (error: any) => {
      toast.error(`Erro ao antecipar parcelas: ${error.message}`);
    },
  });

  return {
    loans,
    isLoading,
    error,
    addLoan: addLoan.mutate,
    updateLoan: updateLoan.mutate,
    deleteLoan: deleteLoan.mutate,
    payLoanInstallment: payLoanInstallment.mutate,
    payLoanInstallmentsAhead: payLoanInstallmentsAhead.mutate,
  };
};
