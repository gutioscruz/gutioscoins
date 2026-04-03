import { useState, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Calendar, 
  CreditCard, 
  Landmark, 
  TrendingDown,
  DollarSign,
  Eye
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCommitments, Commitment, CommitmentKind } from "@/hooks/useCommitments";
import { useInstallments } from "@/hooks/useInstallments";
import { useLoans } from "@/hooks/useLoans";
import { useBanks } from "@/hooks/useBanks";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { PayCommitmentDialog } from "@/components/compromissos/PayCommitmentDialog";
import { CommitmentDetailsDialog } from "@/components/compromissos/CommitmentDetailsDialog";
import { toast } from "sonner";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from "recharts";

const Compromissos = () => {
  const { 
    activeCommitments, 
    monthlyProjections, 
    summary, 
    isLoading,
    anticipateMultipleInstallments,
    payOffInstallments,
    payLoanInstallmentsAhead,
  } = useCommitments();

  const useInstallmentsHook = useInstallments();
  const { installmentGroups } = useInstallmentsHook;
  const { loans, payLoanInstallment } = useLoans();
  const { banks } = useBanks();

  const [sortBy, setSortBy] = useState<"date" | "amount">("date");

  // Dialog states
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedCommitment, setSelectedCommitment] = useState<Commitment | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const installmentCommitments = activeCommitments.filter(c => c.kind === "installment");
  const loanCommitments = activeCommitments.filter(c => c.kind === "loan");

  const sortCommitments = (list: Commitment[]) =>
    [...list].sort((a, b) => {
      if (sortBy === "amount") return b.remainingAmount - a.remainingAmount;
      if (!a.nextDueDate && !b.nextDueDate) return 0;
      if (!a.nextDueDate) return 1;
      if (!b.nextDueDate) return -1;
      return a.nextDueDate.getTime() - b.nextDueDate.getTime();
    });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const getUrgencyBadge = (commitment: Commitment) => {
    if (!commitment.nextDueDate) return null;
    const daysUntilDue = Math.ceil(
      (commitment.nextDueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntilDue <= 0) return <Badge variant="destructive" className="text-xs">Vence hoje</Badge>;
    if (daysUntilDue <= 7) return <Badge variant="secondary" className="text-xs">Em {daysUntilDue} dias</Badge>;
    return null;
  };

  const handlePay = (commitment: Commitment) => {
    setSelectedCommitment(commitment);
    setPayDialogOpen(true);
  };

  const handleDetails = (commitment: Commitment) => {
    setSelectedCommitment(commitment);
    setDetailsDialogOpen(true);
  };

  const handleConfirmPayment = async (data: {
    commitment: Commitment;
    selectedIds: string[];
    bankId: string;
    paymentDate: Date;
    discount: number;
    createTransaction: boolean;
  }) => {
    setIsProcessing(true);
    try {
      if (data.commitment.kind === "installment") {
        if (data.createTransaction && data.bankId) {
          anticipateMultipleInstallments.mutate({
            installmentIds: data.selectedIds,
            bankId: data.bankId,
            anticipationDate: data.paymentDate,
          });
        } else {
          const { markInstallmentsPaid } = useInstallmentsHook;
          markInstallmentsPaid.mutate({
            installmentIds: data.selectedIds,
            paymentDate: data.paymentDate,
          });
        }
      } else {
        for (const installmentId of data.selectedIds) {
          payLoanInstallment({
            loanId: data.commitment.originalId,
            installmentId,
            bankId: data.createTransaction ? data.bankId : undefined,
            discount: data.discount / data.selectedIds.length,
            createTransaction: data.createTransaction,
          });
        }
      }
      toast.success(`${data.selectedIds.length} parcela(s) paga(s) com sucesso!`);
      setPayDialogOpen(false);
    } catch (error: any) {
      toast.error(`Erro ao processar pagamento: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const getInstallmentGroup = (commitment: Commitment | null) => {
    if (!commitment || commitment.kind !== "installment") return undefined;
    return installmentGroups.find(g => g.id === commitment.originalId);
  };

  const getLoan = (commitment: Commitment | null) => {
    if (!commitment || commitment.kind !== "loan") return undefined;
    return loans.find(l => l.id === commitment.originalId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  const CommitmentCard = ({ commitment }: { commitment: Commitment }) => {
    const [showAnticipation, setShowAnticipation] = useState(false);
    const Icon = commitment.kind === "installment" ? CreditCard : Landmark;
    const progress = ((commitment.totalCount - commitment.remainingCount) / commitment.totalCount) * 100;
    const isConsignado = commitment.kind === "loan" && 
      loans.find(l => l.id === commitment.originalId)?.loanType === "consignado_clt";

    // Calculate interest savings for anticipation
    const interestSavings = useMemo(() => {
      if (commitment.kind === "loan") {
        const loan = loans.find(l => l.id === commitment.originalId);
        if (!loan) return 0;
        const unpaidPayments = loan.payments?.filter(p => !p.paid) || [];
        return unpaidPayments.reduce((sum, p) => sum + p.interest, 0);
      }
      // For installments, no interest to save typically
      return 0;
    }, [commitment, loans]);

    return (
      <div className="group rounded-3xl bg-card/60 backdrop-blur-sm border-none shadow-sm p-4 hover:shadow-md transition-all duration-300">
        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-xl bg-muted shrink-0 mt-0.5">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <p className="text-sm font-semibold truncate">{commitment.title}</p>
              {getUrgencyBadge(commitment)}
              {isConsignado && (
                <Badge className="bg-income/10 text-income border-none text-xs">
                  Desconto em Folha
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {commitment.origin}
              {commitment.categoryName && ` • ${commitment.categoryName}`}
              {" • "}
              {commitment.totalCount - commitment.remainingCount}/{commitment.totalCount} parcelas
            </p>

            {/* Progress bar */}
            <div className="mt-2.5 w-full bg-muted rounded-full h-1.5">
              <div 
                className="bg-primary h-1.5 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Anticipation savings badge */}
            {showAnticipation && interestSavings > 0 && (
              <div className="mt-2 p-2.5 rounded-2xl bg-income/5 border-none">
                <p className="text-xs text-income font-medium">
                  🎯 Antecipando hoje, você economiza <span className="font-bold">{formatCurrency(interestSavings)}</span> em juros
                </p>
              </div>
            )}

            <div className="flex gap-2 mt-3 flex-wrap">
              <Button 
                variant="default" 
                size="sm"
                className="rounded-xl h-8 text-xs"
                onClick={() => handlePay(commitment)}
              >
                <DollarSign className="h-3.5 w-3.5 mr-1" />
                Pagar
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                className="rounded-xl h-8 text-xs"
                onClick={() => handleDetails(commitment)}
              >
                <Eye className="h-3.5 w-3.5 mr-1" />
                Detalhes
              </Button>
              {commitment.kind === "loan" && interestSavings > 0 && (
                <Button 
                  variant="outline" 
                  size="sm"
                  className="rounded-xl h-8 text-xs border-none bg-primary/5 hover:bg-primary/10 text-primary"
                  onClick={() => setShowAnticipation(!showAnticipation)}
                >
                  <TrendingDown className="h-3.5 w-3.5 mr-1" />
                  Simular Antecipação
                </Button>
              )}
            </div>
          </div>

          <div className="text-right shrink-0">
            <p className="text-sm font-semibold">
              {formatCurrency(commitment.monthlyAmount)}
              <span className="text-xs text-muted-foreground font-normal">/mês</span>
            </p>
            {commitment.nextDueDate && (
              <p className="text-xs text-muted-foreground flex items-center justify-end gap-1 mt-0.5">
                <Calendar className="h-3 w-3" />
                {format(commitment.nextDueDate, "dd/MM", { locale: ptBR })}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Restam {formatCurrency(commitment.remainingAmount)}
            </p>
          </div>
        </div>
      </div>
    );
  };

  const EmptyState = ({ message }: { message: string }) => (
    <div className="rounded-2xl bg-card/40 backdrop-blur-sm border-none p-12 flex flex-col items-center justify-center">
      <TrendingDown className="h-10 w-10 text-muted-foreground mb-3" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Compromissos</h1>
          <p className="text-muted-foreground">
            Visão unificada de parcelamentos e empréstimos
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          {[
            { label: "Este Mês", value: formatCurrency(summary.thisMonthAmount) },
            { label: "Próximo Mês", value: formatCurrency(summary.nextMonthAmount) },
            { label: "Total Restante", value: formatCurrency(summary.totalRemainingAmount) },
            { label: "Ativos", value: String(summary.totalActive), sub: `${summary.installmentsCount} parcelamentos · ${summary.loansCount} empréstimos` },
          ].map((card) => (
            <div key={card.label} className="rounded-2xl bg-card/60 backdrop-blur-sm border-none shadow-sm p-5">
              <p className="text-xs text-muted-foreground font-medium mb-1">{card.label}</p>
              <p className="text-2xl font-bold">{card.value}</p>
              {card.sub && <p className="text-xs text-muted-foreground mt-0.5">{card.sub}</p>}
            </div>
          ))}
        </div>

        {/* Main Tabs: Parcelamentos / Empréstimos / Projeção */}
        <Tabs defaultValue="parcelamentos" className="w-full">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <TabsList className="bg-muted/50 rounded-xl">
              <TabsTrigger value="parcelamentos" className="rounded-lg text-sm">
                <CreditCard className="h-4 w-4 mr-1.5" />
                Parcelamentos
              </TabsTrigger>
              <TabsTrigger value="emprestimos" className="rounded-lg text-sm">
                <Landmark className="h-4 w-4 mr-1.5" />
                Empréstimos
              </TabsTrigger>
              <TabsTrigger value="projection" className="rounded-lg text-sm">
                Projeção
              </TabsTrigger>
            </TabsList>

            <Select value={sortBy} onValueChange={(v) => setSortBy(v as "date" | "amount")}>
              <SelectTrigger className="w-[180px] rounded-xl bg-card/60 border-none">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Próximo Vencimento</SelectItem>
                <SelectItem value="amount">Maior Valor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <TabsContent value="parcelamentos" className="mt-4 space-y-3">
            {installmentCommitments.length === 0 ? (
              <EmptyState message="Nenhum parcelamento ativo" />
            ) : (
              sortCommitments(installmentCommitments).map((c) => (
                <CommitmentCard key={c.id} commitment={c} />
              ))
            )}
          </TabsContent>

          <TabsContent value="emprestimos" className="mt-4 space-y-3">
            {loanCommitments.length === 0 ? (
              <EmptyState message="Nenhum empréstimo ativo" />
            ) : (
              sortCommitments(loanCommitments).map((c) => (
                <CommitmentCard key={c.id} commitment={c} />
              ))
            )}
          </TabsContent>

          <TabsContent value="projection" className="mt-4 space-y-4">
            <div className="rounded-2xl bg-card/60 backdrop-blur-sm border-none shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Projeção dos Próximos 12 Meses</h3>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyProjections}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="monthLabel" 
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis 
                      tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: 'none',
                        borderRadius: '12px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                      }}
                    />
                    <Legend />
                    <Bar 
                      dataKey="installmentsAmount" 
                      name="Parcelamentos" 
                      fill="hsl(var(--primary))" 
                      radius={[6, 6, 0, 0]}
                      stackId="a"
                    />
                    <Bar 
                      dataKey="loansAmount" 
                      name="Empréstimos" 
                      fill="hsl(var(--muted-foreground))" 
                      radius={[6, 6, 0, 0]}
                      stackId="a"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Monthly breakdown */}
            <div className="rounded-2xl bg-card/60 backdrop-blur-sm border-none shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Detalhamento por Mês</h3>
              <div className="space-y-2">
                {monthlyProjections.map((proj) => (
                  <div key={proj.month} className="flex items-center justify-between p-3 rounded-xl hover:bg-accent/30 transition-colors">
                    <span className="text-sm font-medium">{proj.monthLabel}</span>
                    <div className="flex gap-6 text-sm">
                      <span className="text-muted-foreground">{formatCurrency(proj.installmentsAmount)}</span>
                      <span className="text-muted-foreground">{formatCurrency(proj.loansAmount)}</span>
                      <span className="font-semibold">{formatCurrency(proj.totalAmount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        <PayCommitmentDialog
          open={payDialogOpen}
          onOpenChange={setPayDialogOpen}
          commitment={selectedCommitment}
          banks={banks}
          installmentGroup={getInstallmentGroup(selectedCommitment)}
          loan={getLoan(selectedCommitment)}
          onConfirm={handleConfirmPayment}
          isLoading={isProcessing}
        />

        <CommitmentDetailsDialog
          open={detailsDialogOpen}
          onOpenChange={setDetailsDialogOpen}
          commitment={selectedCommitment}
          installmentGroup={getInstallmentGroup(selectedCommitment)}
          loan={getLoan(selectedCommitment)}
        />
      </main>
    </div>
  );
};

export default Compromissos;
