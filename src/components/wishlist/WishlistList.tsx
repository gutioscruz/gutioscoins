import { useState } from "react";
import { Plus, Heart, ShoppingBag, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WishlistCard } from "./WishlistCard";
import { WishlistDialog } from "./WishlistDialog";
import { useWishlist, WishlistItem } from "@/hooks/useWishlist";
import { ConfirmDialog } from "@/components/ConfirmDialog";

export const WishlistList = () => {
  const { pendingItems, purchasedItems, addItem, updateItem, deleteItem, markAsPurchased, isLoading } = useWishlist();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WishlistItem | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  const handleEdit = (item: WishlistItem) => {
    setEditingItem(item);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setItemToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      deleteItem(itemToDelete);
    }
    setDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  const handleSave = (item: Omit<WishlistItem, "id" | "createdAt">) => {
    if (editingItem) {
      updateItem({ id: editingItem.id, item });
    } else {
      addItem(item);
    }
    setEditingItem(null);
  };

  const openNewDialog = () => {
    setEditingItem(null);
    setDialogOpen(true);
  };

  const filteredItems = priorityFilter === "all"
    ? pendingItems
    : pendingItems.filter(item => item.priority === priorityFilter);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const totalPending = pendingItems.reduce((sum, item) => sum + item.price, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button onClick={openNewDialog} className="gap-2">
            <Plus className="w-4 h-4" />
            Novo Item
          </Button>
          
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="low">Baixa</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {pendingItems.length > 0 && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-base px-3 py-1">
              {pendingItems.length} {pendingItems.length === 1 ? 'item' : 'itens'} • {formatCurrency(totalPending)}
            </Badge>
          </div>
        )}
      </div>

      {/* Pending Items */}
      {filteredItems.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => (
            <WishlistCard
              key={item.id}
              item={item}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onMarkPurchased={markAsPurchased}
            />
          ))}
        </div>
      ) : pendingItems.length === 0 ? (
        <Card className="py-12">
          <CardContent className="text-center">
            <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">Lista de desejos vazia</p>
            <p className="text-sm text-muted-foreground mb-4">
              Adicione itens que você deseja comprar e veja a projeção financeira
            </p>
            <Button onClick={openNewDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Primeiro Item
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="py-8">
          <CardContent className="text-center">
            <p className="text-muted-foreground">
              Nenhum item com prioridade "{priorityFilter === 'high' ? 'Alta' : priorityFilter === 'medium' ? 'Média' : 'Baixa'}"
            </p>
          </CardContent>
        </Card>
      )}

      {/* Purchased Items */}
      {purchasedItems.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-income" />
            Itens Comprados
          </h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {purchasedItems.map((item) => (
              <Card key={item.id} className="bg-muted/50">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium line-through text-muted-foreground">{item.name}</p>
                      <p className="text-lg font-bold text-income">{formatCurrency(item.price)}</p>
                      {item.purchasedAt && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Comprado em {new Date(item.purchasedAt).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => handleDelete(item.id)}
                    >
                      Remover
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Dialogs */}
      <WishlistDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        item={editingItem}
        onSave={handleSave}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Remover Item"
        description="Tem certeza que deseja remover este item da lista de desejos?"
        confirmText="Remover"
        onConfirm={confirmDelete}
      />
    </div>
  );
};
