import { useState } from "react";
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Categorias</h1>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" onClick={() => setEditingCategory(null)}>
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
          <Card className="border-income">
            <CardHeader>
              <CardTitle className="text-income">Receitas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {incomeCategories.map((category) => (
                <div key={category.id} className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
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
                      <span className="font-medium">{category.name}</span>
                      <Badge variant="secondary">{category.subcategories.length}</Badge>
                    </div>
                    <div className="flex gap-1">
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
                    <div className="ml-8 space-y-2">
                      {category.subcategories.map((sub) => (
                        <div key={sub} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                          <span className="text-sm">{sub}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-destructive"
                            onClick={() => handleRemoveSubcategory(category.id, sub)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <Input
                          placeholder="Nova subcategoria"
                          value={newSubcategory}
                          onChange={(e) => setNewSubcategory(e.target.value)}
                          className="h-8 text-sm"
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
            </CardContent>
          </Card>

          <Card className="border-expense">
            <CardHeader>
              <CardTitle className="text-expense">Despesas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {expenseCategories.map((category) => (
                <div key={category.id} className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
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
                      <span className="font-medium">{category.name}</span>
                      <Badge variant="secondary">{category.subcategories.length}</Badge>
                    </div>
                    <div className="flex gap-1">
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
                    <div className="ml-8 space-y-2">
                      {category.subcategories.map((sub) => (
                        <div key={sub} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                          <span className="text-sm">{sub}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-destructive"
                            onClick={() => handleRemoveSubcategory(category.id, sub)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <Input
                          placeholder="Nova subcategoria"
                          value={newSubcategory}
                          onChange={(e) => setNewSubcategory(e.target.value)}
                          className="h-8 text-sm"
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
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Categories;
