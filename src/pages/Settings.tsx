import React, { useState, useEffect } from "react";
import { useUserSettings } from "@/hooks/useUserSettings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Bot, User, Wallet, Sparkles, Save, ShieldCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const Settings = () => {
  const { settings, isLoading, isUpdating, updateSalary, updateAiContext } = useUserSettings();
  const [monthlySalary, setMonthlySalary] = useState<string>("");
  const [aiContext, setAiContext] = useState<string>("");
  const [autoCalculate, setAutoCalculate] = useState<boolean>(false);

  useEffect(() => {
    if (settings) {
      setMonthlySalary(settings.monthlySalary?.toString() || "");
      setAiContext(settings.aiContext || "");
      setAutoCalculate(settings.salaryAutoCalculate || false);
    }
  }, [settings]);

  const handleSaveFinance = async () => {
    try {
      const salaryNum = monthlySalary === "" ? null : Number(monthlySalary);
      await updateSalary(salaryNum, autoCalculate);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveAlfred = async () => {
    try {
      await updateAiContext(aiContext);
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto py-8">
        <Skeleton className="h-12 w-64 mb-8" />
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-4xl mx-auto py-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Configurações
        </h1>
        <p className="text-muted-foreground mt-2">
          Gerencie suas preferências financeiras e personalize a inteligência do Alfred.
        </p>
      </div>

      <div className="grid gap-8">
        {/* Perfil Financeiro */}
        <Card className="border-primary/10 bg-card/50 backdrop-blur-sm overflow-hidden group hover:border-primary/30 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <CardTitle>Perfil Financeiro</CardTitle>
                <CardDescription>Defina sua base de renda para cálculos de projeção.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 relative">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="salary">Salário Mensal Estimado</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">R$</span>
                  <Input
                    id="salary"
                    type="number"
                    placeholder="0,00"
                    className="pl-9 bg-background/50"
                    value={monthlySalary}
                    onChange={(e) => setMonthlySalary(e.target.value)}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Este valor é usado pelo Alfred para calcular sua capacidade de investimento e metas.
                </p>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/10">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Cálculo Automático</Label>
                  <p className="text-xs text-muted-foreground italic">
                    (Em breve) Deixar o Alfred estimar seu salário baseado em entradas recorrentes.
                  </p>
                </div>
                <Switch 
                  disabled 
                  checked={autoCalculate}
                  onCheckedChange={setAutoCalculate}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button 
                onClick={handleSaveFinance} 
                disabled={isUpdating}
                className="gap-2 shadow-lg shadow-primary/20"
              >
                {isUpdating ? <Sparkles className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar Finanças
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Consultor Alfred */}
        <Card className="border-secondary/10 bg-card/50 backdrop-blur-sm overflow-hidden group hover:border-secondary/30 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary/10 text-secondary">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <CardTitle>Personalidade do Alfred</CardTitle>
                <CardDescription>Dê instruções específicas sobre como o Alfred deve se comportar.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 relative">
            <div className="space-y-3">
              <Label htmlFor="context">Contexto de IA (Persona)</Label>
              <Textarea
                id="context"
                placeholder="Ex: Seja conservador nas dicas, fale de forma executiva, foque em reduzir gastos com alimentação fora de casa..."
                className="min-h-[150px] bg-background/50 resize-none"
                value={aiContext}
                onChange={(e) => setAiContext(e.target.value)}
              />
              <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/5 border border-secondary/10 text-[10px] text-muted-foreground">
                <ShieldCheck className="w-4 h-4 text-secondary/60 shrink-0" />
                <span>
                  O Alfred lembrará dessas preferências em todas as conversas. Você pode definir seu perfil de investidor, tom de voz e metas de vida aqui.
                </span>
              </div>
            </div>
            <div className="flex justify-end">
              <Button 
                onClick={handleSaveAlfred} 
                variant="secondary"
                disabled={isUpdating}
                className="gap-2 shadow-lg shadow-secondary/20"
              >
                {isUpdating ? <Sparkles className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar Alfred
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
