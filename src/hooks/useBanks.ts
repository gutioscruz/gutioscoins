import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Bank } from '@/types/finance';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { bankSchema } from '@/lib/validations';

export const useBanks = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: banks = [], isLoading, error } = useQuery({
    queryKey: ['banks'],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('banks')
        .select('*, cards(*)')
        .order('name');

      if (error) throw error;
      
      return data.map(b => ({
        id: b.id,
        name: b.name,
        type: b.type as 'checking' | 'savings' | 'credit',
        balance: b.balance ? Number(b.balance) : undefined,
        limit: b.limit_amount ? Number(b.limit_amount) : undefined,
        color: b.color,
        cards: b.cards?.map(c => ({
          id: c.id,
          name: c.name,
          limit: Number(c.limit_amount),
          used: Number(c.used_amount),
          color: c.color,
          closingDay: c.closing_day || undefined,
          dueDay: c.due_day || undefined,
          autoDebit: c.auto_debit || false,
          autoDebitBankId: c.auto_debit_bank_id || undefined,
        })) || [],
      })) as Bank[];
    },
    enabled: !!user,
  });

  const addBank = useMutation({
    mutationFn: async (bank: Omit<Bank, 'id'>) => {
      if (!user) throw new Error('User not authenticated');

      // Validate input
      const validated = bankSchema.parse(bank);

      const { data, error } = await supabase
        .from('banks')
        .insert({
          user_id: user.id,
          name: validated.name,
          type: validated.type,
          balance: validated.balance,
          limit_amount: validated.limit,
          color: validated.color,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banks'] });
      toast.success('Banco adicionado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(`Erro ao adicionar banco: ${error.message}`);
    },
  });

  const updateBank = useMutation({
    mutationFn: async ({ id, bank }: { id: string; bank: Omit<Bank, 'id'> }) => {
      // Validate input
      const validated = bankSchema.parse(bank);

      const { data, error } = await supabase
        .from('banks')
        .update({
          name: validated.name,
          type: validated.type,
          balance: validated.balance,
          limit_amount: validated.limit,
          color: validated.color,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banks'] });
      toast.success('Banco atualizado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(`Erro ao atualizar banco: ${error.message}`);
    },
  });

  const deleteBank = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('banks')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banks'] });
      toast.success('Banco excluído com sucesso!');
    },
    onError: (error: any) => {
      toast.error(`Erro ao excluir banco: ${error.message}`);
    },
  });

  return {
    banks,
    isLoading,
    error,
    addBank: addBank.mutate,
    updateBank: updateBank.mutate,
    deleteBank: deleteBank.mutate,
  };
};
