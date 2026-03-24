import { useState } from "react";
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Category, TransactionType } from "@/types/finance";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useFinance } from "@/contexts/FinanceContext";

const Categories = () => {
  const { categories, addCategory, updateCategory, deleteCategory, addSubcategory, removeSubcategory } = useFinance();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryType, setNewCategoryType] = useState<TransactionType>("expense");
  const [newSubcategory, setNewSubcategory] = useState("");

  const toggleCategory = (id: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedCategories(newExpanded);
  };

  const handleSaveCategory = () => {
    if (!newCategoryName.trim()) {
      toast.error("Digite um nome para a categoria");
      return;
    }

    if (editingCategory) {
      updateCategory(editingCategory.id, {
        name: newCategoryName,
        type: newCategoryType,
        subcategories: editingCategory.subcategories,
      });
      toast.success("Categoria atualizada!");
    } else {
      addCategory({
        name: newCategoryName,
        type: newCategoryType,
        subcategories: [],
      });
      toast.success("Categoria criada!");
    }

    resetDialog();
  };

  const handleAddSubcategory = (categoryId: string) => {
    if (!newSubcategory.trim()) {
      toast.error("Digite um nome para a subcategoria");
      return;
    }

    addSubcategory(categoryId, newSubcategory);
    setNewSubcategory("");
    toast.success("Subcategoria adicionada!");
  };

  const handleRemoveSubcategory = (categoryId: string, subcategory: string) => {
    removeSubcategory(categoryId, subcategory);
    toast.success("Subcategoria removida!");
  };

  const handleDeleteCategory = (id: string) => {
    deleteCategory(id);
    toast.success("Categoria excluída!");
  };

  const resetDialog = () => {
    setDialogOpen(false);
    setEditingCategory(null);
    setNewCategoryName("");
    setNewCategoryType("expense");
  };

  const openEditDialog = (category: Category) => {
    setEditingCategory(category);
    setNewCategoryName(category.name);
    setNewCategoryType(category.type);
    setDialogOpen(true);
  };

  const incomeCategories = categories.filter(c => c.type === "income");
  const expenseCategories = categories.filter(c => c.type === "expense");

  const CategoryList = ({ items, type }: { items: Category[]; type: "income" | "expense" }) => (
    <div className="space-y-2">
      {items.map((category) => (
        <div key={category.id} className="space-y-2">
          <div className="group flex items-center justify-between p-3 rounded-xl hover:bg-accent/30 transition-all duration-200">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => toggleCategory(category.id)}
              >
                {expandedCategories.has(category.id) ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
              <span className="text-sm font-semibold">{category.name}</span>
              <Badge variant="secondary" className="text-xs rounded-full">
                {category.subcategories.length}
              </Badge>
            </div>
            <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => openEditDialog(category)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-destructive"
                onClick={() => handleDeleteCategory(category.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {expandedCategories.has(category.id) && (
            <div className="ml-10 space-y-1.5">
              {category.subcategories.map((sub) => (
                <div key={sub} className="group flex items-center justify-between p-2.5 rounded-lg hover:bg-accent/20 transition-colors">
                  <span className="text-sm text-muted-foreground">{sub}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-destructive opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                    onClick={() => handleRemoveSubcategory(category.id, sub)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2 pt-1">
                <Input
                  placeholder="Nova subcategoria"
                  value={newSubcategory}
                  onChange={(e) => setNewSubcategory(e.target.value)}
                  className="h-8 text-sm bg-background/50"
                />
                <Button
                  size="sm"
                  className="h-8"
                  onClick={() => handleAddSubcategory(category.id)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Categorias</h1>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 rounded-xl" onClick={() => setEditingCategory(null)}>
                <Plus className="w-4 h-4" />
                Nova Categoria
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingCategory ? "Editar" : "Nova"} Categoria</DialogTitle>
                <DialogDescription>
                  {editingCategory ? "Edite" : "Crie"} uma categoria para organizar suas transações.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    placeholder="Ex: Educação"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Tipo</Label>
                  <Select value={newCategoryType} onValueChange={(value: TransactionType) => setNewCategoryType(value)}>
                    <SelectTrigger id="type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Receita</SelectItem>
                      <SelectItem value="expense">Despesa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleSaveCategory} className="w-full">
                  {editingCategory ? "Salvar Alterações" : "Criar Categoria"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Receitas */}
          <div className="rounded-3xl bg-card/40 backdrop-blur-md border-none shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-income/10">
                <TrendingUp className="h-5 w-5 text-income" />
              </div>
              <h2 className="text-lg font-semibold">Receitas</h2>
              <Badge variant="secondary" className="rounded-full text-xs">
                {incomeCategories.length}
              </Badge>
            </div>
            <CategoryList items={incomeCategories} type="income" />
          </div>

          {/* Despesas */}
          <div className="rounded-3xl bg-card/40 backdrop-blur-md border-none shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-muted">
                <TrendingDown className="h-5 w-5 text-muted-foreground" />
              </div>
              <h2 className="text-lg font-semibold">Despesas</h2>
              <Badge variant="secondary" className="rounded-full text-xs">
                {expenseCategories.length}
              </Badge>
            </div>
            <CategoryList items={expenseCategories} type="expense" />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Categories;
