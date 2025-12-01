import { useState } from "react";
import { Plus, Pencil, Trash2, Target, TrendingUp, Calendar as CalendarIcon, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GoalType, GoalStatus } from "@/types/finance";
import { toast } from "sonner";
import { useFinance } from "@/contexts/FinanceContext";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/ConfirmDialog";

const goalTypeLabels = {
  savings: "Poupança",
  "debt-payment": "Pagamento de Dívida",
  "expense-reduction": "Redução de Gastos",
  investment: "Investimento",
  "emergency-fund": "Fundo de Emergência",
};

const statusLabels = {
  active: "Ativo",
  completed: "Concluído",
  paused: "Pausado",
  failed: "Falhou",
};

const Goals = () => {
  const { goals, addGoal, updateGoal, deleteGoal, updateGoalProgress, categories } = useFinance();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [progressDialogOpen, setProgressDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [progressAmount, setProgressAmount] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "savings" as GoalType,
    targetAmount: "",
    currentAmount: "",
    deadline: new Date(new Date().setMonth(new Date().getMonth() + 6)),
    status: "active" as GoalStatus,
    categoryId: "",
  });

  const handleSave = () => {
    if (!formData.name.trim() || !formData.targetAmount) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const data = {
      name: formData.name,
      description: formData.description,
      type: formData.type,
      targetAmount: parseFloat(formData.targetAmount),
      currentAmount: parseFloat(formData.currentAmount) || 0,
      deadline: formData.deadline,
      status: formData.status,
      categoryId: formData.categoryId || undefined,
    };

    if (editingId) {
      updateGoal(editingId, data);
      toast.success("Meta atualizada!");
    } else {
      addGoal(data);
      toast.success("Meta criada!");
    }

    resetDialog();
  };

  const handleDelete = (id: string) => {
    setSelectedGoal(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedGoalToDelete) {
      deleteGoal(selectedGoalToDelete);
      toast.success("Meta excluída!");
    }
    setDeleteDialogOpen(false);
    setSelectedGoalToDelete(null);
  };

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedGoalToDelete, setSelectedGoalToDelete] = useState<string | null>(null);

  const handleUpdateProgress = () => {
    if (!selectedGoal || !progressAmount) {
      toast.error("Digite um valor");
      return;
    }

    updateGoalProgress(selectedGoal, parseFloat(progressAmount));
    toast.success("Progresso atualizado!");
    setProgressDialogOpen(false);
    setSelectedGoal(null);
    setProgressAmount("");
  };

  const resetDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setFormData({
      name: "",
      description: "",
      type: "savings",
      targetAmount: "",
      currentAmount: "",
      deadline: new Date(new Date().setMonth(new Date().getMonth() + 6)),
      status: "active",
      categoryId: "",
    });
  };

  const openEditDialog = (id: string) => {
    const goal = goals.find((g) => g.id === id);
    if (!goal) return;

    setEditingId(id);
    setFormData({
      name: goal.name,
      description: goal.description,
      type: goal.type,
      targetAmount: goal.targetAmount.toString(),
      currentAmount: goal.currentAmount.toString(),
      deadline: goal.deadline,
      status: goal.status,
      categoryId: goal.categoryId || "",
    });
    setDialogOpen(true);
  };

  const openProgressDialog = (id: string) => {
    const goal = goals.find((g) => g.id === id);
    if (!goal) return;

    setSelectedGoal(id);
    setProgressAmount(goal.currentAmount.toString());
    setProgressDialogOpen(true);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const activeGoals = goals.filter((g) => g.status === "active");
  const completedGoals = goals.filter((g) => g.status === "completed");

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Metas Financeiras</h1>
            <p className="text-muted-foreground mt-1">
              Defina e acompanhe seus objetivos financeiros
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" onClick={() => setEditingId(null)}>
                <Plus className="w-4 h-4" />
                Nova Meta
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? "Editar" : "Nova"} Meta Financeira</DialogTitle>
                <DialogDescription>
                  Configure uma meta para atingir seus objetivos
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome da Meta</Label>
                  <Input
                    id="name"
                    placeholder="Ex: Comprar um carro, Viagem..."
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    placeholder="Descreva sua meta..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Tipo</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value: GoalType) => setFormData({ ...formData, type: value })}
                    >
                      <SelectTrigger id="type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="savings">Poupança</SelectItem>
                        <SelectItem value="debt-payment">Pagamento de Dívida</SelectItem>
                        <SelectItem value="expense-reduction">Redução de Gastos</SelectItem>
                        <SelectItem value="investment">Investimento</SelectItem>
                        <SelectItem value="emergency-fund">Fundo de Emergência</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value: GoalStatus) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger id="status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Ativo</SelectItem>
                        <SelectItem value="paused">Pausado</SelectItem>
                        <SelectItem value="completed">Concluído</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="targetAmount">Valor Alvo</Label>
                    <Input
                      id="targetAmount"
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      value={formData.targetAmount}
                      onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="currentAmount">Valor Atual</Label>
                    <Input
                      id="currentAmount"
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      value={formData.currentAmount}
                      onChange={(e) => setFormData({ ...formData, currentAmount: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Prazo</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.deadline && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.deadline
                          ? format(formData.deadline, "PPP", { locale: ptBR })
                          : "Selecione"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.deadline}
                        onSelect={(date) => date && setFormData({ ...formData, deadline: date })}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {formData.type === "expense-reduction" && (
                  <div className="space-y-2">
                    <Label htmlFor="category">Categoria (opcional)</Label>
                    <Select
                      value={formData.categoryId}
                      onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
                    >
                      <SelectTrigger id="category">
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories
                          .filter((c) => c.type === "expense")
                          .map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <Button onClick={handleSave} className="w-full">
                  {editingId ? "Salvar Alterações" : "Criar Meta"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {activeGoals.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-4">Metas Ativas</h2>
            <div className="grid gap-6 md:grid-cols-2">
              {activeGoals.map((goal) => {
                const progress = (goal.currentAmount / goal.targetAmount) * 100;
                const daysLeft = differenceInDays(goal.deadline, new Date());
                const isOverdue = daysLeft < 0;

                return (
                  <Card key={goal.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-lg">{goal.name}</CardTitle>
                            <Badge>{goalTypeLabels[goal.type]}</Badge>
                          </div>
                          {goal.description && (
                            <CardDescription className="mt-1">{goal.description}</CardDescription>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openProgressDialog(goal.id)}
                          >
                            <TrendingUp className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openEditDialog(goal.id)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => {
                              setSelectedGoalToDelete(goal.id);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <div className="flex justify-between items-end mb-2">
                          <div>
                            <p className="text-2xl font-bold text-primary">
                              {formatCurrency(goal.currentAmount)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              de {formatCurrency(goal.targetAmount)}
                            </p>
                          </div>
                          <p className="text-3xl font-bold">{progress.toFixed(0)}%</p>
                        </div>
                        <Progress value={progress} className="h-3" />
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="flex items-center gap-2 text-sm">
                          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                          <span className={isOverdue ? "text-destructive" : "text-muted-foreground"}>
                            {isOverdue
                              ? `${Math.abs(daysLeft)} dias atrasado`
                              : `${daysLeft} dias restantes`}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {format(goal.deadline, "dd/MM/yyyy")}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {completedGoals.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-4">Metas Concluídas</h2>
            <div className="grid gap-6 md:grid-cols-2">
              {completedGoals.map((goal) => (
                <Card key={goal.id} className="bg-muted/50">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-5 w-5 text-income" />
                          <CardTitle className="text-lg">{goal.name}</CardTitle>
                          <Badge variant="secondary">{goalTypeLabels[goal.type]}</Badge>
                        </div>
                        {goal.description && (
                          <CardDescription className="mt-1">{goal.description}</CardDescription>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => {
                          setSelectedGoalToDelete(goal.id);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-2xl font-bold text-income">
                        {formatCurrency(goal.currentAmount)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Meta atingida em {format(goal.deadline, "dd/MM/yyyy")}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {goals.length === 0 && (
          <Card className="py-12">
            <CardContent className="text-center">
              <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">Nenhuma meta criada</p>
              <p className="text-sm text-muted-foreground mb-4">
                Defina metas financeiras para alcançar seus objetivos
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeira Meta
              </Button>
            </CardContent>
          </Card>
        )}

        <Dialog open={progressDialogOpen} onOpenChange={setProgressDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Atualizar Progresso</DialogTitle>
              <DialogDescription>Atualize o valor atual da sua meta</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="progress">Valor Atual</Label>
                <Input
                  id="progress"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={progressAmount}
                  onChange={(e) => setProgressAmount(e.target.value)}
                />
              </div>
              <Button onClick={handleUpdateProgress} className="w-full">
                Atualizar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default Goals;
