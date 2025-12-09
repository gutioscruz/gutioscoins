import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Settings, Save, AlertCircle, Plus, X } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BudgetArea, Category } from "@/types/finance";

interface BudgetAreaConfigProps {
  areas: BudgetArea[];
  categories: Category[];
  onSavePercentages: (areas: { id: string; percentage: number }[]) => void;
  onAddCategory: (areaId: string, categoryId: string) => void;
  onRemoveCategory: (categoryId: string) => void;
  isSaving: boolean;
}

export const BudgetAreaConfig = ({
  areas,
  categories,
  onSavePercentages,
  onAddCategory,
  onRemoveCategory,
  isSaving,
}: BudgetAreaConfigProps) => {
  const [localAreas, setLocalAreas] = useState<{ id: string; percentage: number }[]>([]);
  const [openArea, setOpenArea] = useState<string | null>(null);

  useEffect(() => {
    setLocalAreas(areas.map((a) => ({ id: a.id, percentage: a.percentage })));
  }, [areas]);

  const totalPercentage = localAreas.reduce((sum, a) => sum + a.percentage, 0);
  const isBalanced = Math.abs(totalPercentage - 100) < 0.01;

  const updatePercentage = (areaId: string, newPercentage: number) => {
    setLocalAreas((prev) =>
      prev.map((a) => (a.id === areaId ? { ...a, percentage: newPercentage } : a))
    );
  };

  const handleSave = () => {
    onSavePercentages(localAreas);
  };

  const expenseCategories = categories.filter((c) => c.type === "expense");
  const assignedCategoryIds = areas.flatMap((a) => a.categoryIds);
  const unassignedCategories = expenseCategories.filter(
    (c) => !assignedCategoryIds.includes(c.id)
  );

  const getCategoryName = (categoryId: string) => {
    return categories.find((c) => c.id === categoryId)?.name || "Categoria";
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configurar Áreas
          </CardTitle>
          <Button onClick={handleSave} disabled={isSaving} size="sm">
            <Save className="h-4 w-4 mr-2" />
            Salvar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isBalanced && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Total: {totalPercentage.toFixed(0)}% (deve ser 100%)</span>
          </div>
        )}

        <div className="space-y-2">
          {areas.map((area) => {
            const localArea = localAreas.find((a) => a.id === area.id);
            const percentage = localArea?.percentage ?? area.percentage;

            return (
              <Collapsible
                key={area.id}
                open={openArea === area.id}
                onOpenChange={(open) => setOpenArea(open ? area.id : null)}
              >
                <div className="border rounded-lg overflow-hidden">
                  <CollapsibleTrigger className="w-full p-3 flex items-center gap-3 hover:bg-muted/50 transition-colors">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: area.color }}
                    />
                    <span className="font-medium text-sm flex-1 text-left">
                      {area.name}
                    </span>
                    <Badge variant="outline" className="font-mono">
                      {percentage.toFixed(0)}%
                    </Badge>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="p-3 pt-0 space-y-4 border-t">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Porcentagem</span>
                          <span>{percentage.toFixed(0)}%</span>
                        </div>
                        <Slider
                          value={[percentage]}
                          onValueChange={([val]) => updatePercentage(area.id, val)}
                          max={100}
                          step={1}
                        />
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">
                          Categorias vinculadas:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {area.categoryIds.length === 0 ? (
                            <span className="text-xs text-muted-foreground italic">
                              Nenhuma categoria
                            </span>
                          ) : (
                            area.categoryIds.map((catId) => (
                              <Badge
                                key={catId}
                                variant="secondary"
                                className="text-xs gap-1"
                              >
                                {getCategoryName(catId)}
                                <button
                                  onClick={() => onRemoveCategory(catId)}
                                  className="hover:text-destructive"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))
                          )}
                        </div>

                        {unassignedCategories.length > 0 && (
                          <Select
                            onValueChange={(catId) => onAddCategory(area.id, catId)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <Plus className="h-3 w-3 mr-1" />
                              <SelectValue placeholder="Vincular categoria" />
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
                        )}
                      </div>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>

        <div className="pt-3 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total distribuído:</span>
            <span
              className={`font-bold ${
                isBalanced ? "text-income" : "text-destructive"
              }`}
            >
              {totalPercentage.toFixed(0)}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
