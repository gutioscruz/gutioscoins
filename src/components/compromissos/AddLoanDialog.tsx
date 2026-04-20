import { useState } from "react";
import { Plus, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bank, Category } from "@/types/finance";

interface AddLoanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  banks: Bank[];
  categories: Category[];
  onAdd: (loan: any) => void;
  isLoading?: boolean;
}

const LOAN_TYPES = [
  { value: "pessoal", label: "Pessoal" },
  { value: "consignado", label: "Consignado" },
  { value: "consignado_clt", label: "Consignado CLT" },
  { value: "fatura_parcelada", label: "Fatura Parcelada" },
];

const FREQUENCY_OPTIONS = [
  { value: "monthly", label: "Mensal" },
  { value: "biweekly", label: "Quinzenal" },
  { value: "weekly", label: "Semanal" },
];

export const AddLoanDialog = ({
  open,
  onOpenChange,
  banks,
  categories,
  onAdd,
  isLoading = false,
}: AddLoanDialogProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [principal, setPrincipal] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [installments, setInstallments] = useState("");
  const [frequency, setFrequency] = useState("monthly");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [bankId, setBankId] = useState("none");
  const [categoryId, setCategoryId] = useState("none");
  const [subcategory, setSubcategory] = useState("none");
  const [loanType, setLoanType] = useState("pessoal");

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const subcategories = selectedCategory?.subcategories || [];

  const resetForm = () => {
    setName("");
    setDescription("");
    setPrincipal("");
    setInterestRate("");
    setInstallments("");
    setFrequency("monthly");
    setStartDate(new Date().toISOString().split("T")[0]);
    setBankId("none");
    setCategoryId("none");
    setSubcategory("none");
    setLoanType("pessoal");
  };

  const canSubmit =
    name.trim() &&
    Number(principal) > 0 &&
    Number(interestRate) >= 0 &&
    Number(installments) > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onAdd({
      name: name.trim(),
      description: description.trim() || undefined,
      principal: Number(principal),
      interestRate: Number(interestRate),
      installments: Number(installments),
      paymentFrequency: frequency as "monthly" | "biweekly" | "weekly",
      startDate: new Date(startDate + "T00:00:00.000Z"),
      status: "active" as const,
      bankId: bankId === "none" ? undefined : bankId,
      categoryId: categoryId === "none" ? undefined : categoryId,
      subcategory: subcategory === "none" ? undefined : subcategory,
      loanType,
    });
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto rounded-3xl bg-card/95 backdrop-blur-xl border-white/10">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-primary" />
            Novo Empréstimo
          </DialogTitle>
          <DialogDescription>
            Cadastre um novo empréstimo. O sistema calculará a Tabela Price automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="loan-name">Nome *</Label>
            <Input
              id="loan-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Empréstimo CEF"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="loan-desc">Descrição</Label>
            <Textarea
              id="loan-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalhes opcionais"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Valor Principal (R$) *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={principal}
                onChange={(e) => setPrincipal(e.target.value)}
                placeholder="10000.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Taxa de Juros (% a.m.) *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                placeholder="1.5"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Nº de Parcelas *</Label>
              <Input
                type="number"
                min="1"
                step="1"
                value={installments}
                onChange={(e) => setInstallments(e.target.value)}
                placeholder="24"
              />
            </div>
            <div className="space-y-2">
              <Label>Frequência</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCY_OPTIONS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Data Início *</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={loanType} onValueChange={setLoanType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOAN_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Banco vinculado</Label>
            <Select value={bankId} onValueChange={setBankId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um banco" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {banks.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: b.color }} />
                      {b.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select
                value={categoryId}
                onValueChange={(v) => {
                  setCategoryId(v);
                  setSubcategory("none");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {categories
                    .filter((c) => c.type === "expense")
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Subcategoria</Label>
              <Select
                value={subcategory}
                onValueChange={setSubcategory}
                disabled={subcategories.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Subcategoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {subcategories.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Preview */}
          {canSubmit && (
            <div className="p-4 rounded-2xl bg-muted/40 border border-white/5 space-y-1">
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Prévia</p>
              <p className="text-sm">
                <span className="text-muted-foreground">Parcela estimada: </span>
                <span className="font-bold tabular-nums">
                  {(() => {
                    const r = (Number(interestRate) / 100);
                    const n = Number(installments);
                    const p = Number(principal);
                    if (r === 0) return `R$ ${(p / n).toFixed(2)}`;
                    const pmt = p * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
                    return `R$ ${pmt.toFixed(2)}`;
                  })()}
                </span>
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Total com juros: </span>
                <span className="font-bold tabular-nums">
                  {(() => {
                    const r = (Number(interestRate) / 100);
                    const n = Number(installments);
                    const p = Number(principal);
                    if (r === 0) return `R$ ${p.toFixed(2)}`;
                    const pmt = p * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
                    return `R$ ${(pmt * n).toFixed(2)}`;
                  })()}
                </span>
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || isLoading} className="rounded-xl">
            <Plus className="h-4 w-4 mr-1" />
            {isLoading ? "Criando..." : "Criar Empréstimo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};