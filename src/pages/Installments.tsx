import { useState, useMemo } from "react";
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
import { InstallmentsFilters } from "@/components/installments/InstallmentsFilters";
import { LoadingSpinner } from "@/components/LoadingSpinner";

export default function Installments() {
  const {
    installmentGroups,
    monthlyCommitments,
    categoryBreakdown,
    summary,
    isLoading,
    anticipateInstallment,
    anticipateMultipleInstallments,
    payOffInstallments,
    banks,
    categories,
    cards,
  } = useInstallments();

  const [selectedGroup, setSelectedGroup] = useState<InstallmentGroup | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [anticipateOpen, setAnticipateOpen] = useState(false);
  const [payOffOpen, setPayOffOpen] = useState(false);

  // Filter states
  const [selectedCardId, setSelectedCardId] = useState("all");
  const [selectedCategoryId, setSelectedCategoryId] = useState("all");
  const [sortBy, setSortBy] = useState("endDate");

  const hasActiveFilters = selectedCardId !== "all" || selectedCategoryId !== "all" || sortBy !== "endDate";

  const clearFilters = () => {
    setSelectedCardId("all");
    setSelectedCategoryId("all");
    setSortBy("endDate");
  };

  // Filter and sort installment groups
  const filteredGroups = useMemo(() => {
    let filtered = [...installmentGroups];

    // Apply card filter
    if (selectedCardId !== "all") {
      filtered = filtered.filter((g) => g.cardId === selectedCardId);
    }

    // Apply category filter
    if (selectedCategoryId !== "all") {
      filtered = filtered.filter((g) => g.categoryId === selectedCategoryId);
    }

    // Apply sorting
    switch (sortBy) {
      case "endDate":
        filtered.sort((a, b) => a.endDate.getTime() - b.endDate.getTime());
        break;
      case "amount":
        filtered.sort((a, b) => b.totalAmount - a.totalAmount);
        break;
      case "progress":
        filtered.sort((a, b) => (b.paidCount / b.totalCount) - (a.paidCount / a.totalCount));
        break;
      case "remaining":
        filtered.sort((a, b) => b.remainingAmount - a.remainingAmount);
        break;
    }

    return filtered;
  }, [installmentGroups, selectedCardId, selectedCategoryId, sortBy]);

  // Get unique cards and categories from installment groups for filter options
  const filterCards = useMemo(() => {
    const cardMap = new Map<string, string>();
    installmentGroups.forEach((g) => {
      if (g.cardId && g.cardName) {
        cardMap.set(g.cardId, g.cardName);
      }
    });
    return Array.from(cardMap.entries()).map(([id, name]) => ({ id, name }));
  }, [installmentGroups]);

  const filterCategories = useMemo(() => {
    const catMap = new Map<string, string>();
    installmentGroups.forEach((g) => {
      if (g.categoryId && g.categoryName) {
        catMap.set(g.categoryId, g.categoryName);
      }
    });
    return Array.from(catMap.entries()).map(([id, name]) => ({ id, name }));
  }, [installmentGroups]);

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

  const handleConfirmAnticipateMultiple = (
    installmentIds: string[],
    bankId: string,
    date: Date
  ) => {
    anticipateMultipleInstallments.mutate({ installmentIds, bankId, anticipationDate: date });
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
          {installmentGroups.length > 0 && (
            <InstallmentsFilters
              cards={filterCards}
              categories={filterCategories}
              selectedCardId={selectedCardId}
              selectedCategoryId={selectedCategoryId}
              sortBy={sortBy}
              onCardChange={setSelectedCardId}
              onCategoryChange={setSelectedCategoryId}
              onSortChange={setSortBy}
              onClearFilters={clearFilters}
              hasActiveFilters={hasActiveFilters}
            />
          )}
          <InstallmentsList
            groups={filteredGroups}
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
        banks={banks || []}
        onAnticipateMultiple={handleConfirmAnticipateMultiple}
        isAnticipating={anticipateMultipleInstallments.isPending}
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