import { useState } from "react";
import { Plus, Pencil, Trash2, Building2, CreditCard, Wallet } from "lucide-react";
import { Header } from "@/components/finance/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BankType } from "@/types/finance";
import { toast } from "sonner";
import { useFinance } from "@/contexts/FinanceContext";

const bankTypeLabels = {
  checking: "Conta Corrente",
  savings: "Poupança",
  credit: "Cartão de Crédito",
};

const bankTypeIcons = {
  checking: Building2,
  savings: Wallet,
  credit: CreditCard,
};

const Banks = () => {
  const { banks, addBank, updateBank, deleteBank } = useFinance();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBankId, setEditingBankId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    type: "checking" as BankType,
    balance: "",
    limit: "",
    color: "#10b981",
  });

  const handleSaveBank = () => {
    if (!formData.name.trim()) {
      toast.error("Digite um nome para o banco/cartão");
      return;
    }

    const bankData = {
      name: formData.name,
      type: formData.type,
      balance: formData.balance ? parseFloat(formData.balance) : undefined,
      limit: formData.limit ? parseFloat(formData.limit) : undefined,
      color: formData.color,
    };

    if (editingBankId) {
      updateBank(editingBankId, bankData);
      toast.success("Banco atualizado!");
    } else {
      addBank(bankData);
      toast.success("Banco adicionado!");
    }

    resetDialog();
  };

  const handleDeleteBank = (id: string) => {
    deleteBank(id);
    toast.success("Banco excluído!");
  };

  const resetDialog = () => {
    setDialogOpen(false);
    setEditingBankId(null);
    setFormData({
      name: "",
      type: "checking",
      balance: "",
      limit: "",
      color: "#10b981",
    });
  };

  const openEditDialog = (bankId: string) => {
    const bank = banks.find(b => b.id === bankId);
    if (!bank) return;
    
    setEditingBankId(bankId);
    setFormData({
      name: bank.name,
      type: bank.type,
      balance: bank.balance?.toString() || "",
      limit: bank.limit?.toString() || "",
      color: bank.color,
    });
    setDialogOpen(true);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const totalBalance = banks
    .filter(b => b.type !== "credit")
    .reduce((sum, b) => sum + (b.balance || 0), 0);

  const totalCreditUsed = banks
    .filter(b => b.type === "credit")
    .reduce((sum, b) => sum + (b.balance || 0), 0);

  const totalCreditLimit = banks
    .filter(b => b.type === "credit")
    .reduce((sum, b) => sum + (b.limit || 0), 0);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Bancos e Cartões</h1>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" onClick={() => setEditingBankId(null)}>
                <Plus className="w-4 h-4" />
                Adicionar Banco
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingBankId ? "Editar" : "Novo"} Banco/Cartão</DialogTitle>
                <DialogDescription>
                  {editingBankId ? "Edite" : "Adicione"} uma conta bancária ou cartão de crédito.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    placeholder="Ex: Nubank, Itaú..."
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Tipo</Label>
                  <Select 
                    value={formData.type} 
                    onValueChange={(value: BankType) => setFormData({ ...formData, type: value })}
                  >
                    <SelectTrigger id="type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="checking">Conta Corrente</SelectItem>
                      <SelectItem value="savings">Poupança</SelectItem>
                      <SelectItem value="credit">Cartão de Crédito</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.type !== "credit" ? (
                  <div className="space-y-2">
                    <Label htmlFor="balance">Saldo Atual</Label>
                    <Input
                      id="balance"
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      value={formData.balance}
                      onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
                    />
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="limit">Limite Total</Label>
                      <Input
                        id="limit"
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        value={formData.limit}
                        onChange={(e) => setFormData({ ...formData, limit: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="balance">Valor Utilizado</Label>
                      <Input
                        id="balance"
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        value={formData.balance}
                        onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
                      />
                    </div>
                  </>
                )}
                <div className="space-y-2">
                  <Label htmlFor="color">Cor</Label>
                  <div className="flex gap-2">
                    <Input
                      id="color"
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-20 h-10"
                    />
                    <Input
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      placeholder="#000000"
                    />
                  </div>
                </div>
                <Button onClick={handleSaveBank} className="w-full">
                  {editingBankId ? "Salvar Alterações" : "Adicionar"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Saldo Total</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-income">{formatCurrency(totalBalance)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Crédito Usado</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-expense">{formatCurrency(totalCreditUsed)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Limite Disponível</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{formatCurrency(totalCreditLimit - totalCreditUsed)}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {banks.map((bank) => {
            const Icon = bankTypeIcons[bank.type];
            return (
              <Card key={bank.id} className="overflow-hidden">
                <div 
                  className="h-2" 
                  style={{ backgroundColor: bank.color }}
                />
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="p-2 rounded-lg"
                        style={{ backgroundColor: `${bank.color}20` }}
                      >
                        <Icon className="h-5 w-5" style={{ color: bank.color }} />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{bank.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {bankTypeLabels[bank.type]}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => openEditDialog(bank.id)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive"
                        onClick={() => handleDeleteBank(bank.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {bank.type === "credit" ? (
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm text-muted-foreground">Limite Total</p>
                        <p className="text-2xl font-bold">{formatCurrency(bank.limit || 0)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Utilizado</p>
                        <p className="text-xl font-semibold text-expense">
                          {formatCurrency(bank.balance || 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Disponível</p>
                        <p className="text-xl font-semibold text-income">
                          {formatCurrency((bank.limit || 0) - (bank.balance || 0))}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-muted-foreground">Saldo Atual</p>
                      <p className="text-3xl font-bold">{formatCurrency(bank.balance || 0)}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default Banks;
