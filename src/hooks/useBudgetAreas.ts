import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { BudgetArea } from "@/types/finance";
import { defaultBudgetAreas } from "@/types/finance";

export const useBudgetAreas = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: budgetAreas = [], isLoading, error } = useQuery({
    queryKey: ["budget-areas", user?.id],
    queryFn: async (): Promise<BudgetArea[]> => {
      if (!user) return [];

      // Get budget areas
      const { data: areasData, error: areasError } = await supabase
        .from("budget_areas")
        .select("*")
        .eq("user_id", user.id)
        .order("order_index");

      if (areasError) throw areasError;

      if (!areasData || areasData.length === 0) {
        return [];
      }

      // Get mappings for all areas
      const areaIds = areasData.map(a => a.id);
      const { data: mappingsData, error: mappingsError } = await supabase
        .from("category_area_mappings")
        .select("budget_area_id, category_id")
        .in("budget_area_id", areaIds);

      if (mappingsError) throw mappingsError;

      // Build areas with category IDs
      return areasData.map(area => ({
        id: area.id,
        name: area.name,
        percentage: Number(area.percentage),
        color: area.color,
        orderIndex: area.order_index,
        categoryIds: mappingsData
          ?.filter(m => m.budget_area_id === area.id)
          .map(m => m.category_id) || [],
      }));
    },
    enabled: !!user,
  });

  const initializeDefaultAreas = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Usuário não autenticado");

      const areasToInsert = defaultBudgetAreas.map(area => ({
        user_id: user.id,
        name: area.name,
        percentage: area.percentage,
        color: area.color,
        order_index: area.orderIndex,
      }));

      const { error } = await supabase
        .from("budget_areas")
        .insert(areasToInsert);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget-areas"] });
    },
    onError: (error) => {
      console.error("Error initializing areas:", error);
      toast.error("Erro ao criar áreas padrão");
    },
  });

  const updateAreaPercentage = useMutation({
    mutationFn: async ({ areaId, percentage }: { areaId: string; percentage: number }) => {
      const { error } = await supabase
        .from("budget_areas")
        .update({ percentage })
        .eq("id", areaId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget-areas"] });
    },
    onError: (error) => {
      console.error("Error updating percentage:", error);
      toast.error("Erro ao atualizar porcentagem");
    },
  });

  const updateAllPercentages = useMutation({
    mutationFn: async (areas: { id: string; percentage: number }[]) => {
      // Update all areas in parallel for better performance
      const updatePromises = areas.map((area) =>
        supabase
          .from("budget_areas")
          .update({ percentage: area.percentage })
          .eq("id", area.id)
          .then(({ error }) => {
            if (error) throw error;
          })
      );

      await Promise.all(updatePromises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget-areas"] });
      toast.success("Distribuição salva!");
    },
    onError: (error) => {
      console.error("Error updating percentages:", error);
      toast.error("Erro ao salvar distribuição");
    },
  });

  const addCategoryToArea = useMutation({
    mutationFn: async ({ areaId, categoryId }: { areaId: string; categoryId: string }) => {
      // First remove from any existing area
      await supabase
        .from("category_area_mappings")
        .delete()
        .eq("category_id", categoryId);

      // Then add to new area
      const { error } = await supabase
        .from("category_area_mappings")
        .insert({ budget_area_id: areaId, category_id: categoryId });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget-areas"] });
    },
    onError: (error) => {
      console.error("Error adding category:", error);
      toast.error("Erro ao vincular categoria");
    },
  });

  const removeCategoryFromArea = useMutation({
    mutationFn: async (categoryId: string) => {
      const { error } = await supabase
        .from("category_area_mappings")
        .delete()
        .eq("category_id", categoryId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget-areas"] });
    },
    onError: (error) => {
      console.error("Error removing category:", error);
      toast.error("Erro ao desvincular categoria");
    },
  });

  return {
    budgetAreas,
    isLoading,
    error,
    initializeDefaultAreas: initializeDefaultAreas.mutate,
    isInitializing: initializeDefaultAreas.isPending,
    updateAreaPercentage: updateAreaPercentage.mutate,
    updateAllPercentages: updateAllPercentages.mutate,
    isSaving: updateAllPercentages.isPending,
    addCategoryToArea: addCategoryToArea.mutate,
    removeCategoryFromArea: removeCategoryFromArea.mutate,
  };
};
