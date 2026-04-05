import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Settings, Save, RotateCcw } from "lucide-react";
import type { BudgetArea, Category } from "@/types/finance";
import { CategoryMappingDialog } from "./CategoryMappingDialog";

interface BudgetAreaConfigProps {
  areas: BudgetArea[];
  categories: Category[];
  onSavePercentages: (areas: { id: string; percentage: number }[]) => void;
  onAddCategory: (areaId: string, categoryId: string) => void;
  onRemoveCategory: (categoryId: string) => void;
  isSaving: boolean;
}

const defaultPercentages: Record<string, number> = {
  "Custos Fixos": 50,
  "Lazer": 10,
  "Investimentos": 10,
  "Metas": 10,
  "Compras": 10,
  "Educação": 5,
  "Saúde": 5,
};

export const BudgetAreaConfig = ({
  areas,
  categories,
  onSavePercentages,
  onAddCategory,
  onRemoveCategory,
  isSaving,
}: BudgetAreaConfigProps) => {
  const [localAreas, setLocalAreas] = useState<{ id: string; name: string; percentage: number; color: string }[]>([]);
  const [selectedArea, setSelectedArea] = useState<BudgetArea | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setLocalAreas(areas.map((a) => ({ id: a.id, name: a.name, percentage: a.percentage, color: a.color })));
    setHasChanges(false);
  }, [areas]);

  const totalPercentage = localAreas.reduce((sum, a) => sum + a.percentage, 0);

  const updatePercentage = (areaId: string, newPercentage: number) => {
    setLocalAreas((prev) =>
      prev.map((a) => (a.id === areaId ? { ...a, percentage: newPercentage } : a))
    );
    setHasChanges(true);
  };

  const handleSave = () => {
    onSavePercentages(localAreas.map(a => ({ id: a.id, percentage: a.percentage })));
    setHasChanges(false);
  };

  const handleReset = () => {
    setLocalAreas(prev => prev.map(a => ({
      ...a,
      percentage: defaultPercentages[a.name] ?? 10
    })));
    setHasChanges(true);
  };

  const expenseCategories = categories.filter((c) => c.type === "expense");
  const assignedCategoryIds = areas.flatMap((a) => a.categoryIds);
  const unassignedCategories = expenseCategories.filter(
    (c) => !assignedCategoryIds.includes(c.id)
  );

  const getAreaWithCategories = (areaId: string): BudgetArea | undefined => {
    return areas.find(a => a.id === areaId);
  };

  return (
    <>
      <Card className="h-full">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Controle de Orçamento
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleReset}
              className="text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Resetar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-5">
            {localAreas.map((area) => (
              <div key={area.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setSelectedArea(getAreaWithCategories(area.id) || null)}
                    className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                  >
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: area.color }}
                    />
                    <span className="text-sm font-medium">{area.name}</span>
                  </button>
                  <span className="text-sm font-semibold tabular-nums">
                    {area.percentage}%
                  </span>
                </div>
                <Slider
                  value={[area.percentage]}
                  onValueChange={([val]) => updatePercentage(area.id, val)}
                  max={100}
                  step={5}
                  className="[&_[role=slider]]:h-4 [&_[role=slider]]:w-4"
                  style={{
                    // @ts-ignore - CSS custom property for slider color
                    "--slider-color": area.color,
                  }}
                />
              </div>
            ))}
          </div>

          <div className="pt-4 border-t space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total distribuído:</span>
              <span
                className={`font-bold text-lg ${
                  Math.abs(totalPercentage - 100) < 0.01 ? "text-income" : "text-destructive"
                }`}
              >
                {totalPercentage}%
              </span>
            </div>

            <Button 
              onClick={handleSave} 
              disabled={isSaving || !hasChanges} 
              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold"
              size="lg"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Salvando..." : "Salvar Distribuição"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <CategoryMappingDialog
        area={selectedArea}
        categories={categories}
        unassignedCategories={unassignedCategories}
        onAddCategory={onAddCategory}
        onRemoveCategory={onRemoveCategory}
        onClose={() => setSelectedArea(null)}
      />
    </>
  );
};
