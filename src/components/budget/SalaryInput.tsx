import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { DollarSign, Calculator, Save } from "lucide-react";
import type { Transaction } from "@/types/finance";

interface SalaryInputProps {
  settings: { monthlySalary: number | null; salaryAutoCalculate: boolean } | null;
  transactions: Transaction[];
  selectedMonth: number;
  selectedYear: number;
  onSave: (salary: number | null, autoCalculate: boolean) => Promise<void>;
  isUpdating: boolean;
}

export const SalaryInput = ({
  settings,
  transactions,
  selectedMonth,
  selectedYear,
  onSave,
  isUpdating,
}: SalaryInputProps) => {
  const [autoCalculate, setAutoCalculate] = useState(settings?.salaryAutoCalculate ?? true);
  const [manualSalary, setManualSalary] = useState<string>(
    settings?.monthlySalary?.toString() || ""
  );

  useEffect(() => {
    if (settings) {
      setAutoCalculate(settings.salaryAutoCalculate);
      setManualSalary(settings.monthlySalary?.toString() || "");
    }
  }, [settings]);

  const calculatedSalary = useMemo(() => {
    return transactions
      .filter((t) => {
        const transDate = new Date(t.date);
        return (
          t.type === "income" &&
          transDate.getMonth() === selectedMonth &&
          transDate.getFullYear() === selectedYear
        );
      })
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions, selectedMonth, selectedYear]);

  const effectiveSalary = autoCalculate
    ? calculatedSalary
    : parseFloat(manualSalary) || 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const handleSave = async () => {
    await onSave(autoCalculate ? null : parseFloat(manualSalary) || null, autoCalculate);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          Salário Base Mensal
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="auto-calculate" className="flex items-center gap-2 cursor-pointer">
            <Calculator className="h-4 w-4 text-muted-foreground" />
            Calcular automaticamente
          </Label>
          <Switch
            id="auto-calculate"
            checked={autoCalculate}
            onCheckedChange={setAutoCalculate}
          />
        </div>

        {autoCalculate ? (
          <div className="rounded-lg bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">Receitas do mês:</p>
            <p className="text-2xl font-bold text-income">{formatCurrency(calculatedSalary)}</p>
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="manual-salary">Valor mensal:</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  R$
                </span>
                <Input
                  id="manual-salary"
                  type="number"
                  value={manualSalary}
                  onChange={(e) => setManualSalary(e.target.value)}
                  className="pl-10"
                  placeholder="0,00"
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t">
          <div>
            <p className="text-xs text-muted-foreground">Salário efetivo:</p>
            <p className="text-lg font-semibold">{formatCurrency(effectiveSalary)}</p>
          </div>
          <Button onClick={handleSave} disabled={isUpdating} size="sm">
            <Save className="h-4 w-4 mr-2" />
            Salvar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
