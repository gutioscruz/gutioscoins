import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Layers } from "lucide-react";
import { useInstallments, InstallmentGroup } from "@/hooks/useInstallments";
import { InstallmentsSummary } from "@/components/installments/InstallmentsSummary";
import { InstallmentsList } from "@/components/installments/InstallmentsList";
import { InstallmentDetailsDialog } from "@/components/installments/InstallmentDetailsDialog";
import { CategoryPieChart } from "@/components/installments/CategoryPieChart";
import { MonthlyCommitmentChart } from "@/components/installments/MonthlyCommitmentChart";
import { AnticipateDialog } from "@/components/installments/AnticipateDialog";
import { PayOffDialog } from "@/components/installments/PayOffDialog";
import { FutureCommitmentCard } from "@/components/installments/FutureCommitmentCard";
import { EndProjectionCard } from "@/components/installments/EndProjectionCard";
import { CategoryComparisonCard } from "@/components/installments/CategoryComparisonCard";
import { LoadingSpinner } from "@/components/LoadingSpinner";

export default function Installments() {
  const {
    installmentGroups,
    monthlyCommitments,
    categoryBreakdown,
    summary,
    isLoading,
    anticipateInstallment,
    payOffInstallments,
    banks,
  } = useInstallments();

  const [selectedGroup, setSelectedGroup] = useState<InstallmentGroup | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [anticipateOpen, setAnticipateOpen] = useState(false);
  const [payOffOpen, setPayOffOpen] = useState(false);

  const handleViewDetails = (group: InstallmentGroup) => {
    setSelectedGroup(group);
    setDetailsOpen(true);
  };

  const handleAnticipate = (group: InstallmentGroup) => {
    setSelectedGroup(group);
    setAnticipateOpen(true);
  };

  const handlePayOff = (group: InstallmentGroup) => {
    setSelectedGroup(group);
    setPayOffOpen(true);
  };

  const handleConfirmAnticipate = (
    installmentId: string,
    bankId: string,
    date: Date
  ) => {
    anticipateInstallment.mutate({ installmentId, bankId, anticipationDate: date });
  };

  const handleConfirmPayOff = (groupId: string, bankId: string, date: Date) => {
    payOffInstallments.mutate({ groupId, bankId, paymentDate: date });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Layers className="h-8 w-8" />
          Parcelamentos
        </h1>
        <p className="text-muted-foreground mt-1">
          Gerencie suas compras parceladas e antecipe pagamentos
        </p>
      </div>

      <InstallmentsSummary
        activeCount={summary.activeCount}
        totalAmount={summary.totalAmount}
        remainingAmount={summary.remainingAmount}
        paidAmount={summary.paidAmount}
      />

      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">Lista</TabsTrigger>
          <TabsTrigger value="charts">Gráficos</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <InstallmentsList
            groups={installmentGroups}
            onViewDetails={handleViewDetails}
            onAnticipate={handleAnticipate}
            onPayOff={handlePayOff}
          />
        </TabsContent>

        <TabsContent value="charts" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <CategoryPieChart data={categoryBreakdown} />
            <MonthlyCommitmentChart data={monthlyCommitments} />
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <FutureCommitmentCard data={monthlyCommitments} />
            <EndProjectionCard groups={installmentGroups} />
            <CategoryComparisonCard data={categoryBreakdown} />
          </div>
        </TabsContent>
      </Tabs>

      <InstallmentDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        group={selectedGroup}
      />

      <AnticipateDialog
        open={anticipateOpen}
        onOpenChange={setAnticipateOpen}
        group={selectedGroup}
        banks={banks || []}
        onConfirm={handleConfirmAnticipate}
        isLoading={anticipateInstallment.isPending}
      />

      <PayOffDialog
        open={payOffOpen}
        onOpenChange={setPayOffOpen}
        group={selectedGroup}
        banks={banks || []}
        onConfirm={handleConfirmPayOff}
        isLoading={payOffInstallments.isPending}
      />
    </div>
  );
}
