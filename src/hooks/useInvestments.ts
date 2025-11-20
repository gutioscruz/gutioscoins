import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Investment } from '@/types/finance';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export const useInvestments = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: investments = [], isLoading, error } = useQuery({
    queryKey: ['investments'],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('investments')
        .select('*')
        .order('name');

      if (error) throw error;
      
      return data.map(i => ({
        id: i.id,
        name: i.name,
        type: i.type as Investment['type'],
        amount: Number(i.amount),
        profitability: i.profitability ? Number(i.profitability) : undefined,
        color: i.color,
      })) as Investment[];
    },
    enabled: !!user,
  });

  const addInvestment = useMutation({
    mutationFn: async (investment: Omit<Investment, 'id'>) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('investments')
        .insert({
          user_id: user.id,
          name: investment.name,
          type: investment.type,
          amount: investment.amount,
          profitability: investment.profitability,
          color: investment.color,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investments'] });
      toast.success('Investimento adicionado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(`Erro ao adicionar investimento: ${error.message}`);
    },
  });

  const updateInvestment = useMutation({
    mutationFn: async ({ id, investment }: { id: string; investment: Omit<Investment, 'id'> }) => {
      const { data, error } = await supabase
        .from('investments')
        .update({
          name: investment.name,
          type: investment.type,
          amount: investment.amount,
          profitability: investment.profitability,
          color: investment.color,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investments'] });
      toast.success('Investimento atualizado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(`Erro ao atualizar investimento: ${error.message}`);
    },
  });

  const deleteInvestment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('investments')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investments'] });
      toast.success('Investimento excluído com sucesso!');
    },
    onError: (error: any) => {
      toast.error(`Erro ao excluir investimento: ${error.message}`);
    },
  });

  return {
    investments,
    isLoading,
    error,
    addInvestment: addInvestment.mutate,
    updateInvestment: updateInvestment.mutate,
    deleteInvestment: deleteInvestment.mutate,
  };
};
