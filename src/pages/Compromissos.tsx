import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Calendar, 
  CreditCard, 
  Landmark, 
  TrendingDown,
  Filter,
  DollarSign,
  FastForward,
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

  const [kindFilter, setKindFilter] = useState<CommitmentKind | "all">("all");
  const [sortBy, setSortBy] = useState<"date" | "amount">("date");

  // Dialog states
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedCommitment, setSelectedCommitment] = useState<Commitment | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const filteredCommitments = activeCommitments
    .filter(c => kindFilter === "all" || c.kind === kindFilter)
    .sort((a, b) => {
      if (sortBy === "amount") {
        return b.remainingAmount - a.remainingAmount;
      }
      // Sort by date
      if (!a.nextDueDate && !b.nextDueDate) return 0;
      if (!a.nextDueDate) return 1;
      if (!b.nextDueDate) return -1;
      return a.nextDueDate.getTime() - b.nextDueDate.getTime();
    });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getKindIcon = (kind: CommitmentKind) => {
    return kind === "installment" ? CreditCard : Landmark;
  };

  const getKindLabel = (kind: CommitmentKind) => {
    return kind === "installment" ? "Parcelamento" : "Empréstimo";
  };

  const getUrgencyBadge = (commitment: Commitment) => {
    if (!commitment.nextDueDate) return null;
    
    const today = new Date();
    const daysUntilDue = Math.ceil(
      (commitment.nextDueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilDue <= 0) {
      return <Badge variant="destructive">Vence hoje</Badge>;
    }
    if (daysUntilDue <= 7) {
      return <Badge variant="secondary">Em {daysUntilDue} dias</Badge>;
    }
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
    count: number;
    bankId: string;
    paymentDate: Date;
    discount: number;
    createTransaction: boolean;
  }) => {
    setIsProcessing(true);
    try {
      if (data.commitment.kind === "installment") {
        const group = installmentGroups.find(g => g.id === data.commitment.originalId);
        if (!group) throw new Error("Parcelamento não encontrado");

        const pendingInstallments = group.installments
          .filter(i => !i.isPaid)
          .sort((a, b) => a.installmentNumber - b.installmentNumber)
          .slice(0, data.count);

        const installmentIds = pendingInstallments.map(i => i.id);

        if (data.createTransaction && data.bankId) {
          anticipateMultipleInstallments.mutate({
            installmentIds,
            bankId: data.bankId,
            anticipationDate: data.paymentDate,
          });
        } else {
          // Just mark as paid without creating transaction
          const { markInstallmentsPaid } = useInstallmentsHook;
          markInstallmentsPaid.mutate({
            installmentIds,
            paymentDate: data.paymentDate,
          });
        }
      } else {
        payLoanInstallmentsAhead({
          loanId: data.commitment.originalId,
          count: data.count,
          bankId: data.createTransaction ? data.bankId : undefined,
          discount: data.discount,
          createTransaction: data.createTransaction,
        });
      }

      toast.success(`${data.count} parcela(s) paga(s) com sucesso!`);
      setPayDialogOpen(false);
    } catch (error: any) {
      toast.error(`Erro ao processar pagamento: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Get related data for details dialog
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
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Este Mês
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-expense">
                {formatCurrency(summary.thisMonthAmount)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Próximo Mês
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {formatCurrency(summary.nextMonthAmount)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Restante
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-expense">
                {formatCurrency(summary.totalRemainingAmount)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Compromissos Ativos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{summary.totalActive}</p>
              <p className="text-xs text-muted-foreground">
                {summary.installmentsCount} parcelamentos · {summary.loansCount} empréstimos
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="list" className="w-full">
          <TabsList>
            <TabsTrigger value="list">Lista</TabsTrigger>
            <TabsTrigger value="projection">Projeção Mensal</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-4 mt-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-4">
              <Select value={kindFilter} onValueChange={(v) => setKindFilter(v as CommitmentKind | "all")}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="installment">Parcelamentos</SelectItem>
                  <SelectItem value="loan">Empréstimos</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(v) => setSortBy(v as "date" | "amount")}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Próximo Vencimento</SelectItem>
                  <SelectItem value="amount">Maior Valor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Commitments List */}
            {filteredCommitments.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <TrendingDown className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">Nenhum compromisso ativo</p>
                  <p className="text-muted-foreground text-sm">
                    Você não possui parcelamentos ou empréstimos pendentes
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredCommitments.map((commitment) => {
                  const Icon = getKindIcon(commitment.kind);
                  const progress = ((commitment.totalCount - commitment.remainingCount) / commitment.totalCount) * 100;

                  return (
                    <Card key={commitment.id} className="hover:bg-muted/50 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className="p-2 rounded-lg bg-muted mt-1">
                            <Icon className="h-5 w-5 text-muted-foreground" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <p className="font-medium truncate">{commitment.title}</p>
                              <Badge variant="outline" className="text-xs">
                                {getKindLabel(commitment.kind)}
                              </Badge>
                              {getUrgencyBadge(commitment)}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                              <span>{commitment.origin}</span>
                              {commitment.categoryName && (
                                <>
                                  <span>·</span>
                                  <span>{commitment.categoryName}</span>
                                </>
                              )}
                              <span>·</span>
                              <span>
                                {commitment.totalCount - commitment.remainingCount}/{commitment.totalCount} parcelas
                              </span>
                            </div>
                            {/* Progress bar */}
                            <div className="mt-2 w-full bg-muted rounded-full h-1.5">
                              <div 
                                className="bg-primary h-1.5 rounded-full transition-all"
                                style={{ width: `${progress}%` }}
                              />
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2 mt-3 pt-3 border-t">
                              <Button 
                                variant="default" 
                                size="sm" 
                                onClick={() => handlePay(commitment)}
                              >
                                <DollarSign className="h-4 w-4 mr-1" />
                                Pagar
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleDetails(commitment)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Detalhes
                              </Button>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <p className="font-medium">
                              {formatCurrency(commitment.monthlyAmount)}
                              <span className="text-xs text-muted-foreground">/mês</span>
                            </p>
                            {commitment.nextDueDate && (
                              <p className="text-sm text-muted-foreground flex items-center justify-end gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(commitment.nextDueDate, "dd/MM", { locale: ptBR })}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              Restam {formatCurrency(commitment.remainingAmount)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="projection" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Projeção dos Próximos 12 Meses</CardTitle>
              </CardHeader>
              <CardContent>
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
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Legend />
                      <Bar 
                        dataKey="installmentsAmount" 
                        name="Parcelamentos" 
                        fill="hsl(var(--primary))" 
                        radius={[4, 4, 0, 0]}
                        stackId="a"
                      />
                      <Bar 
                        dataKey="loansAmount" 
                        name="Empréstimos" 
                        fill="hsl(var(--destructive))" 
                        radius={[4, 4, 0, 0]}
                        stackId="a"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Monthly breakdown table */}
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-lg">Detalhamento por Mês</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 font-medium">Mês</th>
                        <th className="text-right py-2 font-medium">Parcelamentos</th>
                        <th className="text-right py-2 font-medium">Empréstimos</th>
                        <th className="text-right py-2 font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyProjections.map((proj) => (
                        <tr key={proj.month} className="border-b last:border-0">
                          <td className="py-2">{proj.monthLabel}</td>
                          <td className="py-2 text-right">{formatCurrency(proj.installmentsAmount)}</td>
                          <td className="py-2 text-right">{formatCurrency(proj.loansAmount)}</td>
                          <td className="py-2 text-right font-medium">{formatCurrency(proj.totalAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        <PayCommitmentDialog
          open={payDialogOpen}
          onOpenChange={setPayDialogOpen}
          commitment={selectedCommitment}
          banks={banks}
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
