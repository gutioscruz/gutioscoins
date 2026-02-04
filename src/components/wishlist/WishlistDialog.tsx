import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, Link as LinkIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useFinance } from "@/contexts/FinanceContext";
import { WishlistItem, WishlistPriority } from "@/hooks/useWishlist";

interface WishlistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: WishlistItem | null;
  onSave: (item: Omit<WishlistItem, "id" | "createdAt">) => void;
}

export const WishlistDialog = ({ open, onOpenChange, item, onSave }: WishlistDialogProps) => {
  const { categories } = useFinance();
  const expenseCategories = categories.filter(c => c.type === 'expense');

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    categoryId: "",
    subcategory: "",
    priority: "medium" as WishlistPriority,
    url: "",
    targetDate: undefined as Date | undefined,
  });

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name,
        description: item.description || "",
        price: item.price.toString(),
        categoryId: item.categoryId || "",
        subcategory: item.subcategory || "",
        priority: item.priority,
        url: item.url || "",
        targetDate: item.targetDate,
      });
    } else {
      setFormData({
        name: "",
        description: "",
        price: "",
        categoryId: "",
        subcategory: "",
        priority: "medium",
        url: "",
        targetDate: undefined,
      });
    }
  }, [item, open]);

  const selectedCategory = categories.find(c => c.id === formData.categoryId);
  const subcategories = selectedCategory?.subcategories || [];

  const handleSave = () => {
    if (!formData.name.trim() || !formData.price) {
      return;
    }

    onSave({
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      price: parseFloat(formData.price),
      categoryId: formData.categoryId || undefined,
      subcategory: formData.subcategory || undefined,
      priority: formData.priority,
      url: formData.url.trim() || undefined,
      imageUrl: undefined,
      status: item?.status || "pending",
      targetDate: formData.targetDate,
      purchasedAt: item?.purchasedAt,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? "Editar" : "Novo"} Item</DialogTitle>
          <DialogDescription>
            Adicione um item à sua lista de desejos para acompanhar sua projeção financeira
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Item *</Label>
            <Input
              id="name"
              placeholder="Ex: iPhone 15, Viagem para Portugal..."
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Preço *</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              min="0"
              placeholder="0,00"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Select
                value={formData.categoryId}
                onValueChange={(value) => setFormData({ ...formData, categoryId: value, subcategory: "" })}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {expenseCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subcategory">Subcategoria</Label>
              <Select
                value={formData.subcategory}
                onValueChange={(value) => setFormData({ ...formData, subcategory: value })}
                disabled={subcategories.length === 0}
              >
                <SelectTrigger id="subcategory">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {subcategories.map((sub) => (
                    <SelectItem key={sub} value={sub}>
                      {sub}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority">Prioridade</Label>
            <Select
              value={formData.priority}
              onValueChange={(value: WishlistPriority) => setFormData({ ...formData, priority: value })}
            >
              <SelectTrigger id="priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Baixa</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Data Alvo (opcional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.targetDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.targetDate
                    ? format(formData.targetDate, "PPP", { locale: ptBR })
                    : "Selecione uma data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.targetDate}
                  onSelect={(date) => setFormData({ ...formData, targetDate: date })}
                  initialFocus
                  className="pointer-events-auto"
                  disabled={(date) => date < new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">Link do Produto</Label>
            <div className="relative">
              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="url"
                type="url"
                className="pl-10"
                placeholder="https://..."
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição / Notas</Label>
            <Textarea
              id="description"
              placeholder="Adicione detalhes sobre o item..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <Button 
            onClick={handleSave} 
            className="w-full"
            disabled={!formData.name.trim() || !formData.price}
          >
            {item ? "Salvar Alterações" : "Adicionar Item"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
