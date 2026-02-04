import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type WishlistPriority = 'low' | 'medium' | 'high';
export type WishlistStatus = 'pending' | 'purchased' | 'cancelled';

export interface WishlistItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  categoryId?: string;
  subcategory?: string;
  priority: WishlistPriority;
  url?: string;
  imageUrl?: string;
  status: WishlistStatus;
  targetDate?: Date;
  purchasedAt?: Date;
  createdAt: Date;
}

interface WishlistItemRow {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category_id: string | null;
  subcategory: string | null;
  priority: string;
  url: string | null;
  image_url: string | null;
  status: string;
  target_date: string | null;
  purchased_at: string | null;
  created_at: string;
}

const mapRowToItem = (row: WishlistItemRow): WishlistItem => ({
  id: row.id,
  name: row.name,
  description: row.description || undefined,
  price: Number(row.price),
  categoryId: row.category_id || undefined,
  subcategory: row.subcategory || undefined,
  priority: row.priority as WishlistPriority,
  url: row.url || undefined,
  imageUrl: row.image_url || undefined,
  status: row.status as WishlistStatus,
  targetDate: row.target_date ? new Date(row.target_date) : undefined,
  purchasedAt: row.purchased_at ? new Date(row.purchased_at) : undefined,
  createdAt: new Date(row.created_at),
});

export const useWishlist = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: wishlistItems = [], isLoading } = useQuery({
    queryKey: ["wishlist", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("wishlist_items")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data as WishlistItemRow[]).map(mapRowToItem);
    },
    enabled: !!user?.id,
  });

  const addItemMutation = useMutation({
    mutationFn: async (item: Omit<WishlistItem, "id" | "createdAt">) => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      const { error } = await supabase.from("wishlist_items").insert({
        user_id: user.id,
        name: item.name,
        description: item.description || null,
        price: item.price,
        category_id: item.categoryId || null,
        subcategory: item.subcategory || null,
        priority: item.priority,
        url: item.url || null,
        image_url: item.imageUrl || null,
        status: item.status,
        target_date: item.targetDate?.toISOString().split('T')[0] || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      toast.success("Item adicionado à lista de desejos!");
    },
    onError: (error) => {
      console.error("Error adding wishlist item:", error);
      toast.error("Erro ao adicionar item");
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ id, item }: { id: string; item: Partial<WishlistItem> }) => {
      const updateData: Record<string, unknown> = {};
      
      if (item.name !== undefined) updateData.name = item.name;
      if (item.description !== undefined) updateData.description = item.description || null;
      if (item.price !== undefined) updateData.price = item.price;
      if (item.categoryId !== undefined) updateData.category_id = item.categoryId || null;
      if (item.subcategory !== undefined) updateData.subcategory = item.subcategory || null;
      if (item.priority !== undefined) updateData.priority = item.priority;
      if (item.url !== undefined) updateData.url = item.url || null;
      if (item.imageUrl !== undefined) updateData.image_url = item.imageUrl || null;
      if (item.status !== undefined) updateData.status = item.status;
      if (item.targetDate !== undefined) updateData.target_date = item.targetDate?.toISOString().split('T')[0] || null;
      if (item.purchasedAt !== undefined) updateData.purchased_at = item.purchasedAt?.toISOString() || null;

      const { error } = await supabase
        .from("wishlist_items")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      toast.success("Item atualizado!");
    },
    onError: (error) => {
      console.error("Error updating wishlist item:", error);
      toast.error("Erro ao atualizar item");
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("wishlist_items")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      toast.success("Item removido da lista!");
    },
    onError: (error) => {
      console.error("Error deleting wishlist item:", error);
      toast.error("Erro ao remover item");
    },
  });

  const markAsPurchasedMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("wishlist_items")
        .update({
          status: "purchased",
          purchased_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      toast.success("Item marcado como comprado!");
    },
    onError: (error) => {
      console.error("Error marking item as purchased:", error);
      toast.error("Erro ao atualizar item");
    },
  });

  return {
    wishlistItems,
    isLoading,
    pendingItems: wishlistItems.filter(item => item.status === 'pending'),
    purchasedItems: wishlistItems.filter(item => item.status === 'purchased'),
    addItem: addItemMutation.mutate,
    updateItem: updateItemMutation.mutate,
    deleteItem: deleteItemMutation.mutate,
    markAsPurchased: markAsPurchasedMutation.mutate,
    isAdding: addItemMutation.isPending,
    isUpdating: updateItemMutation.isPending,
  };
};
