import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
import { CalendarIcon, Loader2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { InstallmentGroup } from "@/hooks/useInstallments";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PayOffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: InstallmentGroup | null;
  banks: Array<{ id: string; name: string }>;
  onConfirm: (groupId: string, bankId: string, date: Date) => void;
  isLoading: boolean;
}

export function PayOffDialog({
  open,
  onOpenChange,
  group,
  banks,
  onConfirm,
  isLoading,
}: PayOffDialogProps) {
  const [selectedBank, setSelectedBank] = useState<string>("");
  const [date, setDate] = useState<Date>(new Date());

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);

  if (!group) return null;

  const pendingCount = group.remainingCount;

  const handleConfirm = () => {
    if (selectedBank) {
      onConfirm(group.id, selectedBank, date);
      onOpenChange(false);
      setSelectedBank("");
      setDate(new Date());
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Quitar Parcelamento</DialogTitle>
          <DialogDescription>
            Pagar todas as parcelas restantes de uma vez
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Parcelamento</Label>
            <p className="font-medium">{group.description}</p>
            <p className="text-sm text-muted-foreground">
              {pendingCount} parcelas pendentes
            </p>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Esta ação irá quitar todas as {pendingCount} parcelas restantes no valor total
              de {formatCurrency(group.remainingAmount)}.
            </AlertDescription>
          </Alert>

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

          <div className="space-y-2">
            <Label>Data do Pagamento</Label>
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

          {selectedBank && (
            <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
              <p className="text-sm font-medium mb-2">Resumo da Quitação</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Parcelas a quitar:</span>
                  <span className="font-medium">{pendingCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor total:</span>
                  <span className="font-bold text-lg">
                    {formatCurrency(group.remainingAmount)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedBank || isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar Quitação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
