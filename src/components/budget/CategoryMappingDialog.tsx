import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Tag } from "lucide-react";
import type { BudgetArea, Category } from "@/types/finance";

interface CategoryMappingDialogProps {
  area: BudgetArea | null;
  categories: Category[];
  unassignedCategories: Category[];
  onAddCategory: (areaId: string, categoryId: string) => void;
  onRemoveCategory: (categoryId: string) => void;
  onClose: () => void;
}

export const CategoryMappingDialog = ({
  area,
  categories,
  unassignedCategories,
  onAddCategory,
  onRemoveCategory,
  onClose,
}: CategoryMappingDialogProps) => {
  const getCategoryName = (categoryId: string) => {
    return categories.find((c) => c.id === categoryId)?.name || "Categoria";
  };

  if (!area) return null;

  return (
    <Dialog open={!!area} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: area.color }}
            />
            {area.name} - Categorias
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Categorias vinculadas:
            </p>
            <div className="flex flex-wrap gap-2 min-h-[40px] p-3 border rounded-lg bg-muted/30">
              {area.categoryIds.length === 0 ? (
                <span className="text-sm text-muted-foreground italic">
                  Nenhuma categoria vinculada
                </span>
              ) : (
                area.categoryIds.map((catId) => (
                  <Badge
                    key={catId}
                    variant="secondary"
                    className="text-sm gap-1 py-1 px-3"
                  >
                    {getCategoryName(catId)}
                    <button
                      onClick={() => onRemoveCategory(catId)}
                      className="ml-1 hover:text-destructive transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))
              )}
            </div>
          </div>

          {unassignedCategories.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Adicionar categoria:
              </p>
              <Select
                onValueChange={(catId) => onAddCategory(area.id, catId)}
              >
                <SelectTrigger>
                  <Plus className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {unassignedCategories
                    .filter((cat) => cat.id && cat.id.trim() !== "")
                    .map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {unassignedCategories.length === 0 && area.categoryIds.length > 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">
              ✓ Todas as categorias estão vinculadas
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
