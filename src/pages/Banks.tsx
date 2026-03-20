import { useState, useMemo } from "react";
import { Plus, Pencil, Trash2, Building2, CreditCard, Wallet, TrendingUp, PiggyBank, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { BankType, InvestmentType, Card as CardType } from "@/types/finance";
import { toast } from "sonner";
import { useFinance } from "@/contexts/FinanceContext";
import { CardStatementDialog } from "@/components/cards/CardStatementDialog";
import { MonthlyStatementsOverview } from "@/components/cards/MonthlyStatementsOverview";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { formatCurrency } from "@/lib/utils";

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
    banks, addBank, updateBank, deleteBank,
    addCardToBank, updateCard, deleteCard,
    investments, addInvestment, updateInvestment, deleteInvestment
  } = useFinance();
  
  const [bankDialogOpen, setBankDialogOpen] = useState(false);
  const [cardDialogOpen, setCardDialogOpen] = useState(false);
  const [investmentDialogOpen, setInvestmentDialogOpen] = useState(false);
  const [editingBankId, setEditingBankId] = useState<string | null>(null);
  const [editingCardData, setEditingCardData] = useState<{ bankId: string; cardId: string | null } | null>(null);
  const [editingInvestmentId, setEditingInvestmentId] = useState<string | null>(null);
  const [statementDialogData, setStatementDialogData] = useState<{ card: CardType; bankId: string } | null>(null);
  
  const [deleteBankConfirm, setDeleteBankConfirm] = useState<string | null>(null);
  const [deleteCardConfirm, setDeleteCardConfirm] = useState<{ bankId: string; cardId: string } | null>(null);
  const [deleteInvestmentConfirm, setDeleteInvestmentConfirm] = useState<string | null>(null);
  
  const [bankFormData, setBankFormData] = useState({
    name: "", type: "checking" as BankType, balance: "", limit: "", color: "#10b981",
  });
  const [cardFormData, setCardFormData] = useState({
    name: "", limit: "", used: "0", color: "#10b981", closingDay: "1", dueDay: "10", autoDebit: false, autoDebitBankId: "",
  });
  const [investmentFormData, setInvestmentFormData] = useState({
    name: "", type: "fixed-income" as InvestmentType, amount: "", profitability: "", color: "#10b981",
  });

  const handleSaveBank = () => {
    if (!bankFormData.name.trim()) { toast.error("Digite um nome para o banco"); return; }
    const bankData = {
      name: bankFormData.name, type: bankFormData.type,
      balance: bankFormData.balance ? parseFloat(bankFormData.balance) : undefined,
      limit: bankFormData.limit ? parseFloat(bankFormData.limit) : undefined,
      color: bankFormData.color,
      cards: editingBankId ? banks.find(b => b.id === editingBankId)?.cards : [],
    };
    if (editingBankId) { updateBank(editingBankId, bankData); toast.success("Banco atualizado!"); }
    else { addBank(bankData); toast.success("Banco adicionado!"); }
    resetBankDialog();
  };

  const handleDeleteBank = (id: string) => { deleteBank(id); setDeleteBankConfirm(null); };

  const handleSaveCard = () => {
    if (!cardFormData.name.trim() || !editingCardData?.bankId) { toast.error("Preencha todos os campos"); return; }
    if (cardFormData.autoDebit && !cardFormData.autoDebitBankId) { toast.error("Selecione a conta para débito automático"); return; }
    const cardData = {
      name: cardFormData.name, limit: Number(cardFormData.limit) || 0,
      used: Number(cardFormData.used) || 0, color: cardFormData.color,
      autoDebit: cardFormData.autoDebit,
      autoDebitBankId: cardFormData.autoDebit ? cardFormData.autoDebitBankId : undefined,
    };
    if (editingCardData.cardId) { updateCard(editingCardData.bankId, editingCardData.cardId, cardData); toast.success("Cartão atualizado!"); }
    else { addCardToBank(editingCardData.bankId, cardData); toast.success("Cartão adicionado!"); }
    resetCardDialog();
  };

  const handleDeleteCard = (bankId: string, cardId: string) => { deleteCard(bankId, cardId); setDeleteCardConfirm(null); };

  const handleSaveInvestment = () => {
    if (!investmentFormData.name.trim()) { toast.error("Digite um nome para o investimento"); return; }
    const investmentData = {
      name: investmentFormData.name, type: investmentFormData.type,
      amount: parseFloat(investmentFormData.amount),
      profitability: investmentFormData.profitability ? parseFloat(investmentFormData.profitability) : undefined,
      color: investmentFormData.color,
    };
    if (editingInvestmentId) { updateInvestment(editingInvestmentId, investmentData); toast.success("Investimento atualizado!"); }
    else { addInvestment(investmentData); toast.success("Investimento adicionado!"); }
    resetInvestmentDialog();
  };

  const handleDeleteInvestment = (id: string) => { deleteInvestment(id); setDeleteInvestmentConfirm(null); };

  const resetBankDialog = () => { setBankDialogOpen(false); setEditingBankId(null); setBankFormData({ name: "", type: "checking", balance: "", limit: "", color: "#10b981" }); };
  const resetCardDialog = () => { setCardDialogOpen(false); setEditingCardData(null); setCardFormData({ name: "", limit: "", used: "0", color: "#10b981", autoDebit: false, autoDebitBankId: "" }); };
  const resetInvestmentDialog = () => { setInvestmentDialogOpen(false); setEditingInvestmentId(null); setInvestmentFormData({ name: "", type: "fixed-income", amount: "", profitability: "", color: "#10b981" }); };

  const openEditBankDialog = (bankId: string) => {
    const bank = banks.find(b => b.id === bankId);
    if (!bank) return;
    setEditingBankId(bankId);
    setBankFormData({ name: bank.name, type: bank.type, balance: bank.balance?.toString() || "", limit: bank.limit?.toString() || "", color: bank.color });
    setBankDialogOpen(true);
  };

  const openEditCardDialog = (bankId: string, cardId: string) => {
    const bank = banks.find(b => b.id === bankId);
    const card = bank?.cards?.find(c => c.id === cardId);
    if (!card) return;
    setEditingCardData({ bankId, cardId });
    setCardFormData({ name: card.name, limit: card.limit.toString(), used: card.used.toString(), color: card.color, autoDebit: card.autoDebit || false, autoDebitBankId: card.autoDebitBankId || "" });
    setCardDialogOpen(true);
  };

  const openAddCardDialog = (bankId: string) => { setEditingCardData({ bankId, cardId: null }); setCardDialogOpen(true); };

  const openEditInvestmentDialog = (investmentId: string) => {
    const investment = investments.find(i => i.id === investmentId);
    if (!investment) return;
    setEditingInvestmentId(investmentId);
    setInvestmentFormData({ name: investment.name, type: investment.type, amount: investment.amount.toString(), profitability: investment.profitability?.toString() || "", color: investment.color });
    setInvestmentDialogOpen(true);
  };

  const totalBalance = banks.filter(b => b.type !== "credit").reduce((sum, b) => sum + (b.balance || 0), 0);
  const totalCreditUsed = banks.filter(b => b.type === "credit").reduce((sum, b) => sum + (b.balance || 0), 0) + banks.flatMap(b => b.cards || []).reduce((sum, c) => sum + c.used, 0);
  const totalCreditLimit = banks.filter(b => b.type === "credit").reduce((sum, b) => sum + (b.limit || 0), 0) + banks.flatMap(b => b.cards || []).reduce((sum, c) => sum + c.limit, 0);
  const totalInvestments = investments.reduce((sum, inv) => sum + inv.amount, 0);

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 space-y-8">
        <h1 className="text-3xl font-bold">Patrimônio</h1>

        {/* Summary cards - borderless premium */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="p-5 rounded-2xl bg-card/60 backdrop-blur-sm border-none shadow-sm transition-all duration-300 hover:shadow-md">
            <div className="flex items-start justify-between">
              <div className="space-y-1.5">
                <p className="text-xs font-medium tracking-wide uppercase text-muted-foreground">Saldo Total</p>
                <p className="text-2xl font-bold text-income tabular-nums">{formatCurrency(totalBalance)}</p>
              </div>
              <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-income/10">
                <PiggyBank className="w-5 h-5 text-income" />
              </div>
            </div>
          </div>
          <div className="p-5 rounded-2xl bg-card/60 backdrop-blur-sm border-none shadow-sm transition-all duration-300 hover:shadow-md">
            <div className="flex items-start justify-between">
              <div className="space-y-1.5">
                <p className="text-xs font-medium tracking-wide uppercase text-muted-foreground">Crédito Usado</p>
                <p className="text-2xl font-bold text-foreground tabular-nums">{formatCurrency(totalCreditUsed)}</p>
              </div>
              <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-muted/50">
                <CreditCard className="w-5 h-5 text-muted-foreground" />
              </div>
            </div>
          </div>
          <div className="p-5 rounded-2xl bg-card/60 backdrop-blur-sm border-none shadow-sm transition-all duration-300 hover:shadow-md">
            <div className="flex items-start justify-between">
              <div className="space-y-1.5">
                <p className="text-xs font-medium tracking-wide uppercase text-muted-foreground">Limite Disponível</p>
                <p className="text-2xl font-bold text-foreground tabular-nums">{formatCurrency(totalCreditLimit - totalCreditUsed)}</p>
              </div>
              <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-primary/10">
                <Wallet className="w-5 h-5 text-primary" />
              </div>
            </div>
          </div>
          <div className="p-5 rounded-2xl bg-card/60 backdrop-blur-sm border-none shadow-sm transition-all duration-300 hover:shadow-md">
            <div className="flex items-start justify-between">
              <div className="space-y-1.5">
                <p className="text-xs font-medium tracking-wide uppercase text-muted-foreground">Investimentos</p>
                <p className="text-2xl font-bold text-primary tabular-nums">{formatCurrency(totalInvestments)}</p>
              </div>
              <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-primary/10">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="banks" className="w-full">
          <TabsList className="bg-muted/50 backdrop-blur-sm rounded-xl p-1 h-auto w-auto inline-flex">
            <TabsTrigger value="banks" className="rounded-lg px-5 py-2 text-sm gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-300">
              <Building2 className="w-4 h-4" />
              Bancos e Cartões
            </TabsTrigger>
            <TabsTrigger value="investments" className="rounded-lg px-5 py-2 text-sm gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-300">
              <TrendingUp className="w-4 h-4" />
              Investimentos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="banks" className="space-y-6 mt-6">
            <MonthlyStatementsOverview 
              banks={banks} 
              onCardClick={(cardInfo) => {
                const bank = banks.find(b => b.id === cardInfo.bankId);
                const card = bank?.cards?.find(c => c.id === cardInfo.id);
                if (card) setStatementDialogData({ card, bankId: cardInfo.bankId });
              }}
            />

            <div className="flex justify-end">
              <Dialog open={bankDialogOpen} onOpenChange={setBankDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2 rounded-xl" onClick={() => setEditingBankId(null)}>
                    <Plus className="w-4 h-4" />
                    Adicionar Banco
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-2xl">
                  <DialogHeader>
                    <DialogTitle>{editingBankId ? "Editar" : "Novo"} Banco</DialogTitle>
                    <DialogDescription>{editingBankId ? "Edite" : "Adicione"} uma conta bancária.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome</Label>
                      <Input id="name" placeholder="Ex: Nubank, Itaú..." value={bankFormData.name} onChange={(e) => setBankFormData({ ...bankFormData, name: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="type">Tipo</Label>
                      <Select value={bankFormData.type} onValueChange={(value: BankType) => setBankFormData({ ...bankFormData, type: value })}>
                        <SelectTrigger id="type"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="checking">Conta Corrente</SelectItem>
                          <SelectItem value="savings">Poupança</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="balance">Saldo Atual</Label>
                      <Input id="balance" type="number" step="0.01" placeholder="0,00" value={bankFormData.balance} onChange={(e) => setBankFormData({ ...bankFormData, balance: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="color">Cor</Label>
                      <div className="flex gap-2">
                        <Input id="color" type="color" value={bankFormData.color} onChange={(e) => setBankFormData({ ...bankFormData, color: e.target.value })} className="w-20 h-10" />
                        <Input value={bankFormData.color} onChange={(e) => setBankFormData({ ...bankFormData, color: e.target.value })} placeholder="#000000" />
                      </div>
                    </div>
                    <Button onClick={handleSaveBank} className="w-full rounded-xl">{editingBankId ? "Salvar Alterações" : "Adicionar"}</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Bank cards - borderless premium */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {banks.map((bank) => {
                const Icon = bankTypeIcons[bank.type];
                return (
                  <div key={bank.id} className="rounded-2xl bg-card/60 backdrop-blur-sm border-none shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
                    <div className="h-1 rounded-t-2xl" style={{ backgroundColor: bank.color }} />
                    <div className="p-5 space-y-4">
                      {/* Bank header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl" style={{ backgroundColor: `${bank.color}15` }}>
                            <Icon className="h-5 w-5" style={{ color: bank.color }} />
                          </div>
                          <div>
                            <p className="text-base font-semibold text-foreground">{bank.name}</p>
                            <p className="text-xs text-muted-foreground">{bankTypeLabels[bank.type]}</p>
                          </div>
                        </div>
                        <div className="flex gap-0.5 opacity-0 hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full" onClick={() => openEditBankDialog(bank.id)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full text-destructive" onClick={() => setDeleteBankConfirm(bank.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Balance */}
                      <div>
                        <p className="text-xs text-muted-foreground">Saldo Atual</p>
                        <p className="text-2xl font-bold text-foreground tabular-nums">{formatCurrency(bank.balance || 0)}</p>
                      </div>

                      {/* Cards list - title/subtitle style */}
                      {bank.cards && bank.cards.length > 0 && (
                        <div className="space-y-1 pt-3">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Cartões</p>
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs rounded-full hover:bg-accent/30" onClick={() => openAddCardDialog(bank.id)}>
                              <Plus className="h-3 w-3 mr-1" />
                              Novo
                            </Button>
                          </div>
                          {bank.cards.map((card) => (
                            <div key={card.id} className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-accent/50 transition-all duration-300 group cursor-pointer">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${card.color}15` }}>
                                <CreditCard className="w-4 h-4" style={{ color: card.color }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-foreground truncate">{card.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatCurrency(card.used)} de {formatCurrency(card.limit)}
                                </p>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <p className="text-sm font-semibold text-income tabular-nums">{formatCurrency(card.limit - card.used)}</p>
                                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 rounded-full" title="Ver Fatura" onClick={() => setStatementDialogData({ card, bankId: bank.id })}>
                                    <Receipt className="h-3 w-3" />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 rounded-full" onClick={() => openEditCardDialog(bank.id, card.id)}>
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 rounded-full text-destructive" onClick={() => setDeleteCardConfirm({ bankId: bank.id, cardId: card.id })}>
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {(!bank.cards || bank.cards.length === 0) && (
                        <Button variant="ghost" size="sm" className="w-full rounded-xl text-xs text-muted-foreground hover:bg-accent/30" onClick={() => openAddCardDialog(bank.id)}>
                          <Plus className="h-3.5 w-3.5 mr-1.5" />
                          Adicionar Cartão
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="investments" className="space-y-6 mt-6">
            <div className="flex justify-end">
              <Dialog open={investmentDialogOpen} onOpenChange={setInvestmentDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2 rounded-xl" onClick={() => setEditingInvestmentId(null)}>
                    <Plus className="w-4 h-4" />
                    Adicionar Investimento
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-2xl">
                  <DialogHeader>
                    <DialogTitle>{editingInvestmentId ? "Editar" : "Novo"} Investimento</DialogTitle>
                    <DialogDescription>{editingInvestmentId ? "Edite" : "Adicione"} um investimento.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="inv-name">Nome</Label>
                      <Input id="inv-name" placeholder="Ex: Tesouro Selic..." value={investmentFormData.name} onChange={(e) => setInvestmentFormData({ ...investmentFormData, name: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="inv-type">Tipo</Label>
                      <Select value={investmentFormData.type} onValueChange={(value: InvestmentType) => setInvestmentFormData({ ...investmentFormData, type: value })}>
                        <SelectTrigger id="inv-type"><SelectValue /></SelectTrigger>
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
                      <Input id="inv-amount" type="number" step="0.01" placeholder="0,00" value={investmentFormData.amount} onChange={(e) => setInvestmentFormData({ ...investmentFormData, amount: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="inv-profit">Rentabilidade (% a.a.)</Label>
                      <Input id="inv-profit" type="number" step="0.01" placeholder="0,00" value={investmentFormData.profitability} onChange={(e) => setInvestmentFormData({ ...investmentFormData, profitability: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="inv-color">Cor</Label>
                      <div className="flex gap-2">
                        <Input id="inv-color" type="color" value={investmentFormData.color} onChange={(e) => setInvestmentFormData({ ...investmentFormData, color: e.target.value })} className="w-20 h-10" />
                        <Input value={investmentFormData.color} onChange={(e) => setInvestmentFormData({ ...investmentFormData, color: e.target.value })} placeholder="#000000" />
                      </div>
                    </div>
                    <Button onClick={handleSaveInvestment} className="w-full rounded-xl">{editingInvestmentId ? "Salvar Alterações" : "Adicionar"}</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Investment cards - borderless premium */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {investments.map((investment) => (
                <div key={investment.id} className="rounded-2xl bg-card/60 backdrop-blur-sm border-none shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
                  <div className="h-1 rounded-t-2xl" style={{ backgroundColor: investment.color }} />
                  <div className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl" style={{ backgroundColor: `${investment.color}15` }}>
                          <TrendingUp className="h-5 w-5" style={{ color: investment.color }} />
                        </div>
                        <div>
                          <p className="text-base font-semibold text-foreground">{investment.name}</p>
                          <p className="text-xs text-muted-foreground">{investmentTypeLabels[investment.type]}</p>
                        </div>
                      </div>
                      <div className="flex gap-0.5">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full" onClick={() => openEditInvestmentDialog(investment.id)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full text-destructive" onClick={() => setDeleteInvestmentConfirm(investment.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Valor Investido</p>
                      <p className="text-2xl font-bold text-foreground tabular-nums">{formatCurrency(investment.amount)}</p>
                    </div>
                    {investment.profitability && (
                      <div>
                        <p className="text-xs text-muted-foreground">Rentabilidade</p>
                        <p className="text-lg font-semibold text-income">{investment.profitability}% a.a.</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Card Dialog */}
        <Dialog open={cardDialogOpen} onOpenChange={setCardDialogOpen}>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle>{editingCardData?.cardId ? "Editar" : "Novo"} Cartão</DialogTitle>
              <DialogDescription>{editingCardData?.cardId ? "Edite" : "Adicione"} um cartão de crédito.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="card-name">Nome do Cartão</Label>
                <Input id="card-name" placeholder="Ex: Cartão Principal..." value={cardFormData.name} onChange={(e) => setCardFormData({ ...cardFormData, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="card-limit">Limite Total</Label>
                <Input id="card-limit" type="number" step="0.01" placeholder="0,00" value={cardFormData.limit} onChange={(e) => setCardFormData({ ...cardFormData, limit: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="card-used">Valor Utilizado</Label>
                <Input id="card-used" type="number" step="0.01" placeholder="0,00" value={cardFormData.used} onChange={(e) => setCardFormData({ ...cardFormData, used: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="card-color">Cor</Label>
                <div className="flex gap-2">
                  <Input id="card-color" type="color" value={cardFormData.color} onChange={(e) => setCardFormData({ ...cardFormData, color: e.target.value })} className="w-20 h-10" />
                  <Input value={cardFormData.color} onChange={(e) => setCardFormData({ ...cardFormData, color: e.target.value })} placeholder="#000000" />
                </div>
              </div>
              <div className="space-y-3 p-3 rounded-xl bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="auto-debit">Débito Automático</Label>
                    <p className="text-xs text-muted-foreground">Paga a fatura automaticamente</p>
                  </div>
                  <Switch id="auto-debit" checked={cardFormData.autoDebit} onCheckedChange={(checked) => setCardFormData({ ...cardFormData, autoDebit: checked })} />
                </div>
                {cardFormData.autoDebit && (
                  <div className="space-y-2">
                    <Label>Conta para Débito</Label>
                    <Select value={cardFormData.autoDebitBankId} onValueChange={(value) => setCardFormData({ ...cardFormData, autoDebitBankId: value })}>
                      <SelectTrigger><SelectValue placeholder="Selecione a conta" /></SelectTrigger>
                      <SelectContent>
                        {banks.filter(b => b.type !== 'credit').map(bank => (
                          <SelectItem key={bank.id} value={bank.id}>{bank.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <Button onClick={handleSaveCard} className="w-full rounded-xl">{editingCardData?.cardId ? "Salvar Alterações" : "Adicionar"}</Button>
            </div>
          </DialogContent>
        </Dialog>

        {statementDialogData && (
          <CardStatementDialog
            open={!!statementDialogData}
            onOpenChange={(open) => !open && setStatementDialogData(null)}
            card={statementDialogData.card}
            bank={banks.find(b => b.id === statementDialogData.bankId)!}
            banks={banks}
          />
        )}

        <ConfirmDialog open={!!deleteBankConfirm} onOpenChange={(open) => !open && setDeleteBankConfirm(null)} title="Excluir Banco" description="Tem certeza que deseja excluir este banco? Os cartões associados também serão excluídos." onConfirm={() => deleteBankConfirm && handleDeleteBank(deleteBankConfirm)} confirmText="Excluir" variant="destructive" />
        <ConfirmDialog open={!!deleteCardConfirm} onOpenChange={(open) => !open && setDeleteCardConfirm(null)} title="Excluir Cartão" description="Tem certeza que deseja excluir este cartão?" onConfirm={() => deleteCardConfirm && handleDeleteCard(deleteCardConfirm.bankId, deleteCardConfirm.cardId)} confirmText="Excluir" variant="destructive" />
        <ConfirmDialog open={!!deleteInvestmentConfirm} onOpenChange={(open) => !open && setDeleteInvestmentConfirm(null)} title="Excluir Investimento" description="Tem certeza que deseja excluir este investimento?" onConfirm={() => deleteInvestmentConfirm && handleDeleteInvestment(deleteInvestmentConfirm)} confirmText="Excluir" variant="destructive" />
      </main>
    </div>
  );
};

export default Banks;
