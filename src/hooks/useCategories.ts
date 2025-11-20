import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Category } from '@/types/finance';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { categorySchema } from '@/lib/validations';

export const useCategories = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: categories = [], isLoading, error } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (error) throw error;
      
      return data.map(c => ({
        id: c.id,
        name: c.name,
        type: c.type as 'income' | 'expense',
        subcategories: c.subcategories || [],
      })) as Category[];
    },
    enabled: !!user,
  });

  const addCategory = useMutation({
    mutationFn: async (category: Omit<Category, 'id'>) => {
      if (!user) throw new Error('User not authenticated');

      // Validate input
      const validated = categorySchema.parse(category);

      const { data, error } = await supabase
        .from('categories')
        .insert({
          user_id: user.id,
          name: validated.name,
          type: validated.type,
          subcategories: validated.subcategories,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Categoria adicionada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(`Erro ao adicionar categoria: ${error.message}`);
    },
  });

  const updateCategory = useMutation({
    mutationFn: async ({ id, category }: { id: string; category: Omit<Category, 'id'> }) => {
      // Validate input
      const validated = categorySchema.parse(category);

      const { data, error } = await supabase
        .from('categories')
        .update({
          name: validated.name,
          type: validated.type,
          subcategories: validated.subcategories,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Categoria atualizada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(`Erro ao atualizar categoria: ${error.message}`);
    },
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Categoria excluída com sucesso!');
    },
    onError: (error: any) => {
      toast.error(`Erro ao excluir categoria: ${error.message}`);
    },
  });

  return {
    categories,
    isLoading,
    error,
    addCategory: addCategory.mutate,
    updateCategory: updateCategory.mutate,
    deleteCategory: deleteCategory.mutate,
  };
};
