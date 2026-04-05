import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Alert } from '@/types/finance';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { alertSchema } from '@/lib/validations';

export const useAlerts = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: alerts = [], isLoading, error } = useQuery({
    queryKey: ['alerts'],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return data.map(a => ({
        id: a.id,
        type: a.type as 'success' | 'warning' | 'error' | 'info',
        title: a.title,
        message: a.message,
        createdAt: new Date(a.created_at),
        read: a.read,
      })) as Alert[];
    },
    enabled: !!user,
  });

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('alerts')
        .update({ read: true })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
    onError: (error: any) => {
      toast.error(`Erro ao marcar alerta como lido: ${error.message}`);
    },
  });

  const clearAll = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('alerts')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      toast.success('Todos os alertas foram limpos!');
    },
    onError: (error: any) => {
      toast.error(`Erro ao limpar alertas: ${error.message}`);
    },
  });

  const addAlert = useMutation({
    mutationFn: async (alert: Omit<Alert, 'id' | 'createdAt' | 'read'>) => {
      if (!user) throw new Error('User not authenticated');

      // Validate input
      const validated = alertSchema.parse(alert);

      const { data, error } = await supabase
        .from('alerts')
        .insert({
          user_id: user.id,
          type: validated.type,
          title: validated.title,
          message: validated.message,
          read: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
    onError: (error: any) => {
      toast.error(`Erro ao criar alerta: ${error.message}`);
    },
  });

  return {
    alerts,
    isLoading,
    error,
    markAsRead: markAsRead.mutate,
    clearAll: clearAll.mutate,
    addAlert: addAlert.mutate,
  };
};
