import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/types/finance';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { cardSchema } from '@/lib/validations';

export const useCards = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Note: Cards are already fetched with banks via the banks query
  // This hook provides mutation operations only
  
  const addCard = useMutation({
    mutationFn: async ({ bankId, card }: { bankId: string; card: Omit<Card, 'id'> }) => {
      if (!user) throw new Error('User not authenticated');

      // Validate input
      const validated = cardSchema.parse(card);

      const { data, error } = await supabase
        .from('cards')
        .insert({
          bank_id: bankId,
          name: validated.name,
          limit_amount: validated.limit,
          used_amount: validated.used,
          color: validated.color,
          auto_debit: card.autoDebit || false,
          auto_debit_bank_id: card.autoDebitBankId || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banks'] });
      toast.success('Cartão adicionado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(`Erro ao adicionar cartão: ${error.message}`);
    },
  });

  const updateCard = useMutation({
    mutationFn: async ({ cardId, card }: { cardId: string; card: Omit<Card, 'id'> }) => {
      // Validate input
      const validated = cardSchema.parse(card);

      const { data, error } = await supabase
        .from('cards')
        .update({
          name: validated.name,
          limit_amount: validated.limit,
          used_amount: validated.used,
          color: validated.color,
          auto_debit: card.autoDebit || false,
          auto_debit_bank_id: card.autoDebitBankId || null,
        })
        .eq('id', cardId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banks'] });
      toast.success('Cartão atualizado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(`Erro ao atualizar cartão: ${error.message}`);
    },
  });

  const deleteCard = useMutation({
    mutationFn: async (cardId: string) => {
      const { error } = await supabase
        .from('cards')
        .delete()
        .eq('id', cardId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banks'] });
      toast.success('Cartão excluído com sucesso!');
    },
    onError: (error: any) => {
      toast.error(`Erro ao excluir cartão: ${error.message}`);
    },
  });

  return {
    addCard: addCard.mutate,
    updateCard: updateCard.mutate,
    deleteCard: deleteCard.mutate,
  };
};
