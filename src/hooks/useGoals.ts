import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FinancialGoal } from '@/types/finance';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { goalSchema } from '@/lib/validations';

export const useGoals = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: goals = [], isLoading, error } = useQuery({
    queryKey: ['goals'],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return data.map(g => ({
        id: g.id,
        name: g.name,
        description: g.description || undefined,
        type: g.type as FinancialGoal['type'],
        targetAmount: Number(g.target_amount),
        currentAmount: Number(g.current_amount),
        deadline: new Date(g.deadline),
        status: g.status as FinancialGoal['status'],
        createdAt: new Date(g.created_at),
        categoryId: g.category_id || undefined,
      })) as FinancialGoal[];
    },
    enabled: !!user,
  });

  const addGoal = useMutation({
    mutationFn: async (goal: Omit<FinancialGoal, 'id' | 'createdAt'>) => {
      if (!user) throw new Error('User not authenticated');

      // Validate input
      const validated = goalSchema.parse({
        name: goal.name,
        description: goal.description,
        type: goal.type,
        targetAmount: goal.targetAmount,
        currentAmount: goal.currentAmount,
        deadline: goal.deadline,
        status: goal.status,
        categoryId: goal.categoryId,
      });

      const { data, error } = await supabase
        .from('goals')
        .insert({
          user_id: user.id,
          name: validated.name,
          description: validated.description,
          type: validated.type,
          target_amount: validated.targetAmount,
          current_amount: validated.currentAmount,
          deadline: validated.deadline.toISOString(),
          status: validated.status,
          category_id: validated.categoryId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast.success('Meta adicionada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(`Erro ao adicionar meta: ${error.message}`);
    },
  });

  const updateGoal = useMutation({
    mutationFn: async ({ id, goal }: { id: string; goal: Partial<FinancialGoal> }) => {
      const { data, error } = await supabase
        .from('goals')
        .update({
          name: goal.name,
          description: goal.description,
          type: goal.type,
          target_amount: goal.targetAmount,
          current_amount: goal.currentAmount,
          deadline: goal.deadline?.toISOString(),
          status: goal.status,
          category_id: goal.categoryId,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast.success('Meta atualizada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(`Erro ao atualizar meta: ${error.message}`);
    },
  });

  const deleteGoal = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast.success('Meta excluída com sucesso!');
    },
    onError: (error: any) => {
      toast.error(`Erro ao excluir meta: ${error.message}`);
    },
  });

  return {
    goals,
    isLoading,
    error,
    addGoal: addGoal.mutate,
    updateGoal: updateGoal.mutate,
    deleteGoal: deleteGoal.mutate,
  };
};
