import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { InstallmentGroup } from "@/hooks/useInstallments";

interface AnticipateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: InstallmentGroup | null;
  banks: Array<{ id: string; name: string }>;
  onConfirm: (installmentId: string, bankId: string, date: Date, createTransaction: boolean) => void;
  isLoading: boolean;
}

export function AnticipateDialog({
  open,
  onOpenChange,
  group,
  banks,
  onConfirm,
  isLoading,
}: AnticipateDialogProps) {
  const [selectedInstallment, setSelectedInstallment] = useState<string>("");
  const [selectedBank, setSelectedBank] = useState<string>("");
  const [date, setDate] = useState<Date>(new Date());
  const [createTransaction, setCreateTransaction] = useState(true);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);

  if (!group) return null;

  const pendingInstallments = group.installments.filter((i) => !i.isPaid);

  const handleConfirm = () => {
    if (selectedInstallment && (createTransaction ? selectedBank : true)) {
      onConfirm(selectedInstallment, createTransaction ? selectedBank : "", date, createTransaction);
      onOpenChange(false);
      setSelectedInstallment("");
      setSelectedBank("");
      setDate(new Date());
      setCreateTransaction(true);
    }
  };

  const selectedInstallmentData = pendingInstallments.find(
    (i) => i.id === selectedInstallment
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Antecipar Parcela</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Parcelamento</Label>
            <p className="text-sm text-muted-foreground">{group.description}</p>
          </div>

          <div className="space-y-2">
            <Label>Parcela para Antecipar</Label>
            <Select value={selectedInstallment} onValueChange={setSelectedInstallment}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a parcela" />
              </SelectTrigger>
              <SelectContent>
                {pendingInstallments.map((installment) => (
                  <SelectItem key={installment.id} value={installment.id}>
                    Parcela {installment.installmentNumber}/{group.totalCount} -{" "}
                    {formatCurrency(installment.amount)} (
                    {format(installment.date, "dd/MM/yyyy")})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Create Transaction Checkbox */}
          <div className="flex items-center space-x-2 p-3 border rounded-lg">
            <Checkbox
              id="anticipateCreateTransaction"
              checked={createTransaction}
              onCheckedChange={(checked) => setCreateTransaction(checked === true)}
            />
            <div className="grid gap-1.5 leading-none">
              <label
                htmlFor="anticipateCreateTransaction"
                className="text-sm font-medium leading-none cursor-pointer"
              >
                Registrar transação financeira
              </label>
              <p className="text-xs text-muted-foreground">
                Desmarque se foi paga em outra fatura ou apenas quer marcar como antecipada.
              </p>
            </div>
          </div>

          {createTransaction && (
            <div className="space-y-2">
              <Label>Conta para Débito</Label>
              <Select value={selectedBank} onValueChange={setSelectedBank}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a conta" />
                </SelectTrigger>
                <SelectContent>
                  {banks?.map((bank) => (
                    <SelectItem key={bank.id} value={bank.id}>
                      {bank.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Data da Antecipação</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "dd/MM/yyyy", { locale: ptBR }) : "Selecione a data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  locale={ptBR}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {selectedInstallmentData && selectedBank && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-1">Resumo</p>
              <p className="text-sm text-muted-foreground">
                Valor a debitar:{" "}
                <span className="font-semibold text-foreground">
                  {formatCurrency(selectedInstallmentData.amount)}
                </span>
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedInstallment || (createTransaction && !selectedBank) || isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar Antecipação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
