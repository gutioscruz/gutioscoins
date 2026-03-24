import { useState } from "react";
import { Plus, Pencil, Trash2, Target, TrendingUp, Calendar as CalendarIcon, CheckCircle2, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { WishlistList } from "@/components/wishlist/WishlistList";

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
  const [activeTab, setActiveTab] = useState("goals");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedGoalToDelete, setSelectedGoalToDelete] = useState<string | null>(null);

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

  const confirmDelete = () => {
    if (selectedGoalToDelete) {
      deleteGoal(selectedGoalToDelete);
      toast.success("Meta excluída!");
    }
    setDeleteDialogOpen(false);
    setSelectedGoalToDelete(null);
  };

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
            <h1 className="text-3xl font-bold">Metas & Desejos</h1>
            <p className="text-muted-foreground mt-1">
              Acompanhe seus objetivos e lista de desejos
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2 rounded-2xl bg-muted/50 p-1">
            <TabsTrigger value="goals" className="gap-2 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Target className="h-4 w-4" />
              Metas Financeiras
            </TabsTrigger>
            <TabsTrigger value="wishlist" className="gap-2 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Heart className="h-4 w-4" />
              Lista de Desejos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="goals" className="space-y-6">
            <div className="flex justify-end">
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2 rounded-xl" onClick={() => setEditingId(null)}>
                    <Plus className="w-4 h-4" />
                    Nova Meta
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl border-none bg-card/80 backdrop-blur-xl">
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
                        className="rounded-xl"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Descrição</Label>
                      <Textarea
                        id="description"
                        placeholder="Descreva sua meta..."
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="rounded-xl"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="type">Tipo</Label>
                        <Select
                          value={formData.type}
                          onValueChange={(value: GoalType) => setFormData({ ...formData, type: value })}
                        >
                          <SelectTrigger id="type" className="rounded-xl">
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
                          <SelectTrigger id="status" className="rounded-xl">
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
                          className="rounded-xl"
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
                          className="rounded-xl"
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
                              "w-full justify-start text-left font-normal rounded-xl",
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
                          <SelectTrigger id="category" className="rounded-xl">
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

                    <Button onClick={handleSave} className="w-full rounded-xl">
                      {editingId ? "Salvar Alterações" : "Criar Meta"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {activeGoals.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Metas Ativas</h2>
                <div className="grid gap-5 md:grid-cols-2">
                  {activeGoals.map((goal) => {
                    const progress = (goal.currentAmount / goal.targetAmount) * 100;
                    const daysLeft = differenceInDays(goal.deadline, new Date());
                    const isOverdue = daysLeft < 0;

                    return (
                      <div key={goal.id} className="group rounded-3xl bg-card/40 backdrop-blur-md border-none shadow-sm p-6 space-y-4 transition-all duration-300 hover:shadow-md">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-base font-semibold">{goal.name}</h3>
                              <Badge className="rounded-full text-xs bg-primary/10 text-primary border-none">
                                {goalTypeLabels[goal.type]}
                              </Badge>
                            </div>
                            {goal.description && (
                              <p className="text-xs text-muted-foreground">{goal.description}</p>
                            )}
                          </div>
                          <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 rounded-full hover:bg-accent/50"
                              onClick={() => openProgressDialog(goal.id)}
                            >
                              <TrendingUp className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-accent/50" onClick={() => openEditDialog(goal.id)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 rounded-full hover:bg-destructive/10 text-destructive"
                              onClick={() => {
                                setSelectedGoalToDelete(goal.id);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between items-end mb-2">
                            <div>
                              <p className="text-2xl font-bold text-primary tabular-nums">
                                {formatCurrency(goal.currentAmount)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                de {formatCurrency(goal.targetAmount)}
                              </p>
                            </div>
                            <p className="text-2xl font-bold tabular-nums">{progress.toFixed(0)}%</p>
                          </div>
                          <Progress value={progress} className="h-1.5" />
                        </div>

                        <div className="flex items-center justify-between pt-2">
                          <div className="flex items-center gap-2 text-xs">
                            <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className={isOverdue ? "text-destructive" : "text-muted-foreground"}>
                              {isOverdue
                                ? `${Math.abs(daysLeft)} dias atrasado`
                                : `${daysLeft} dias restantes`}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground tabular-nums">
                            {format(goal.deadline, "dd/MM/yyyy")}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {completedGoals.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Metas Concluídas</h2>
                <div className="grid gap-5 md:grid-cols-2">
                  {completedGoals.map((goal) => (
                    <div key={goal.id} className="group rounded-3xl bg-card/40 backdrop-blur-md border-none shadow-sm p-6 transition-all duration-300">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-income" />
                            <h3 className="text-base font-semibold">{goal.name}</h3>
                            <Badge variant="secondary" className="rounded-full text-xs">{goalTypeLabels[goal.type]}</Badge>
                          </div>
                          {goal.description && (
                            <p className="text-xs text-muted-foreground">{goal.description}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 rounded-full hover:bg-destructive/10 text-destructive opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                          onClick={() => {
                            setSelectedGoalToDelete(goal.id);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="mt-4 space-y-1">
                        <p className="text-2xl font-bold text-income tabular-nums">
                          {formatCurrency(goal.currentAmount)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Meta atingida em {format(goal.deadline, "dd/MM/yyyy")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {goals.length === 0 && (
              <div className="rounded-3xl bg-card/40 backdrop-blur-md border-none shadow-sm py-12 text-center">
                <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">Nenhuma meta criada</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Defina metas financeiras para alcançar seus objetivos
                </p>
                <Button onClick={() => setDialogOpen(true)} className="rounded-xl">
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Primeira Meta
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="wishlist">
            <WishlistList />
          </TabsContent>
        </Tabs>

        <Dialog open={progressDialogOpen} onOpenChange={setProgressDialogOpen}>
          <DialogContent className="rounded-3xl border-none bg-card/80 backdrop-blur-xl">
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
                  className="rounded-xl"
                />
              </div>
              <Button onClick={handleUpdateProgress} className="w-full rounded-xl">
                Atualizar
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <ConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Excluir Meta"
          description="Tem certeza que deseja excluir esta meta? Esta ação não pode ser desfeita."
          confirmText="Excluir"
          onConfirm={confirmDelete}
        />
      </main>
    </div>
  );
};

export default Goals;
