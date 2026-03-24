import { useState } from "react";
import { useFinance } from "@/contexts/FinanceContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calculator, Plus, TrendingDown, DollarSign, Calendar, AlertCircle, CheckCircle2, Trash2, Pencil } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { PaymentFrequency, LoanStatus } from "@/types/finance";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type LoanType = 'consignado' | 'consignado_clt' | 'fatura_parcelada' | 'pessoal';

const loanTypeLabels: Record<LoanType, string> = {
  consignado: 'Consignado',
  consignado_clt: 'Consignado CLT',
  fatura_parcelada: 'Fatura Parcelada',
  pessoal: 'Pessoal',
};

const Loans = () => {
  const { loans, banks, addLoan, deleteLoan, payLoanInstallment, payLoanInstallmentsAhead } = useFinance();
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  
  // Pay single installment dialog state
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [payingLoanId, setPayingLoanId] = useState("");
  const [payingInstallmentId, setPayingInstallmentId] = useState("");
  const [payingAmount, setPayingAmount] = useState(0);
  const [payBankId, setPayBankId] = useState("");
  const [payDiscount, setPayDiscount] = useState("");
  const [payCreateTransaction, setPayCreateTransaction] = useState(true);
  
  // Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [principal, setPrincipal] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [installments, setInstallments] = useState("");
  const [paymentFrequency, setPaymentFrequency] = useState<PaymentFrequency>("monthly");
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [bankId, setBankId] = useState("");
  const [loanType, setLoanType] = useState<LoanType>("pessoal");
  // Calculator states
  const [calcPrincipal, setCalcPrincipal] = useState("");
  const [calcInterestRate, setCalcInterestRate] = useState("");
  const [calcInstallments, setCalcInstallments] = useState("");
  const [calcFrequency, setCalcFrequency] = useState<PaymentFrequency>("monthly");
  
  // Anticipation state (per loan)
  const [installmentsToPayAhead, setInstallmentsToPayAhead] = useState("");
  
  const calculateMonthlyPayment = (p: number, r: number, n: number, freq: PaymentFrequency) => {
    const periodsPerYear = freq === "monthly" ? 12 : freq === "biweekly" ? 26 : 52;
    const periodRate = (r / 100) / periodsPerYear;
    return p * (periodRate * Math.pow(1 + periodRate, n)) / (Math.pow(1 + periodRate, n) - 1);
  };
  
  const calculateResults = () => {
    const p = parseFloat(calcPrincipal);
    const r = parseFloat(calcInterestRate);
    const n = parseInt(calcInstallments);
    
    if (!p || !r || !n) return null;
    
    const payment = calculateMonthlyPayment(p, r, n, calcFrequency);
    const totalPaid = payment * n;
    const totalInterest = totalPaid - p;
    
    return { payment, totalPaid, totalInterest };
  };
  
  const results = calculateResults();
  
  const handleAddLoan = () => {
    if (!name || !principal || !interestRate || !installments) return;
    
    addLoan({
      name,
      description,
      principal: parseFloat(principal),
      interestRate: parseFloat(interestRate),
      installments: parseInt(installments),
      paymentFrequency,
      startDate: new Date(startDate),
      status: "active" as LoanStatus,
      bankId: bankId || undefined,
    });
    
    setIsAddDialogOpen(false);
    resetForm();
  };
  
  const resetForm = () => {
    setName("");
    setDescription("");
    setPrincipal("");
    setInterestRate("");
    setInstallments("");
    setPaymentFrequency("monthly");
    setStartDate(format(new Date(), "yyyy-MM-dd"));
    setBankId("");
    setLoanType("pessoal");
  };
  
  const handlePayAhead = (loanId: string) => {
    if (!loanId || !installmentsToPayAhead) return;
    const loan = loans.find(l => l.id === loanId);
    if (!loan) return;
    const count = parseInt(installmentsToPayAhead);
    const unpaid = loan.payments.filter(p => !p.paid).slice(0, count);
    const totalInterestDiscount = unpaid.reduce((sum, p) => sum + p.interest, 0);
    payLoanInstallmentsAhead({ loanId, count, discount: totalInterestDiscount });
    setInstallmentsToPayAhead("");
  };
  
  const getStatusColor = (status: LoanStatus) => {
    switch (status) {
      case "active": return "bg-blue-500";
      case "paid": return "bg-green-500";
      case "overdue": return "bg-red-500";
    }
  };
  
  const getStatusLabel = (status: LoanStatus) => {
    switch (status) {
      case "active": return "Ativo";
      case "paid": return "Pago";
      case "overdue": return "Atrasado";
    }
  };
  
  const getFrequencyLabel = (freq: PaymentFrequency) => {
    switch (freq) {
      case "monthly": return "Mensal";
      case "biweekly": return "Quinzenal";
      case "weekly": return "Semanal";
    }
  };
  
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Empréstimos e Dívidas</h1>
          <p className="text-muted-foreground">Gerencie seus empréstimos e planeje pagamentos antecipados</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isCalculatorOpen} onOpenChange={setIsCalculatorOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Calculator className="mr-2 h-4 w-4" />
                Calculadora
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Calculadora de Empréstimos</DialogTitle>
                <DialogDescription>
                  Simule diferentes cenários de empréstimo e veja o impacto dos juros
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor do Empréstimo (R$)</Label>
                  <Input
                    type="number"
                    value={calcPrincipal}
                    onChange={(e) => setCalcPrincipal(e.target.value)}
                    placeholder="10000"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Taxa de Juros (% ao ano)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={calcInterestRate}
                    onChange={(e) => setCalcInterestRate(e.target.value)}
                    placeholder="12.5"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Número de Parcelas</Label>
                  <Input
                    type="number"
                    value={calcInstallments}
                    onChange={(e) => setCalcInstallments(e.target.value)}
                    placeholder="24"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Frequência de Pagamento</Label>
                  <Select value={calcFrequency} onValueChange={(v) => setCalcFrequency(v as PaymentFrequency)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Mensal</SelectItem>
                      <SelectItem value="biweekly">Quinzenal</SelectItem>
                      <SelectItem value="weekly">Semanal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {results && (
                <div className="mt-6 p-4 bg-muted rounded-lg space-y-3">
                  <h3 className="font-semibold text-lg">Resultados da Simulação</h3>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Valor da Parcela</p>
                      <p className="text-2xl font-bold text-primary">
                        R$ {results.payment.toFixed(2)}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-muted-foreground">Total Pago</p>
                      <p className="text-2xl font-bold">
                        R$ {results.totalPaid.toFixed(2)}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-muted-foreground">Total de Juros</p>
                      <p className="text-2xl font-bold text-destructive">
                        R$ {results.totalInterest.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="pt-2 border-t">
                    <p className="text-sm text-muted-foreground">
                      Você pagará <span className="font-semibold">{((results.totalInterest / parseFloat(calcPrincipal)) * 100).toFixed(1)}%</span> de juros sobre o valor emprestado
                    </p>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Novo Empréstimo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Empréstimo</DialogTitle>
                <DialogDescription>
                  Registre um novo empréstimo ou dívida
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: Financiamento Imobiliário"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select value={loanType} onValueChange={(v) => setLoanType(v as LoanType)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pessoal">Pessoal</SelectItem>
                        <SelectItem value="consignado">Consignado</SelectItem>
                        <SelectItem value="consignado_clt">Consignado CLT</SelectItem>
                        <SelectItem value="fatura_parcelada">Fatura Parcelada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Detalhes do empréstimo"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Valor (R$)</Label>
                    <Input
                      type="number"
                      value={principal}
                      onChange={(e) => setPrincipal(e.target.value)}
                      placeholder="50000"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Taxa de Juros (% a.a.)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={interestRate}
                      onChange={(e) => setInterestRate(e.target.value)}
                      placeholder="10.5"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Número de Parcelas</Label>
                    <Input
                      type="number"
                      value={installments}
                      onChange={(e) => setInstallments(e.target.value)}
                      placeholder="36"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Frequência</Label>
                    <Select value={paymentFrequency} onValueChange={(v) => setPaymentFrequency(v as PaymentFrequency)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Mensal</SelectItem>
                        <SelectItem value="biweekly">Quinzenal</SelectItem>
                        <SelectItem value="weekly">Semanal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data de Início</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Banco (Opcional)</Label>
                    <Select value={bankId} onValueChange={setBankId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {banks.map(bank => (
                          <SelectItem key={bank.id} value={bank.id}>
                            {bank.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAddLoan}>Adicionar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      {loans.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <TrendingDown className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum empréstimo cadastrado</h3>
            <p className="text-muted-foreground text-center mb-4">
              Adicione seus empréstimos e dívidas para acompanhar pagamentos e planejar antecipações
            </p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Primeiro Empréstimo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {loans.map((loan) => {
            const paidPayments = loan.payments.filter(p => p.paid).length;
            const progress = (paidPayments / loan.payments.length) * 100;
            const remainingAmount = loan.principal + loan.totalInterest - loan.totalPaid;
            const nextPayment = loan.payments.find(p => !p.paid);
            
            return (
              <Card key={loan.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 flex-wrap">
                        {loan.name}
                        <Badge className={getStatusColor(loan.status)}>
                          {getStatusLabel(loan.status)}
                        </Badge>
                        {loan.loanType === 'consignado_clt' && (
                          <Badge className="bg-income/10 text-income border-none text-xs">
                            Desconto Automático em Folha
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription>{loan.description}</CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteLoan(loan.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Valor Original</p>
                      <p className="text-xl font-bold">R$ {loan.principal.toFixed(2)}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-muted-foreground">Total com Juros</p>
                      <p className="text-xl font-bold">
                        R$ {(loan.principal + loan.totalInterest).toFixed(2)}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-muted-foreground">Total Pago</p>
                      <p className="text-xl font-bold text-green-500">
                        R$ {loan.totalPaid.toFixed(2)}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-muted-foreground">Saldo Devedor</p>
                      <p className="text-xl font-bold text-destructive">
                        R$ {remainingAmount.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium">
                        Progresso: {paidPayments} de {loan.payments.length} parcelas pagas
                      </p>
                      <p className="text-sm text-muted-foreground">{progress.toFixed(0)}%</p>
                    </div>
                    <Progress value={progress} />
                  </div>
                  
                  <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Taxa de Juros</p>
                      <p className="font-semibold">{loan.interestRate}% a.a.</p>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Frequência</p>
                      <p className="font-semibold">{getFrequencyLabel(loan.paymentFrequency)}</p>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Total de Juros</p>
                      <p className="font-semibold text-destructive">R$ {loan.totalInterest.toFixed(2)}</p>
                    </div>
                  </div>
                  
                  {nextPayment && (
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-semibold">Próximo Vencimento</p>
                          <p className="text-sm text-muted-foreground">
                            {format(nextPayment.dueDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Valor da Parcela</p>
                        <p className="text-xl font-bold">R$ {nextPayment.amount.toFixed(2)}</p>
                      </div>
                    </div>
                  )}
                  
                  <Tabs defaultValue="schedule" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="schedule">Cronograma</TabsTrigger>
                      <TabsTrigger value="anticipate">Antecipar Parcelas</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="schedule" className="space-y-2 max-h-60 overflow-y-auto">
                      {loan.payments.map((payment) => (
                        <div
                          key={payment.id}
                          className={`flex items-center justify-between p-3 rounded-lg border ${
                            payment.paid ? 'bg-muted' : 'bg-background'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {payment.paid ? (
                              <CheckCircle2 className="h-5 w-5 text-green-500" />
                            ) : (
                              <AlertCircle className="h-5 w-5 text-muted-foreground" />
                            )}
                            <div>
                              <p className="font-medium">Parcela {payment.installmentNumber}</p>
                              <p className="text-sm text-muted-foreground">
                                {format(payment.dueDate, "dd/MM/yyyy")}
                                {payment.paid && payment.paidDate && ` • Pago em ${format(payment.paidDate, "dd/MM/yyyy")}`}
                              </p>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <p className="font-semibold">R$ {payment.amount.toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">
                              Principal: R$ {payment.principal.toFixed(2)} | Juros: R$ {payment.interest.toFixed(2)}
                            </p>
                          </div>
                          
                          {!payment.paid && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setPayingLoanId(loan.id);
                                setPayingInstallmentId(payment.id);
                                setPayingAmount(payment.amount);
                                setPayBankId(loan.bankId || "");
                                setPayDiscount("");
                                setPayCreateTransaction(true);
                                setPayDialogOpen(true);
                              }}
                            >
                              Pagar
                            </Button>
                          )}
                        </div>
                      ))}
                    </TabsContent>
                    
                    <TabsContent value="anticipate" className="space-y-4">
                      <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                        <div className="flex items-start gap-2 mb-3">
                          <DollarSign className="h-5 w-5 text-blue-500 mt-0.5" />
                          <div>
                            <p className="font-semibold text-blue-500">Economia com Antecipação</p>
                            <p className="text-sm text-muted-foreground">
                              Ao antecipar parcelas, você reduz o saldo devedor e economiza nos juros futuros
                            </p>
                          </div>
                        </div>
                        
                        <div className="space-y-3 mt-4">
                          <div className="space-y-2">
                            <Label>Quantas parcelas deseja antecipar?</Label>
                            <Input
                              type="number"
                              placeholder="Ex: 3"
                              value={installmentsToPayAhead}
                              onChange={(e) => setInstallmentsToPayAhead(e.target.value)}
                            />
                          </div>
                          
                          {installmentsToPayAhead && (() => {
                            const unpaid = loan.payments.filter(p => !p.paid);
                            const selected = unpaid.slice(0, parseInt(installmentsToPayAhead));
                            const totalOriginal = selected.reduce((sum, p) => sum + p.amount, 0);
                            const totalPrincipalOnly = selected.reduce((sum, p) => sum + p.principal, 0);
                            const totalSaved = totalOriginal - totalPrincipalOnly;
                            return (
                              <div className="p-3 bg-muted rounded-lg space-y-2">
                                <div className="flex justify-between text-sm text-muted-foreground">
                                  <span>Valor original ({selected.length}x):</span>
                                  <span className="line-through">R$ {totalOriginal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm text-muted-foreground">
                                  <span>Juros eliminados:</span>
                                  <span className="text-green-500 font-medium">− R$ {totalSaved.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm font-semibold border-t pt-2">
                                  <span>Valor com desconto (só amortização):</span>
                                  <span className="text-2xl font-bold text-primary">R$ {totalPrincipalOnly.toFixed(2)}</span>
                                </div>
                              </div>
                            );
                          })()}
                          
                          <Button
                            className="w-full"
                            disabled={!installmentsToPayAhead || parseInt(installmentsToPayAhead) <= 0}
                            onClick={() => handlePayAhead(loan.id)}
                          >
                            Confirmar Antecipação
                          </Button>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      {/* Pay Single Installment Dialog */}
      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pagar Parcela</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted rounded-lg text-center">
              <p className="text-sm text-muted-foreground">Valor da parcela</p>
              <p className="text-2xl font-bold">R$ {payingAmount.toFixed(2)}</p>
            </div>

            <div className="flex items-center space-x-2 p-3 border rounded-lg">
              <Checkbox
                id="loanPayCreateTransaction"
                checked={payCreateTransaction}
                onCheckedChange={(checked) => setPayCreateTransaction(checked === true)}
              />
              <div className="grid gap-1.5 leading-none">
                <label htmlFor="loanPayCreateTransaction" className="text-sm font-medium cursor-pointer">
                  Registrar transação financeira
                </label>
                <p className="text-xs text-muted-foreground">
                  Desmarque para apenas marcar como pago.
                </p>
              </div>
            </div>

            {payCreateTransaction && (
              <div className="space-y-2">
                <Label>Conta para débito</Label>
                <Select value={payBankId} onValueChange={setPayBankId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a conta" />
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
            )}

            <div className="space-y-2">
              <Label>Desconto (opcional)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0,00"
                value={payDiscount}
                onChange={(e) => setPayDiscount(e.target.value)}
              />
            </div>

            {(parseFloat(payDiscount) || 0) > 0 && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex justify-between text-sm">
                  <span>Valor final</span>
                  <span className="font-bold">R$ {(payingAmount - (parseFloat(payDiscount) || 0)).toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={payCreateTransaction && !payBankId}
              onClick={() => {
                payLoanInstallment({
                  loanId: payingLoanId,
                  installmentId: payingInstallmentId,
                  bankId: payCreateTransaction ? payBankId : undefined,
                  discount: parseFloat(payDiscount) || 0,
                  createTransaction: payCreateTransaction,
                });
                setPayDialogOpen(false);
              }}
            >
              {payCreateTransaction ? "Confirmar Pagamento" : "Marcar como Pago"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Loans;
