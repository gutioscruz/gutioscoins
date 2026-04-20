import { useState, useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Calendar, 
  CreditCard, 
  Landmark, 
  TrendingDown,
  DollarSign,
  Eye,
  LineChart as LineChartIcon,
  MoreVertical,
  Pencil,
  Trash2,
  Plus,
  ClipboardCheck,
  Hash,
  PiggyBank,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PremiumEmptyState } from "@/components/ui/PremiumEmptyState";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCommitments, Commitment } from "@/hooks/useCommitments";
import { useInstallments } from "@/hooks/useInstallments";
import { useLoans } from "@/hooks/useLoans";
import { useBanks } from "@/hooks/useBanks";
import { useCategories } from "@/hooks/useCategories";
import { PayCommitmentDialog } from "@/components/compromissos/PayCommitmentDialog";
import { CommitmentDetailsDialog } from "@/components/compromissos/CommitmentDetailsDialog";
import { EditLoanDialog } from "@/components/compromissos/EditLoanDialog";
import { AddLoanDialog } from "@/components/compromissos/AddLoanDialog";
import { BulkMarkPaidDialog } from "@/components/compromissos/BulkMarkPaidDialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { SniperButton } from "@/components/compromissos/SniperButton";
import { toast } from "sonner";
import { getCategoryColor } from "@/lib/categoryColors";
import { 
  Area,
  AreaChart,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
} from "recharts";

const Compromissos = () => {
  const { 
    activeCommitments, 
    monthlyProjections, 
    summary, 
    isLoading,
    anticipateMultipleInstallments,
    payMultipleLoanInstallments,
  } = useCommitments();

  const useInstallmentsHook = useInstallments();
  const { installmentGroups } = useInstallmentsHook;
  const { loans, updateLoan, deleteLoan, addLoanAsync, bulkMarkPaid } = useLoans();
  const { banks } = useBanks();
  const { categories } = useCategories();

  const [sortBy, setSortBy] = useState<"date" | "amount">("date");

  // Dialog states
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [editLoanDialogOpen, setEditLoanDialogOpen] = useState(false);
  const [deleteLoanDialogOpen, setDeleteLoanDialogOpen] = useState(false);
  const [addLoanDialogOpen, setAddLoanDialogOpen] = useState(false);
  const [bulkMarkPaidDialogOpen, setBulkMarkPaidDialogOpen] = useState(false);
  const [selectedCommitment, setSelectedCommitment] = useState<Commitment | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const installmentCommitments = activeCommitments.filter(c => c.kind === "installment");
  const loanCommitments = activeCommitments.filter(c => c.kind === "loan");

  // Format data for Debt Burndown Chart (Cumulative total remaining per month)
  const burndownData = useMemo(() => {
    let currentDebt = summary.totalRemainingAmount;
    
    return monthlyProjections.map(proj => {
      // The current debt at the START of the month
      const plottedDebt = currentDebt;
      // We subtract what is due THIS month for the NEXT month's starting debt
      currentDebt = Math.max(0, currentDebt - proj.totalAmount);
      return {
        monthLabel: proj.monthLabel,
        remainingDebt: plottedDebt,
      };
    });
  }, [monthlyProjections, summary.totalRemainingAmount]);

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

  const handleEditLoan = (commitment: Commitment) => {
    setSelectedCommitment(commitment);
    setEditLoanDialogOpen(true);
  };

  const handleDeleteLoan = (commitment: Commitment) => {
    setSelectedCommitment(commitment);
    setDeleteLoanDialogOpen(true);
  };

  const confirmDeleteLoan = () => {
    if (!selectedCommitment || selectedCommitment.kind !== "loan") return;
    deleteLoan(selectedCommitment.originalId);
    setDeleteLoanDialogOpen(false);
    setSelectedCommitment(null);
  };

  const handleSaveLoan = (id: string, updates: any) => {
    updateLoan({ id, loan: updates });
    setEditLoanDialogOpen(false);
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
            discount: data.discount,
          });
        } else {
          const { markInstallmentsPaid } = useInstallmentsHook;
          markInstallmentsPaid.mutate({
            installmentIds: data.selectedIds,
            paymentDate: data.paymentDate,
          });
        }
      } else {
        payMultipleLoanInstallments({
          loanId: data.commitment.originalId,
          installmentIds: data.selectedIds,
          bankId: data.createTransaction ? data.bankId : undefined,
          discount: data.discount,
          createTransaction: data.createTransaction,
          paymentDate: data.paymentDate,
        });
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
      <div className="min-h-screen bg-background container mx-auto px-4 py-8 space-y-8">
        <div>
          <Skeleton className="h-10 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 w-full rounded-3xl" />)}
        </div>
        <div className="space-y-4 pt-4">
          <Skeleton className="h-10 w-full max-w-sm rounded-xl" />
          <div className="space-y-3">
             {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 w-full rounded-3xl" />)}
          </div>
        </div>
      </div>
    );
  }

  const CommitmentCard = ({ commitment }: { commitment: Commitment }) => {
    const Icon = commitment.kind === "installment" ? CreditCard : Landmark;
    const progress = ((commitment.totalCount - commitment.remainingCount) / commitment.totalCount) * 100;
    const isConsignado = commitment.kind === "loan" && 
      loans.find(l => l.id === commitment.originalId)?.loanType === "consignado_clt";

    return (
      <div className="group rounded-3xl bg-card/40 backdrop-blur-md border-none ring-1 ring-white/5 shadow-sm p-4 sm:p-5 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:-translate-y-1 transition-all duration-300">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="p-3 rounded-2xl bg-muted/50 shrink-0 group-hover:bg-primary/20 transition-colors self-start">
            <Icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <p className="text-base font-semibold truncate text-foreground">{commitment.title}</p>
              {getUrgencyBadge(commitment)}
              {isConsignado && (
                <Badge className="bg-income/10 text-income border-none text-[10px] uppercase font-bold py-0.5">
                  Consignado
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground font-medium mb-3">
              {commitment.origin}
              {commitment.categoryName && ` • ${commitment.categoryName}`}
              {" • "}
              <span className="tabular-nums">{commitment.totalCount - commitment.remainingCount}/{commitment.totalCount}</span> parcelas
            </p>

            <div className="w-full bg-muted/60 rounded-full h-1.5 mb-4 overflow-hidden">
              <div 
                className="bg-primary h-full rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="flex gap-2 flex-wrap items-center">
              <Button 
                variant="default" 
                size="sm"
                className="rounded-xl h-9 text-xs shadow-md shadow-primary/20"
                onClick={() => handlePay(commitment)}
              >
                <DollarSign className="h-4 w-4 mr-1" />
                Pagar
              </Button>
              <Button 
                variant="secondary" 
                size="sm"
                className="rounded-xl h-9 text-xs"
                onClick={() => handleDetails(commitment)}
              >
                <Eye className="h-4 w-4 mr-1" />
                Detalhes
              </Button>
              {commitment.kind === "loan" && (
                <>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-xl h-9 w-9 p-0"
                        aria-label="Mais ações"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl">
                      <DropdownMenuItem onClick={() => handleEditLoan(commitment)} className="rounded-lg cursor-pointer">
                        <Pencil className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteLoan(commitment)}
                        className="rounded-lg cursor-pointer text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <div className="ml-auto">
                    <SniperButton loan={loans.find(l => l.id === commitment.originalId)} />
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="text-left sm:text-right shrink-0 bg-muted/30 sm:bg-transparent rounded-2xl p-3 sm:p-0">
            <p className="text-sm text-muted-foreground mb-1 uppercase tracking-wider text-[10px] font-bold">Resumo Financeiro</p>
            <p className="text-lg font-bold tabular-nums text-foreground">
              {formatCurrency(commitment.monthlyAmount)}
              <span className="text-xs text-muted-foreground font-normal"> /mês</span>
            </p>
            {commitment.nextDueDate && (
              <p className="text-xs text-muted-foreground flex items-center sm:justify-end gap-1 mt-1 font-medium">
                <Calendar className="h-3 w-3" />
                Vence {format(commitment.nextDueDate, "dd/MM", { locale: ptBR })}
              </p>
            )}
            <p className="text-xs text-muted-foreground/80 mt-1.5">
              Saldo: <span className="tabular-nums font-semibold">{formatCurrency(commitment.remainingAmount)}</span>
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-700">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">War Room</h1>
            <p className="text-muted-foreground">
              Quartel general para destruição de dívidas e gerenciamento de fluxo de caixa.
            </p>
          </div>
          <div className="hidden md:flex p-3 bg-card/30 backdrop-blur-md rounded-2xl border border-white/5">
            <TrendingDown className="h-8 w-8 text-primary" />
          </div>
        </div>

        {/* Global KPIs */}
        <div className="grid gap-4 md:grid-cols-4">
          {[
            { label: "Mês Atual", value: summary.thisMonthAmount, color: "text-foreground" },
            { label: "Próximo Mês", value: summary.nextMonthAmount, color: "text-muted-foreground" },
            { label: "Saldo Devedor Restante", value: summary.totalRemainingAmount, color: "text-destructive" },
            { label: "Dívidas Ativas", value: summary.totalActive, sub: `${summary.installmentsCount} cartões · ${summary.loansCount} empréstimos`, isNumber: true },
          ].map((card, idx) => (
            <div 
              key={card.label} 
              className="group rounded-3xl bg-card/40 backdrop-blur-xl border-none ring-1 ring-white/5 shadow-lg p-6 flex flex-col justify-between"
            >
              <p className="text-xs text-muted-foreground font-semibold tracking-wider uppercase mb-2">{card.label}</p>
              <p className={`text-3xl font-bold tabular-nums tracking-tight ${card.color || ""}`}>
                {card.isNumber ? card.value : formatCurrency(card.value as number)}
              </p>
              {card.sub && <p className="text-xs text-muted-foreground/70 mt-2 font-medium">{card.sub}</p>}
            </div>
          ))}
        </div>

        {/* War Room Layout (Tabs) */}
        <Tabs defaultValue="overview" className="w-full">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
            <TabsList className="bg-card/40 backdrop-blur-md border border-white/5 rounded-2xl h-auto p-1.5 w-full md:w-auto">
              <TabsTrigger value="overview" className="rounded-xl px-4 py-2 text-sm data-[state=active]:bg-primary/20 data-[state=active]:text-primary transition-all">
                <LineChartIcon className="h-4 w-4 mr-2" />
                Visão Geral
              </TabsTrigger>
              <TabsTrigger value="installments" className="rounded-xl px-4 py-2 text-sm data-[state=active]:bg-primary/20 data-[state=active]:text-primary transition-all">
                <CreditCard className="h-4 w-4 mr-2" />
                Parcelamentos
              </TabsTrigger>
              <TabsTrigger value="loans" className="rounded-xl px-4 py-2 text-sm data-[state=active]:bg-destructive/20 data-[state=active]:text-destructive transition-all">
                <Landmark className="h-4 w-4 mr-2" />
                Empréstimos
              </TabsTrigger>
            </TabsList>

            <Select value={sortBy} onValueChange={(v) => setSortBy(v as "date" | "amount")}>
              <SelectTrigger className="w-full md:w-[200px] rounded-xl bg-card/40 backdrop-blur-md border-none ring-1 ring-white/5 h-11">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-white/10 backdrop-blur-xl">
                <SelectItem value="date" className="rounded-lg">Prioridade (Vencimento)</SelectItem>
                <SelectItem value="amount" className="rounded-lg">Maior Impacto (Valor)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <TabsContent value="overview" className="space-y-6 mt-0 slide-in-from-bottom-2 animate-in duration-500">
            {/* Debt Burndown Chart */}
            <div className="rounded-3xl bg-card/40 backdrop-blur-xl border-none ring-1 ring-white/5 shadow-lg p-6 md:p-8">
              <div className="mb-6">
                <h3 className="text-xl font-bold">Evolução de Redução de Dívidas (Burndown)</h3>
                <p className="text-sm text-muted-foreground mt-1">Como seu saldo devedor diminuirá se você não contrair novas dívidas.</p>
              </div>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={burndownData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorDebt" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground)/0.2)" />
                    <XAxis 
                      dataKey="monthLabel" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    />
                    <Tooltip 
                      formatter={(value: number) => [formatCurrency(value), "Saldo Devedor"]}
                      contentStyle={{ 
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '16px',
                        color: '#fff',
                        boxShadow: '0 10px 40px -10px rgba(0,0,0,0.5)'
                      }}
                      itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="remainingDebt" 
                      stroke="hsl(var(--destructive))" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorDebt)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="rounded-3xl bg-card/40 backdrop-blur-xl border-none ring-1 ring-white/5 shadow-lg p-6">
                 <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><CreditCard className="w-5 h-5 text-primary"/> Top Parcelamentos</h3>
                 <div className="space-y-4">
                    {sortCommitments(installmentCommitments).slice(0, 3).map(c => (
                      <div key={c.id} className="flex justify-between items-center border-b border-white/5 pb-3 last:border-0 last:pb-0">
                        <div>
                          <p className="font-semibold text-sm">{c.title}</p>
                          <p className="text-xs text-muted-foreground">{c.totalCount - c.remainingCount}/{c.totalCount} parcelas</p>
                        </div>
                        <p className="font-bold tabular-nums text-sm">{formatCurrency(c.remainingAmount)}</p>
                      </div>
                    ))}
                 </div>
              </div>

               <div className="rounded-3xl bg-card/40 backdrop-blur-xl border-none ring-1 ring-white/5 shadow-lg p-6">
                 <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Landmark className="w-5 h-5 text-destructive"/> Alvos Sniper (Empréstimos)</h3>
                 <div className="space-y-4">
                    {sortCommitments(loanCommitments).slice(0, 3).map(c => (
                      <div key={c.id} className="flex justify-between items-center border-b border-white/5 pb-3 last:border-0 last:pb-0">
                        <div>
                          <p className="font-semibold text-sm">{c.title}</p>
                          <p className="text-xs text-muted-foreground tabular-nums">{formatCurrency(c.remainingAmount)}</p>
                        </div>
                         <SniperButton loan={loans.find(l => l.id === c.originalId)} />
                      </div>
                    ))}
                 </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="installments" className="mt-0 space-y-4 slide-in-from-bottom-2 animate-in duration-500">
            {installmentCommitments.length === 0 ? (
              <PremiumEmptyState 
                icon={TrendingDown} 
                title="Tudo sob controle" 
                subtitle="Nenhum parcelamento ativo no momento. Foco em investimentos!" 
              />
            ) : (
              sortCommitments(installmentCommitments).map((c) => (
                <CommitmentCard key={c.id} commitment={c} />
              ))
            )}
          </TabsContent>

          <TabsContent value="loans" className="mt-0 space-y-4 slide-in-from-bottom-2 animate-in duration-500">
            {loanCommitments.length === 0 ? (
              <PremiumEmptyState 
                icon={Landmark} 
                title="Livre de dívidas com juros" 
                subtitle="Nenhum empréstimo ativo. Excelente trabalho na sua gestão." 
              />
            ) : (
              sortCommitments(loanCommitments).map((c) => (
                <CommitmentCard key={c.id} commitment={c} />
              ))
            )}
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

        <EditLoanDialog
          open={editLoanDialogOpen}
          onOpenChange={setEditLoanDialogOpen}
          loan={getLoan(selectedCommitment) || null}
          banks={banks}
          categories={categories}
          onSave={handleSaveLoan}
        />

        <ConfirmDialog
          open={deleteLoanDialogOpen}
          onOpenChange={setDeleteLoanDialogOpen}
          title="Excluir empréstimo?"
          description={`Esta ação removerá "${selectedCommitment?.title}" e todas as parcelas associadas. Não pode ser desfeito.`}
          onConfirm={confirmDeleteLoan}
          confirmText="Excluir"
        />
      </main>
    </div>
  );
};

export default Compromissos;
