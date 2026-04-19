import { useState, useMemo } from "react";
import { Plus, Trash2, TableProperties } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Category, Bank, TransactionType } from "@/types/finance";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";

interface QuickEntryRow {
  id: string;
  date: string;
  type: TransactionType;
  description: string;
  amount: string;
  categoryId: string;
  bankId: string;
  cardId: string;
}

interface QuickEntryDialogProps {
  onBatchAdd: (transactions: Array<{
    description: string;
    amount: number;
    type: TransactionType;
    categoryId: string;
    bankId: string;
    cardId?: string;
    date: Date;
    isInstallment: boolean;
  }>) => Promise<void>;
  categories: Category[];
  banks: Bank[];
}

const createEmptyRow = (): QuickEntryRow => ({
  id: crypto.randomUUID(),
  date: new Date().toISOString().split("T")[0],
  type: "expense",
  description: "",
  amount: "",
  categoryId: "",
  bankId: "",
  cardId: "",
});

export const QuickEntryDialog = ({ onBatchAdd, categories, banks }: QuickEntryDialogProps) => {
  const isMobile = useIsMobile();
  const initialRowCount = isMobile ? 3 : 5;
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<QuickEntryRow[]>(() =>
    Array.from({ length: 5 }, createEmptyRow)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addRows = (count: number) => {
    setRows(prev => [...prev, ...Array.from({ length: count }, createEmptyRow)]);
  };

  const removeRow = (id: string) => {
    if (rows.length > 1) {
      setRows(prev => prev.filter(row => row.id !== id));
    }
  };

  const updateRow = (id: string, updates: Partial<QuickEntryRow>) => {
    setRows(prev => prev.map(row =>
      row.id === id ? { ...row, ...updates } : row
    ));
  };

  const getFilteredCategories = (type: TransactionType) => {
    return categories.filter(c => c.type === type);
  };

  const getCardsForBank = (bankId: string) => {
    const bank = banks.find(b => b.id === bankId);
    return bank?.cards ?? [];
  };

  const handleSubmit = async () => {
    const validRows = rows.filter(row =>
      row.description.trim() &&
      row.amount &&
      parseFloat(row.amount) > 0 &&
      row.categoryId &&
      row.bankId
    );

    if (validRows.length === 0) {
      toast.error("Preencha pelo menos uma linha completa");
      return;
    }

    setIsSubmitting(true);
    try {
      const transactions = validRows.map(row => ({
        description: row.description.trim(),
        amount: parseFloat(row.amount),
        type: row.type,
        categoryId: row.categoryId,
        bankId: row.bankId,
        cardId: row.type === "expense" && row.cardId ? row.cardId : undefined,
        date: new Date(row.date),
        isInstallment: false,
      }));

      await onBatchAdd(transactions);
      toast.success(`${validRows.length} transações adicionadas!`);
      setRows(Array.from({ length: initialRowCount }, createEmptyRow));
      setOpen(false);
    } catch (error) {
      toast.error("Erro ao adicionar transações");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setRows(Array.from({ length: initialRowCount }, createEmptyRow));
  };

  const filledCount = useMemo(
    () => rows.filter(r => r.description && r.amount && r.categoryId && r.bankId).length,
    [rows]
  );

  // ===== Mobile: stacked cards =====
  const renderMobileRow = (row: QuickEntryRow, index: number) => {
    const cards = getCardsForBank(row.bankId);
    const cardDisabled = row.type === "income" || !row.bankId || cards.length === 0;
    return (
      <div key={row.id} className="rounded-2xl bg-card/40 backdrop-blur-md border border-white/5 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Linha {index + 1}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => removeRow(row.id)}
            disabled={rows.length === 1}
          >
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Input
            type="date"
            value={row.date}
            onChange={(e) => updateRow(row.id, { date: e.target.value })}
            className="h-10 text-base"
          />
          <Select
            value={row.type}
            onValueChange={(value: TransactionType) => {
              updateRow(row.id, { type: value, categoryId: "", cardId: value === "income" ? "" : row.cardId });
            }}
          >
            <SelectTrigger className="h-10 text-base"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="expense">Despesa</SelectItem>
              <SelectItem value="income">Receita</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Input
          placeholder="Descrição..."
          value={row.description}
          onChange={(e) => updateRow(row.id, { description: e.target.value })}
          className="h-10 text-base"
        />

        <div className="grid grid-cols-2 gap-2">
          <Input
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            value={row.amount}
            onChange={(e) => updateRow(row.id, { amount: e.target.value.replace(",", ".") })}
            className="h-10 text-base"
          />
          <Select
            value={row.categoryId}
            onValueChange={(value) => updateRow(row.id, { categoryId: value })}
          >
            <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              {getFilteredCategories(row.type).map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Select
            value={row.bankId}
            onValueChange={(value) => updateRow(row.id, { bankId: value, cardId: "" })}
          >
            <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="Banco" /></SelectTrigger>
            <SelectContent>
              {banks.map((bank) => (
                <SelectItem key={bank.id} value={bank.id}>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: bank.color }} />
                    {bank.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={row.cardId}
            onValueChange={(value) => updateRow(row.id, { cardId: value })}
            disabled={cardDisabled}
          >
            <SelectTrigger className="h-10 text-sm">
              <SelectValue placeholder={cardDisabled ? "Sem cartão" : "Cartão (opc.)"} />
            </SelectTrigger>
            <SelectContent>
              {cards.map((card) => (
                <SelectItem key={card.id} value={card.id}>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: card.color }} />
                    {card.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  };

  // ===== Desktop: grid table =====
  const renderDesktopRow = (row: QuickEntryRow) => {
    const cards = getCardsForBank(row.bankId);
    const cardDisabled = row.type === "income" || !row.bankId || cards.length === 0;
    return (
      <div
        key={row.id}
        className="grid grid-cols-[90px_80px_1fr_90px_130px_130px_130px_36px] gap-2 items-center"
      >
        <Input
          type="date"
          value={row.date}
          onChange={(e) => updateRow(row.id, { date: e.target.value })}
          className="h-9 text-xs"
        />
        <Select
          value={row.type}
          onValueChange={(value: TransactionType) => {
            updateRow(row.id, { type: value, categoryId: "", cardId: value === "income" ? "" : row.cardId });
          }}
        >
          <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="expense">Despesa</SelectItem>
            <SelectItem value="income">Receita</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="Descrição..."
          value={row.description}
          onChange={(e) => updateRow(row.id, { description: e.target.value })}
          className="h-9 text-sm"
        />
        <Input
          type="number"
          step="0.01"
          placeholder="0,00"
          value={row.amount}
          onChange={(e) => updateRow(row.id, { amount: e.target.value })}
          className="h-9 text-sm"
        />
        <Select
          value={row.categoryId}
          onValueChange={(value) => updateRow(row.id, { categoryId: value })}
        >
          <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            {getFilteredCategories(row.type).map((cat) => (
              <SelectItem key={cat.id} value={cat.id} className="text-xs">{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={row.bankId}
          onValueChange={(value) => updateRow(row.id, { bankId: value, cardId: "" })}
        >
          <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Banco" /></SelectTrigger>
          <SelectContent>
            {banks.map((bank) => (
              <SelectItem key={bank.id} value={bank.id} className="text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: bank.color }} />
                  {bank.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={row.cardId}
          onValueChange={(value) => updateRow(row.id, { cardId: value })}
          disabled={cardDisabled}
        >
          <SelectTrigger className="h-9 text-xs">
            <SelectValue placeholder={cardDisabled ? "—" : "Cartão"} />
          </SelectTrigger>
          <SelectContent>
            {cards.map((card) => (
              <SelectItem key={card.id} value={card.id} className="text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: card.color }} />
                  {card.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => removeRow(row.id)}
          disabled={rows.length === 1}
        >
          <Trash2 className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <TableProperties className="w-4 h-4" />
          <span className="hidden sm:inline">Entrada Rápida</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-5xl max-h-[95vh] sm:max-h-[90vh] p-4 sm:p-6 rounded-3xl flex flex-col">
        <DialogHeader>
          <DialogTitle>Entrada Rápida de Transações</DialogTitle>
          <DialogDescription>
            Adicione múltiplas transações de uma vez. Preencha as linhas desejadas.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[60vh] sm:max-h-[55vh]">
          <div className="space-y-2 pr-2 sm:pr-4">
            {!isMobile && (
              <div className="grid grid-cols-[90px_80px_1fr_90px_130px_130px_130px_36px] gap-2 px-2 text-xs font-medium text-muted-foreground sticky top-0 bg-background py-2 border-b z-10">
                <span>Data</span>
                <span>Tipo</span>
                <span>Descrição</span>
                <span>Valor</span>
                <span>Categoria</span>
                <span>Banco</span>
                <span>Cartão</span>
                <span></span>
              </div>
            )}

            {isMobile
              ? <div className="space-y-3">{rows.map((row, i) => renderMobileRow(row, i))}</div>
              : rows.map((row) => renderDesktopRow(row))
            }
          </div>
        </ScrollArea>

        <div className="flex items-center gap-2 pt-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => addRows(isMobile ? 3 : 5)}>
            <Plus className="h-4 w-4 mr-1" />
            +{isMobile ? 3 : 5} Linhas
          </Button>
          <span className="text-xs text-muted-foreground flex-1">
            {filledCount} de {rows.length} preenchidas
          </span>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full sm:w-auto">
            {isSubmitting ? "Salvando..." : "Salvar Transações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
