import { useMemo } from 'react';
import { useInstallments } from './useInstallments';
import { useLoans } from './useLoans';
import { useBanks } from './useBanks';
import { addMonths, format } from 'date-fns';

export type CommitmentKind = 'installment' | 'loan';

export interface Commitment {
  id: string;
  kind: CommitmentKind;
  title: string;
  description?: string;
  remainingAmount: number;
  totalAmount: number;
  paidAmount: number;
  nextDueDate: Date | null;
  endDate: Date | null;
  monthlyAmount: number;
  remainingCount: number;
  totalCount: number;
  origin: string;
  status: 'active' | 'completed';
  categoryName?: string;
  // Reference to original data for actions
  originalId: string;
  parentTransactionId?: string;
}

export interface MonthlyProjection {
  month: string;
  monthLabel: string;
  installmentsAmount: number;
  loansAmount: number;
  totalAmount: number;
}

export const useCommitments = () => {
  const { 
    installmentGroups, 
    summary: installmentSummary, 
    isLoading: installmentsLoading,
    anticipateInstallment,
    anticipateMultipleInstallments,
    payOffInstallments 
  } = useInstallments();
  
  const { 
    loans, 
    isLoading: loansLoading,
    payLoanInstallment,
    payLoanInstallmentsAhead,
    payMultipleLoanInstallments
  } = useLoans();

  const { banks } = useBanks();

  // Create bank name lookup
  const bankNameMap = useMemo(() => {
    const map = new Map<string, string>();
    banks.forEach(b => map.set(b.id, b.name));
    return map;
  }, [banks]);

  const commitments = useMemo<Commitment[]>(() => {
    const items: Commitment[] = [];

    // Convert installment groups to commitments
    installmentGroups.forEach(group => {
      items.push({
        id: `installment-${group.id}`,
        kind: 'installment',
        title: group.description,
        remainingAmount: group.remainingAmount,
        totalAmount: group.totalAmount,
        paidAmount: group.totalAmount - group.remainingAmount,
        nextDueDate: group.nextDueDate || null,
        endDate: group.endDate,
        monthlyAmount: group.installmentAmount,
        remainingCount: group.remainingCount,
        totalCount: group.totalCount,
        origin: group.cardName || group.bankName || 'Desconhecido',
        status: group.remainingCount === 0 ? 'completed' : 'active',
        categoryName: group.categoryName,
        originalId: group.id,
        parentTransactionId: group.id,
      });
    });

    // Convert loans to commitments
    loans.forEach(loan => {
      const paidPayments = loan.payments?.filter(p => p.paid) || [];
      const unpaidPayments = loan.payments?.filter(p => !p.paid).sort((a, b) => 
        new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      ) || [];
      
      const nextPayment = unpaidPayments[0];
      const lastPayment = loan.payments?.sort((a, b) => 
        new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()
      )[0];

      const totalAmount = loan.principal + loan.totalInterest;
      const remainingAmount = unpaidPayments.reduce((sum, p) => sum + p.amount, 0);

      const bankName = loan.bankId ? bankNameMap.get(loan.bankId) : undefined;

      items.push({
        id: `loan-${loan.id}`,
        kind: 'loan',
        title: loan.name,
        description: loan.description,
        remainingAmount,
        totalAmount,
        paidAmount: loan.totalPaid,
        nextDueDate: nextPayment ? new Date(nextPayment.dueDate) : null,
        endDate: lastPayment ? new Date(lastPayment.dueDate) : null,
        monthlyAmount: nextPayment?.amount || 0,
        remainingCount: unpaidPayments.length,
        totalCount: loan.installments,
        origin: bankName || 'Empréstimo',
        status: loan.status === 'paid' ? 'completed' : 'active',
        originalId: loan.id,
      });
    });

    // Sort by next due date (soonest first)
    return items.sort((a, b) => {
      if (!a.nextDueDate && !b.nextDueDate) return 0;
      if (!a.nextDueDate) return 1;
      if (!b.nextDueDate) return -1;
      return a.nextDueDate.getTime() - b.nextDueDate.getTime();
    });
  }, [installmentGroups, loans, bankNameMap]);

  const activeCommitments = useMemo(() => 
    commitments.filter(c => c.status === 'active'), 
    [commitments]
  );

  const monthlyProjections = useMemo<MonthlyProjection[]>(() => {
    const projections: MonthlyProjection[] = [];
    const today = new Date();

    for (let i = 0; i < 12; i++) {
      const targetMonth = addMonths(today, i);
      const monthKey = format(targetMonth, 'yyyy-MM');
      const monthLabel = format(targetMonth, 'MMM/yy');

      let installmentsAmount = 0;
      let loansAmount = 0;

      // Sum installment amounts for this month
      installmentGroups.forEach(group => {
        group.installments.forEach(inst => {
          if (!inst.isPaid) {
            const instDate = inst.date;
            if (format(instDate, 'yyyy-MM') === monthKey) {
              installmentsAmount += inst.amount;
            }
          }
        });
      });

      // Sum loan amounts for this month
      loans.forEach(loan => {
        loan.payments?.forEach(payment => {
          if (!payment.paid) {
            const paymentDate = new Date(payment.dueDate);
            if (format(paymentDate, 'yyyy-MM') === monthKey) {
              loansAmount += payment.amount;
            }
          }
        });
      });

      projections.push({
        month: monthKey,
        monthLabel,
        installmentsAmount,
        loansAmount,
        totalAmount: installmentsAmount + loansAmount,
      });
    }

    return projections;
  }, [installmentGroups, loans]);

  const summary = useMemo(() => {
    const totalActive = activeCommitments.length;
    const totalRemainingAmount = activeCommitments.reduce((sum, c) => sum + c.remainingAmount, 0);
    const thisMonthAmount = monthlyProjections[0]?.totalAmount || 0;
    const nextMonthAmount = monthlyProjections[1]?.totalAmount || 0;

    const installmentsRemainingAmount = activeCommitments
      .filter(c => c.kind === 'installment')
      .reduce((sum, c) => sum + c.remainingAmount, 0);
    const loansRemainingAmount = activeCommitments
      .filter(c => c.kind === 'loan')
      .reduce((sum, c) => sum + c.remainingAmount, 0);
    const thisMonthInstallments = monthlyProjections[0]?.installmentsAmount || 0;
    const thisMonthLoans = monthlyProjections[0]?.loansAmount || 0;

    return {
      totalActive,
      totalRemainingAmount,
      thisMonthAmount,
      nextMonthAmount,
      installmentsCount: activeCommitments.filter(c => c.kind === 'installment').length,
      loansCount: activeCommitments.filter(c => c.kind === 'loan').length,
      installmentsRemainingAmount,
      loansRemainingAmount,
      thisMonthInstallments,
      thisMonthLoans,
    };
  }, [activeCommitments, monthlyProjections]);

  return {
    commitments,
    activeCommitments,
    monthlyProjections,
    summary,
    isLoading: installmentsLoading || loansLoading,
    // Pass through actions
    anticipateInstallment,
    anticipateMultipleInstallments,
    payOffInstallments,
    payLoanInstallment,
    payLoanInstallmentsAhead,
    payMultipleLoanInstallments,
  };
};
