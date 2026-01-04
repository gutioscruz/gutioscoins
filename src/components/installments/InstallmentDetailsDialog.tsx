import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Clock, Calendar as CalendarIcon, FastForward } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { InstallmentGroup } from "@/hooks/useInstallments";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface InstallmentDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: InstallmentGroup | null;
  banks?: Array<{ id: string; name: string }>;
  onAnticipateMultiple?: (installmentIds: string[], bankId: string, date: Date) => void;
  isAnticipating?: boolean;
}

export function InstallmentDetailsDialog({
  open,
  onOpenChange,
  group,
  banks = [],
  onAnticipateMultiple,
  isAnticipating = false,
}: InstallmentDetailsDialogProps) {
  const [selectedInstallments, setSelectedInstallments] = useState<Set<string>>(new Set());
  const [anticipateMode, setAnticipateMode] = useState(false);
  const [selectedBankId, setSelectedBankId] = useState<string>("");
  const [anticipationDate, setAnticipationDate] = useState<Date>(new Date());

  if (!group) return null;

  const sortedInstallments = [...group.installments].sort(
    (a, b) => a.installmentNumber - b.installmentNumber
  );

  const pendingInstallments = sortedInstallments.filter((i) => !i.isPaid);
  const selectedTotal = Array.from(selectedInstallments).reduce((sum, id) => {
    const inst = sortedInstallments.find((i) => i.id === id);
    return sum + (inst?.amount || 0);
  }, 0);

  const toggleInstallment = (id: string) => {
    const newSet = new Set(selectedInstallments);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedInstallments(newSet);
  };

  const selectAllPending = () => {
    setSelectedInstallments(new Set(pendingInstallments.map((i) => i.id)));
  };

  const clearSelection = () => {
    setSelectedInstallments(new Set());
  };

  const handleAnticipate = () => {
    if (!selectedBankId || selectedInstallments.size === 0 || !onAnticipateMultiple) return;
    onAnticipateMultiple(Array.from(selectedInstallments), selectedBankId, anticipationDate);
    setAnticipateMode(false);
    setSelectedInstallments(new Set());
    setSelectedBankId("");
    onOpenChange(false);
  };

  const resetAndClose = (isOpen: boolean) => {
    if (!isOpen) {
      setAnticipateMode(false);
      setSelectedInstallments(new Set());
      setSelectedBankId("");
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{group.description}</DialogTitle>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="secondary">{group.cardName || group.bankName}</Badge>
            <Badge variant="outline">{group.categoryName}</Badge>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="text-center p-3 bg-muted rounded-lg">
            <p className="text-2xl font-bold">{group.totalCount}</p>
            <p className="text-xs text-muted-foreground">Total de Parcelas</p>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <p className="text-2xl font-bold">{formatCurrency(group.totalAmount)}</p>
            <p className="text-xs text-muted-foreground">Valor Total</p>
          </div>
        </div>

        {anticipateMode && onAnticipateMultiple ? (
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Antecipar em lote</span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={selectAllPending}>
                  Selecionar todas
                </Button>
                <Button variant="ghost" size="sm" onClick={clearSelection}>
                  Limpar
                </Button>
              </div>
            </div>

            <ScrollArea className="h-[200px] pr-4">
              <div className="space-y-2">
                {pendingInstallments.map((installment) => (
                  <div
                    key={installment.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                      selectedInstallments.has(installment.id)
                        ? "bg-primary/10 border-primary"
                        : "bg-muted/50 hover:bg-muted"
                    )}
                    onClick={() => toggleInstallment(installment.id)}
                  >
                    <Checkbox
                      checked={selectedInstallments.has(installment.id)}
                      onCheckedChange={() => toggleInstallment(installment.id)}
                    />
                    <div className="flex-1">
                      <p className="font-medium text-sm">
                        Parcela {installment.installmentNumber}/{group.totalCount}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(installment.date, "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                    <p className="font-semibold text-sm">{formatCurrency(installment.amount)}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {selectedInstallments.size > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="text-sm">
                    {selectedInstallments.size} parcela(s) selecionada(s)
                  </span>
                  <span className="font-bold">{formatCurrency(selectedTotal)}</span>
                </div>

                <Select value={selectedBankId} onValueChange={setSelectedBankId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a conta para débito" />
                  </SelectTrigger>
                  <SelectContent>
                    {banks.map((bank) => (
                      <SelectItem key={bank.id} value={bank.id}>
                        {bank.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(anticipationDate, "PPP", { locale: ptBR })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={anticipationDate}
                      onSelect={(date) => date && setAnticipationDate(date)}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setAnticipateMode(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    className="flex-1"
                    disabled={!selectedBankId || isAnticipating}
                    onClick={handleAnticipate}
                  >
                    {isAnticipating ? "Antecipando..." : "Confirmar"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-2">
                {sortedInstallments.map((installment) => (
                  <div
                    key={installment.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      installment.isPaid
                        ? "bg-green-500/10 border-green-500/20"
                        : "bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {installment.isPaid ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <Clock className="h-5 w-5 text-muted-foreground" />
                      )}
                      <div>
                        <p className="font-medium">
                          Parcela {installment.installmentNumber}/{group.totalCount}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <CalendarIcon className="h-3 w-3" />
                          {format(installment.date, "dd/MM/yyyy", { locale: ptBR })}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(installment.amount)}</p>
                      <Badge variant={installment.isPaid ? "default" : "secondary"} className="text-xs">
                        {installment.isPaid ? "Pago" : "Pendente"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {pendingInstallments.length > 1 && onAnticipateMultiple && (
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => setAnticipateMode(true)}
              >
                <FastForward className="h-4 w-4 mr-2" />
                Antecipar Múltiplas Parcelas
              </Button>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}