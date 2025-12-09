import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { UserSettings } from "@/types/finance";

export const useUserSettings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: settings, isLoading, error } = useQuery({
    queryKey: ["user-settings", user?.id],
    queryFn: async (): Promise<UserSettings | null> => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) return null;

      return {
        id: data.id,
        monthlySalary: data.monthly_salary ? Number(data.monthly_salary) : null,
        salaryAutoCalculate: data.salary_auto_calculate,
      };
    },
    enabled: !!user,
  });

  const upsertSettings = useMutation({
    mutationFn: async (input: { monthlySalary: number | null; salaryAutoCalculate: boolean }) => {
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("user_settings")
        .upsert({
          user_id: user.id,
          monthly_salary: input.monthlySalary,
          salary_auto_calculate: input.salaryAutoCalculate,
        }, {
          onConflict: "user_id",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-settings"] });
      toast.success("Configurações salvas!");
    },
    onError: (error) => {
      console.error("Error updating settings:", error);
      toast.error("Erro ao salvar configurações");
    },
  });

  const updateSalary = async (salary: number | null, autoCalculate: boolean) => {
    await upsertSettings.mutateAsync({
      monthlySalary: salary,
      salaryAutoCalculate: autoCalculate,
    });
  };

  return {
    settings,
    isLoading,
    error,
    updateSalary,
    isUpdating: upsertSettings.isPending,
  };
};
