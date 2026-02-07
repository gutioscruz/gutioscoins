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
        categoryId: l.category_id || undefined,
        subcategory: l.subcategory || undefined,
        loanType: l.loan_type || 'pessoal',
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

      const periodsPerYear = loan.paymentFrequency === 'monthly' ? 12 : loan.paymentFrequency === 'biweekly' ? 26 : 52;
      const periodRate = (loan.interestRate / 100) / periodsPerYear;
      const monthlyPayment = loan.principal * (periodRate * Math.pow(1 + periodRate, loan.installments)) / (Math.pow(1 + periodRate, loan.installments) - 1);
      const totalInterest = (monthlyPayment * loan.installments) - loan.principal;

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
        categoryId: loan.categoryId,
        subcategory: loan.subcategory,
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
          category_id: validated.categoryId,
          subcategory: validated.subcategory,
        })
        .select()
        .single();

      if (loanError) throw loanError;

      const payments = [];
      for (let i = 1; i <= loan.installments; i++) {
        const dueDate = new Date(loan.startDate);
        
        if (loan.paymentFrequency === 'monthly') {
          dueDate.setMonth(dueDate.getMonth() + i);
        } else if (loan.paymentFrequency === 'biweekly') {
          dueDate.setDate(dueDate.getDate() + (i * 14));
        } else {
          dueDate.setDate(dueDate.getDate() + (i * 7));
        }

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
      const updateData: Record<string, any> = {};
      if (loan.name !== undefined) updateData.name = loan.name;
      if (loan.description !== undefined) updateData.description = loan.description;
      if (loan.status !== undefined) updateData.status = loan.status;
      if (loan.totalPaid !== undefined) updateData.total_paid = loan.totalPaid;
      if (loan.bankId !== undefined) updateData.bank_id = loan.bankId;
      if (loan.categoryId !== undefined) updateData.category_id = loan.categoryId;
      if (loan.subcategory !== undefined) updateData.subcategory = loan.subcategory;

      const { data, error } = await supabase
        .from('loans')
        .update(updateData)
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
    mutationFn: async ({ 
      loanId, 
      installmentId,
      bankId,
      discount = 0,
      createTransaction = true,
    }: { 
      loanId: string; 
      installmentId: string; 
      bankId?: string;
      discount?: number;
      createTransaction?: boolean;
    }) => {
      const { data: paymentData, error: paymentFetchError } = await supabase
        .from('loan_payments')
        .select('amount')
        .eq('id', installmentId)
        .single();
      
      if (paymentFetchError) throw paymentFetchError;
      
      const finalAmount = paymentData.amount - discount;
      
      const { data, error } = await supabase
        .from('loan_payments')
        .update({
          paid: true,
          paid_date: new Date().toISOString(),
          discount_amount: discount,
          final_paid_amount: finalAmount,
        })
        .eq('id', installmentId)
        .select()
        .single();

      if (error) throw error;

      const { data: loanData, error: loanError } = await supabase
        .from('loans')
        .select('total_paid, name, bank_id, category_id, subcategory')
        .eq('id', loanId)
        .single();

      if (loanError) throw loanError;

      const { error: updateError } = await supabase
        .from('loans')
        .update({
          total_paid: Number(loanData.total_paid) + finalAmount,
        })
        .eq('id', loanId);

      if (updateError) throw updateError;

      // Only create transaction if explicitly requested and bankId is provided
      const transactionBankId = bankId || loanData.bank_id;
      if (createTransaction && transactionBankId && user) {
        // Use the loan's category_id if available, otherwise fallback to "Empréstimos"
        let categoryId = loanData.category_id;
        
        if (!categoryId) {
          const { data: categories } = await supabase
            .from('categories')
            .select('id')
            .eq('user_id', user.id)
            .or('name.ilike.%empréstimo%,name.ilike.%outros gastos%')
            .limit(1);
          categoryId = categories?.[0]?.id;
        }
        
        if (categoryId) {
          const { data: transactionData, error: transactionError } = await supabase
            .from('transactions')
            .insert({
              user_id: user.id,
              description: `Pagamento - ${loanData.name}`,
              amount: finalAmount,
              type: 'expense',
              category_id: categoryId,
              subcategory: loanData.subcategory,
              bank_id: transactionBankId,
              date: new Date().toISOString(),
              is_installment: false,
            })
            .select()
            .single();

          if (transactionError) {
            console.warn('Erro ao criar transação de pagamento:', transactionError);
          } else if (transactionData) {
            await supabase
              .from('loan_payments')
              .update({ transaction_id: transactionData.id })
              .eq('id', installmentId);
          }
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['banks'] });
      toast.success('Parcela paga com sucesso!');
    },
    onError: (error: any) => {
      toast.error(`Erro ao pagar parcela: ${error.message}`);
    },
  });

  const payLoanInstallmentsAhead = useMutation({
    mutationFn: async ({ 
      loanId, 
      count, 
      bankId,
      discount = 0,
      createTransaction = true,
    }: { 
      loanId: string; 
      count: number; 
      bankId?: string;
      discount?: number;
      createTransaction?: boolean;
    }) => {
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
      const finalAmount = totalAmount - discount;

      const { data: loanData, error: loanFetchError } = await supabase
        .from('loans')
        .select('total_paid, name, bank_id, category_id, subcategory')
        .eq('id', loanId)
        .single();

      if (loanFetchError) throw loanFetchError;

      const { error: loanError } = await supabase
        .from('loans')
        .update({
          total_paid: Number(loanData.total_paid) + finalAmount,
        })
        .eq('id', loanId);

      if (loanError) throw loanError;

      // Only create transaction if explicitly requested
      const transactionBankId = bankId || loanData.bank_id;
      if (createTransaction && transactionBankId && user) {
        let categoryId = loanData.category_id;
        
        if (!categoryId) {
          const { data: categories } = await supabase
            .from('categories')
            .select('id')
            .eq('user_id', user.id)
            .or('name.ilike.%empréstimo%,name.ilike.%outros gastos%')
            .limit(1);
          categoryId = categories?.[0]?.id;
        }
        
        if (categoryId) {
          await supabase
            .from('transactions')
            .insert({
              user_id: user.id,
              description: `Antecipação ${count}x - ${loanData.name}`,
              amount: finalAmount,
              type: 'expense',
              category_id: categoryId,
              subcategory: loanData.subcategory,
              bank_id: transactionBankId,
              date: new Date().toISOString(),
              is_installment: false,
            });
        }
      }

      return { count, totalAmount: finalAmount };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['banks'] });
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
