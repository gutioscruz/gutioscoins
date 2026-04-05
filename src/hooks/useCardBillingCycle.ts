import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/types/finance';

/**
 * Calculates the billing cycle window for a card.
 *
 * Rule: from the closingDay of the PREVIOUS month (exclusive)
 *       to   the closingDay of the CURRENT month (inclusive).
 *
 * Example: closingDay = 15, today = Apr 5
 *   → cycle: 2025-03-15 → 2025-04-15
 *
 * The range is kept editable via the returned `cycleStart` / `cycleEnd` so
 * any exception (holiday, manual override) can be handled at the call site.
 */
export function getCardBillingCycleRange(
  closingDay: number,
  referenceDate: Date = new Date()
): { cycleStart: Date; cycleEnd: Date } {
  const today = referenceDate;
  const year = today.getFullYear();
  const month = today.getMonth(); // 0-indexed

  // Closing date of the CURRENT month
  const closingThisMonth = new Date(year, month, closingDay);

  let cycleStart: Date;
  let cycleEnd: Date;

  if (today <= closingThisMonth) {
    // We are BEFORE the closing of this month → current cycle:
    // prev month's closing  ->  this month's closing
    cycleStart = new Date(year, month - 1, closingDay + 1); // day after prev closing
    cycleEnd = closingThisMonth;
  } else {
    // We are AFTER the closing of this month → current cycle:
    // this month's closing  ->  next month's closing
    cycleStart = new Date(year, month, closingDay + 1);
    cycleEnd = new Date(year, month + 1, closingDay);
  }

  // Normalise to start/end of day
  cycleStart.setHours(0, 0, 0, 0);
  cycleEnd.setHours(23, 59, 59, 999);

  return { cycleStart, cycleEnd };
}

interface CardBillingInfo {
  cardId: string;
  currentBillAmount: number; // sum of all expense transactions in the current billing cycle
  cycleStart: Date;
  cycleEnd: Date;
}

/**
 * Fetches real-time billing data for ALL cards of the current user.
 *
 * Strategy: one single Supabase query that joins transactions → filters by
 * card_id IN (all card ids), type = expense, date within the *widest* possible
 * window.  Then we group/sum client-side per card using each card's own cycle.
 *
 * Returns a Map<cardId, CardBillingInfo> for O(1) lookup in the UI.
 */
export function useCardBillingCycle(cards: Card[]) {
  const { user } = useAuth();

  // Build the widest possible window that covers all cards' cycles
  const windowStart = new Date();
  windowStart.setMonth(windowStart.getMonth() - 2);
  windowStart.setHours(0, 0, 0, 0);

  const windowEnd = new Date();
  windowEnd.setMonth(windowEnd.getMonth() + 2);
  windowEnd.setHours(23, 59, 59, 999);

  const cardIds = cards.map((c) => c.id);

  const { data: rawTransactions = [], isLoading } = useQuery({
    queryKey: [
      'card-billing-cycle',
      cardIds.sort().join(','),
      windowStart.toISOString().slice(0, 7), // cache key by month
    ],
    queryFn: async () => {
      if (cardIds.length === 0) return [];

      const { data, error } = await supabase
        .from('transactions')
        .select('card_id, amount, date')
        .in('card_id', cardIds)
        .eq('type', 'expense')
        .gte('date', windowStart.toISOString())
        .lte('date', windowEnd.toISOString());

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user && cardIds.length > 0,
    staleTime: 60_000, // 60 s cache — avoids re-fetches on modal opens
  });

  // Build the result map
  const billingMap = new Map<string, CardBillingInfo>();

  cards.forEach((card) => {
    const closingDay = card.closingDay ?? 1;
    const { cycleStart, cycleEnd } = getCardBillingCycleRange(closingDay);

    const currentBillAmount = rawTransactions
      .filter((t) => {
        if (t.card_id !== card.id) return false;
        const [yyyy, mm, dd] = t.date.split('T')[0].split('-');
        const txDate = new Date(Number(yyyy), Number(mm) - 1, Number(dd), 12, 0, 0);
        return txDate >= cycleStart && txDate <= cycleEnd;
      })
      .reduce((sum, t) => sum + Number(t.amount), 0);

    billingMap.set(card.id, {
      cardId: card.id,
      currentBillAmount,
      cycleStart,
      cycleEnd,
    });
  });

  return {
    billingMap,
    isLoading,
  };
}
