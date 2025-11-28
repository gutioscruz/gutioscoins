import { useState } from "react";
import { Plus, Pencil, Trash2, Building2, CreditCard, Wallet, TrendingUp, PiggyBank } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BankType, InvestmentType } from "@/types/finance";
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

const investmentTypeLabels = {
  stocks: "Ações",
  funds: "Fundos",
  crypto: "Criptomoedas",
  "fixed-income": "Renda Fixa",
  other: "Outros",
};

const Banks = () => {
  const { 
    banks, 
    addBank, 
    updateBank, 
    deleteBank,
    addCardToBank,
    updateCard,
    deleteCard,
    investments,
    addInvestment,
    updateInvestment,
    deleteInvestment
  } = useFinance();
  
  const [bankDialogOpen, setBankDialogOpen] = useState(false);
  const [cardDialogOpen, setCardDialogOpen] = useState(false);
  const [investmentDialogOpen, setInvestmentDialogOpen] = useState(false);
  const [editingBankId, setEditingBankId] = useState<string | null>(null);
  const [editingCardData, setEditingCardData] = useState<{ bankId: string; cardId: string | null } | null>(null);
  const [editingInvestmentId, setEditingInvestmentId] = useState<string | null>(null);
  
  const [bankFormData, setBankFormData] = useState({
    name: "",
    type: "checking" as BankType,
    balance: "",
    limit: "",
    color: "#10b981",
  });

  const [cardFormData, setCardFormData] = useState({
    name: "",
    limit: "",
    used: "0",
    color: "#10b981",
  });

  const [investmentFormData, setInvestmentFormData] = useState({
    name: "",
    type: "fixed-income" as InvestmentType,
    amount: "",
    profitability: "",
    color: "#10b981",
  });

  const handleSaveBank = () => {
    if (!bankFormData.name.trim()) {
      toast.error("Digite um nome para o banco");
      return;
    }

    const bankData = {
      name: bankFormData.name,
      type: bankFormData.type,
      balance: bankFormData.balance ? parseFloat(bankFormData.balance) : undefined,
      limit: bankFormData.limit ? parseFloat(bankFormData.limit) : undefined,
      color: bankFormData.color,
      cards: editingBankId ? banks.find(b => b.id === editingBankId)?.cards : [],
    };

    if (editingBankId) {
      updateBank(editingBankId, bankData);
      toast.success("Banco atualizado!");
    } else {
      addBank(bankData);
      toast.success("Banco adicionado!");
    }

    resetBankDialog();
  };

  const handleDeleteBank = (id: string) => {
    deleteBank(id);
    toast.success("Banco excluído!");
  };

  const handleSaveCard = () => {
    if (!cardFormData.name.trim() || !editingCardData?.bankId) {
      toast.error("Preencha todos os campos");
      return;
    }

    const cardData = {
      name: cardFormData.name,
      limit: Number(cardFormData.limit) || 0,
      used: Number(cardFormData.used) || 0,
      color: cardFormData.color,
    };

    if (editingCardData.cardId) {
      updateCard(editingCardData.bankId, editingCardData.cardId, cardData);
      toast.success("Cartão atualizado!");
    } else {
      addCardToBank(editingCardData.bankId, cardData);
      toast.success("Cartão adicionado!");
    }

    resetCardDialog();
  };

  const handleDeleteCard = (bankId: string, cardId: string) => {
    deleteCard(bankId, cardId);
    toast.success("Cartão excluído!");
  };

  const handleSaveInvestment = () => {
    if (!investmentFormData.name.trim()) {
      toast.error("Digite um nome para o investimento");
      return;
    }

    const investmentData = {
      name: investmentFormData.name,
      type: investmentFormData.type,
      amount: parseFloat(investmentFormData.amount),
      profitability: investmentFormData.profitability ? parseFloat(investmentFormData.profitability) : undefined,
      color: investmentFormData.color,
    };

    if (editingInvestmentId) {
      updateInvestment(editingInvestmentId, investmentData);
      toast.success("Investimento atualizado!");
    } else {
      addInvestment(investmentData);
      toast.success("Investimento adicionado!");
    }

    resetInvestmentDialog();
  };

  const handleDeleteInvestment = (id: string) => {
    deleteInvestment(id);
    toast.success("Investimento excluído!");
  };

  const resetBankDialog = () => {
    setBankDialogOpen(false);
    setEditingBankId(null);
    setBankFormData({
      name: "",
      type: "checking",
      balance: "",
      limit: "",
      color: "#10b981",
    });
  };

  const resetCardDialog = () => {
    setCardDialogOpen(false);
    setEditingCardData(null);
    setCardFormData({
      name: "",
      limit: "",
      used: "0",
      color: "#10b981",
    });
  };

  const resetInvestmentDialog = () => {
    setInvestmentDialogOpen(false);
    setEditingInvestmentId(null);
    setInvestmentFormData({
      name: "",
      type: "fixed-income",
      amount: "",
      profitability: "",
      color: "#10b981",
    });
  };

  const openEditBankDialog = (bankId: string) => {
    const bank = banks.find(b => b.id === bankId);
    if (!bank) return;
    
    setEditingBankId(bankId);
    setBankFormData({
      name: bank.name,
      type: bank.type,
      balance: bank.balance?.toString() || "",
      limit: bank.limit?.toString() || "",
      color: bank.color,
    });
    setBankDialogOpen(true);
  };

  const openEditCardDialog = (bankId: string, cardId: string) => {
    const bank = banks.find(b => b.id === bankId);
    const card = bank?.cards?.find(c => c.id === cardId);
    if (!card) return;

    setEditingCardData({ bankId, cardId });
    setCardFormData({
      name: card.name,
      limit: card.limit.toString(),
      used: card.used.toString(),
      color: card.color,
    });
    setCardDialogOpen(true);
  };

  const openAddCardDialog = (bankId: string) => {
    setEditingCardData({ bankId, cardId: null });
    setCardDialogOpen(true);
  };

  const openEditInvestmentDialog = (investmentId: string) => {
    const investment = investments.find(i => i.id === investmentId);
    if (!investment) return;

    setEditingInvestmentId(investmentId);
    setInvestmentFormData({
      name: investment.name,
      type: investment.type,
      amount: investment.amount.toString(),
      profitability: investment.profitability?.toString() || "",
      color: investment.color,
    });
    setInvestmentDialogOpen(true);
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
    .reduce((sum, b) => sum + (b.balance || 0), 0) + 
    banks.flatMap(b => b.cards || []).reduce((sum, c) => sum + c.used, 0);

  const totalCreditLimit = banks
    .filter(b => b.type === "credit")
    .reduce((sum, b) => sum + (b.limit || 0), 0) +
    banks.flatMap(b => b.cards || []).reduce((sum, c) => sum + c.limit, 0);

  const totalInvestments = investments.reduce((sum, inv) => sum + inv.amount, 0);

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Patrimônio</h1>
        </div>

        <div className="grid gap-6 md:grid-cols-4">
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
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Investimentos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary">{formatCurrency(totalInvestments)}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="banks" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="banks">Bancos e Cartões</TabsTrigger>
            <TabsTrigger value="investments">Investimentos</TabsTrigger>
          </TabsList>

          <TabsContent value="banks" className="space-y-6 mt-6">
            <div className="flex justify-end">
              <Dialog open={bankDialogOpen} onOpenChange={setBankDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2" onClick={() => setEditingBankId(null)}>
                    <Plus className="w-4 h-4" />
                    Adicionar Banco
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingBankId ? "Editar" : "Novo"} Banco</DialogTitle>
                    <DialogDescription>
                      {editingBankId ? "Edite" : "Adicione"} uma conta bancária.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome</Label>
                      <Input
                        id="name"
                        placeholder="Ex: Nubank, Itaú..."
                        value={bankFormData.name}
                        onChange={(e) => setBankFormData({ ...bankFormData, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="type">Tipo</Label>
                      <Select 
                        value={bankFormData.type} 
                        onValueChange={(value: BankType) => setBankFormData({ ...bankFormData, type: value })}
                      >
                        <SelectTrigger id="type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="checking">Conta Corrente</SelectItem>
                          <SelectItem value="savings">Poupança</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="balance">Saldo Atual</Label>
                      <Input
                        id="balance"
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        value={bankFormData.balance}
                        onChange={(e) => setBankFormData({ ...bankFormData, balance: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="color">Cor</Label>
                      <div className="flex gap-2">
                        <Input
                          id="color"
                          type="color"
                          value={bankFormData.color}
                          onChange={(e) => setBankFormData({ ...bankFormData, color: e.target.value })}
                          className="w-20 h-10"
                        />
                        <Input
                          value={bankFormData.color}
                          onChange={(e) => setBankFormData({ ...bankFormData, color: e.target.value })}
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
                            onClick={() => openEditBankDialog(bank.id)}
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
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Saldo Atual</p>
                        <p className="text-3xl font-bold">{formatCurrency(bank.balance || 0)}</p>
                      </div>

                      {bank.cards && bank.cards.length > 0 && (
                        <div className="space-y-2 pt-4 border-t">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">Cartões</p>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openAddCardDialog(bank.id)}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Adicionar
                            </Button>
                          </div>
                          {bank.cards.map((card) => (
                            <div key={card.id} className="p-3 rounded-lg bg-muted/50">
                              <div className="flex items-center justify-between mb-2">
                                <p className="font-medium text-sm">{card.name}</p>
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={() => openEditCardDialog(bank.id, card.id)}
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 text-destructive"
                                    onClick={() => handleDeleteCard(bank.id, card.id)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                              <div className="space-y-1 text-xs">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Limite:</span>
                                  <span>{formatCurrency(card.limit)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Usado:</span>
                                  <span className="text-expense">{formatCurrency(card.used)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Disponível:</span>
                                  <span className="text-income">{formatCurrency(card.limit - card.used)}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {(!bank.cards || bank.cards.length === 0) && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => openAddCardDialog(bank.id)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Adicionar Cartão
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="investments" className="space-y-6 mt-6">
            <div className="flex justify-end">
              <Dialog open={investmentDialogOpen} onOpenChange={setInvestmentDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2" onClick={() => setEditingInvestmentId(null)}>
                    <Plus className="w-4 h-4" />
                    Adicionar Investimento
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingInvestmentId ? "Editar" : "Novo"} Investimento</DialogTitle>
                    <DialogDescription>
                      {editingInvestmentId ? "Edite" : "Adicione"} um investimento.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="inv-name">Nome</Label>
                      <Input
                        id="inv-name"
                        placeholder="Ex: Tesouro Selic..."
                        value={investmentFormData.name}
                        onChange={(e) => setInvestmentFormData({ ...investmentFormData, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="inv-type">Tipo</Label>
                      <Select 
                        value={investmentFormData.type} 
                        onValueChange={(value: InvestmentType) => setInvestmentFormData({ ...investmentFormData, type: value })}
                      >
                        <SelectTrigger id="inv-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fixed-income">Renda Fixa</SelectItem>
                          <SelectItem value="stocks">Ações</SelectItem>
                          <SelectItem value="funds">Fundos</SelectItem>
                          <SelectItem value="crypto">Criptomoedas</SelectItem>
                          <SelectItem value="other">Outros</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="inv-amount">Valor Investido</Label>
                      <Input
                        id="inv-amount"
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        value={investmentFormData.amount}
                        onChange={(e) => setInvestmentFormData({ ...investmentFormData, amount: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="inv-profit">Rentabilidade (% a.a.)</Label>
                      <Input
                        id="inv-profit"
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        value={investmentFormData.profitability}
                        onChange={(e) => setInvestmentFormData({ ...investmentFormData, profitability: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="inv-color">Cor</Label>
                      <div className="flex gap-2">
                        <Input
                          id="inv-color"
                          type="color"
                          value={investmentFormData.color}
                          onChange={(e) => setInvestmentFormData({ ...investmentFormData, color: e.target.value })}
                          className="w-20 h-10"
                        />
                        <Input
                          value={investmentFormData.color}
                          onChange={(e) => setInvestmentFormData({ ...investmentFormData, color: e.target.value })}
                          placeholder="#000000"
                        />
                      </div>
                    </div>
                    <Button onClick={handleSaveInvestment} className="w-full">
                      {editingInvestmentId ? "Salvar Alterações" : "Adicionar"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {investments.map((investment) => (
                <Card key={investment.id} className="overflow-hidden">
                  <div 
                    className="h-2" 
                    style={{ backgroundColor: investment.color }}
                  />
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="p-2 rounded-lg"
                          style={{ backgroundColor: `${investment.color}20` }}
                        >
                          <TrendingUp className="h-5 w-5" style={{ color: investment.color }} />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{investment.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {investmentTypeLabels[investment.type]}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => openEditInvestmentDialog(investment.id)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive"
                          onClick={() => handleDeleteInvestment(investment.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm text-muted-foreground">Valor Investido</p>
                        <p className="text-3xl font-bold">{formatCurrency(investment.amount)}</p>
                      </div>
                      {investment.profitability && (
                        <div>
                          <p className="text-sm text-muted-foreground">Rentabilidade</p>
                          <p className="text-xl font-semibold text-income">
                            {investment.profitability}% a.a.
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <Dialog open={cardDialogOpen} onOpenChange={setCardDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCardData?.cardId ? "Editar" : "Novo"} Cartão</DialogTitle>
              <DialogDescription>
                {editingCardData?.cardId ? "Edite" : "Adicione"} um cartão de crédito.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="card-name">Nome do Cartão</Label>
                <Input
                  id="card-name"
                  placeholder="Ex: Cartão Principal..."
                  value={cardFormData.name}
                  onChange={(e) => setCardFormData({ ...cardFormData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="card-limit">Limite Total</Label>
                <Input
                  id="card-limit"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={cardFormData.limit}
                  onChange={(e) => setCardFormData({ ...cardFormData, limit: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="card-used">Valor Utilizado</Label>
                <Input
                  id="card-used"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={cardFormData.used}
                  onChange={(e) => setCardFormData({ ...cardFormData, used: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="card-color">Cor</Label>
                <div className="flex gap-2">
                  <Input
                    id="card-color"
                    type="color"
                    value={cardFormData.color}
                    onChange={(e) => setCardFormData({ ...cardFormData, color: e.target.value })}
                    className="w-20 h-10"
                  />
                  <Input
                    value={cardFormData.color}
                    onChange={(e) => setCardFormData({ ...cardFormData, color: e.target.value })}
                    placeholder="#000000"
                  />
                </div>
              </div>
              <Button onClick={handleSaveCard} className="w-full">
                {editingCardData?.cardId ? "Salvar Alterações" : "Adicionar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default Banks;
