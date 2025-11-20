import { useState } from "react";
import { Plus, Pencil, Trash2, Calendar, Play, Pause } from "lucide-react";
import { Header } from "@/components/finance/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RecurrenceFrequency, TransactionType } from "@/types/finance";
import { toast } from "sonner";
import { useFinance } from "@/contexts/FinanceContext";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const frequencyLabels = {
  daily: "Diário",
  weekly: "Semanal",
  monthly: "Mensal",
  yearly: "Anual",
};

const RecurringTransactions = () => {
  const {
    recurringTransactions,
    addRecurringTransaction,
    updateRecurringTransaction,
    deleteRecurringTransaction,
    toggleRecurringTransaction,
    categories,
    banks,
  } = useFinance();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    type: "expense" as TransactionType,
    categoryId: "",
    subcategory: "",
    bankId: "",
    frequency: "monthly" as RecurrenceFrequency,
    startDate: new Date(),
    endDate: undefined as Date | undefined,
    isActive: true,
  });

  const handleSave = () => {
    if (!formData.description.trim() || !formData.amount || !formData.categoryId || !formData.bankId) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const data = {
      description: formData.description,
      amount: parseFloat(formData.amount),
      type: formData.type,
      categoryId: formData.categoryId,
      subcategory: formData.subcategory || undefined,
      bankId: formData.bankId,
      frequency: formData.frequency,
      startDate: formData.startDate,
      endDate: formData.endDate,
      isActive: formData.isActive,
      lastGenerated: undefined,
    };

    if (editingId) {
      updateRecurringTransaction(editingId, data);
      toast.success("Transação recorrente atualizada!");
    } else {
      addRecurringTransaction(data);
      toast.success("Transação recorrente criada!");
    }

    resetDialog();
  };

  const handleDelete = (id: string) => {
    deleteRecurringTransaction(id);
    toast.success("Transação recorrente excluída!");
  };

  const handleToggle = (id: string) => {
    toggleRecurringTransaction(id);
    toast.success("Status atualizado!");
  };

  const resetDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setFormData({
      description: "",
      amount: "",
      type: "expense",
      categoryId: "",
      subcategory: "",
      bankId: "",
      frequency: "monthly",
      startDate: new Date(),
      endDate: undefined,
      isActive: true,
    });
  };

  const openEditDialog = (id: string) => {
    const recurring = recurringTransactions.find((r) => r.id === id);
    if (!recurring) return;

    setEditingId(id);
    setFormData({
      description: recurring.description,
      amount: recurring.amount.toString(),
      type: recurring.type,
      categoryId: recurring.categoryId,
      subcategory: recurring.subcategory || "",
      bankId: recurring.bankId,
      frequency: recurring.frequency,
      startDate: recurring.startDate,
      endDate: recurring.endDate,
      isActive: recurring.isActive,
    });
    setDialogOpen(true);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getCategoryName = (id: string) => {
    return categories.find((c) => c.id === id)?.name || "Categoria";
  };

  const getBankName = (id: string) => {
    return banks.find((b) => b.id === id)?.name || "Banco";
  };

  const selectedCategory = categories.find((c) => c.id === formData.categoryId);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Transações Recorrentes</h1>
            <p className="text-muted-foreground mt-1">
              Automatize receitas e despesas que se repetem regularmente
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" onClick={() => setEditingId(null)}>
                <Plus className="w-4 h-4" />
                Nova Recorrência
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? "Editar" : "Nova"} Transação Recorrente</DialogTitle>
                <DialogDescription>
                  Configure uma transação que se repete automaticamente
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Input
                    id="description"
                    placeholder="Ex: Salário, Aluguel..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Tipo</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value: TransactionType) =>
                        setFormData({ ...formData, type: value, categoryId: "" })
                      }
                    >
                      <SelectTrigger id="type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="income">Receita</SelectItem>
                        <SelectItem value="expense">Despesa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="amount">Valor</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Categoria</Label>
                  <Select
                    value={formData.categoryId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, categoryId: value, subcategory: "" })
                    }
                  >
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories
                        .filter((c) => c.type === formData.type)
                        .map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedCategory && selectedCategory.subcategories.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="subcategory">Subcategoria</Label>
                    <Select
                      value={formData.subcategory}
                      onValueChange={(value) => setFormData({ ...formData, subcategory: value })}
                    >
                      <SelectTrigger id="subcategory">
                        <SelectValue placeholder="Selecione uma subcategoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedCategory.subcategories.map((sub) => (
                          <SelectItem key={sub} value={sub}>
                            {sub}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="bank">Banco/Conta</Label>
                  <Select
                    value={formData.bankId}
                    onValueChange={(value) => setFormData({ ...formData, bankId: value })}
                  >
                    <SelectTrigger id="bank">
                      <SelectValue placeholder="Selecione um banco" />
                    </SelectTrigger>
                    <SelectContent>
                      {banks.map((bank) => (
                        <SelectItem key={bank.id} value={bank.id}>
                          {bank.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="frequency">Frequência</Label>
                  <Select
                    value={formData.frequency}
                    onValueChange={(value: RecurrenceFrequency) =>
                      setFormData({ ...formData, frequency: value })
                    }
                  >
                    <SelectTrigger id="frequency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Diário</SelectItem>
                      <SelectItem value="weekly">Semanal</SelectItem>
                      <SelectItem value="monthly">Mensal</SelectItem>
                      <SelectItem value="yearly">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data de Início</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.startDate && "text-muted-foreground"
                          )}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {formData.startDate
                            ? format(formData.startDate, "PPP", { locale: ptBR })
                            : "Selecione"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={formData.startDate}
                          onSelect={(date) => date && setFormData({ ...formData, startDate: date })}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>Data de Término (opcional)</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.endDate && "text-muted-foreground"
                          )}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {formData.endDate
                            ? format(formData.endDate, "PPP", { locale: ptBR })
                            : "Selecione"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={formData.endDate}
                          onSelect={(date) => setFormData({ ...formData, endDate: date })}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <Button onClick={handleSave} className="w-full">
                  {editingId ? "Salvar Alterações" : "Criar Recorrência"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-6">
          {recurringTransactions.map((recurring) => (
            <Card key={recurring.id} className={!recurring.isActive ? "opacity-60" : ""}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{recurring.description}</CardTitle>
                      <Badge variant={recurring.type === "income" ? "default" : "destructive"}>
                        {recurring.type === "income" ? "Receita" : "Despesa"}
                      </Badge>
                      <Badge variant={recurring.isActive ? "default" : "secondary"}>
                        {recurring.isActive ? "Ativo" : "Pausado"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {getCategoryName(recurring.categoryId)}
                      {recurring.subcategory && ` • ${recurring.subcategory}`}
                      {" • "}
                      {getBankName(recurring.bankId)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggle(recurring.id)}
                      title={recurring.isActive ? "Pausar" : "Ativar"}
                    >
                      {recurring.isActive ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openEditDialog(recurring.id)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => handleDelete(recurring.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Valor</p>
                    <p className={`text-2xl font-bold ${recurring.type === "income" ? "text-income" : "text-expense"}`}>
                      {formatCurrency(recurring.amount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Frequência</p>
                    <p className="text-lg font-semibold">{frequencyLabels[recurring.frequency]}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Início</p>
                    <p className="text-lg font-semibold">
                      {format(recurring.startDate, "dd/MM/yyyy")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Última Geração</p>
                    <p className="text-lg font-semibold">
                      {recurring.lastGenerated
                        ? format(recurring.lastGenerated, "dd/MM/yyyy")
                        : "Nunca"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {recurringTransactions.length === 0 && (
            <Card className="py-12">
              <CardContent className="text-center">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">Nenhuma transação recorrente</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Crie transações automáticas para não se preocupar com receitas e despesas fixas
                </p>
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Primeira Recorrência
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default RecurringTransactions;
