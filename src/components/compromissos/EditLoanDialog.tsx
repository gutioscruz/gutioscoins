import { useState, useEffect } from "react";
import { Landmark, Lock } from "lucide-react";
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
import { Loan, Bank, Category } from "@/types/finance";

interface EditLoanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loan: Loan | null;
  banks: Bank[];
  categories: Category[];
  onSave: (id: string, updates: Partial<Loan>) => void;
  isLoading?: boolean;
}

const LOAN_TYPES = [
  { value: "pessoal", label: "Pessoal" },
  { value: "consignado", label: "Consignado" },
  { value: "consignado_clt", label: "Consignado CLT" },
  { value: "fatura_parcelada", label: "Fatura Parcelada" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Ativo" },
  { value: "paid", label: "Quitado" },
  { value: "overdue", label: "Em atraso" },
];

export const EditLoanDialog = ({
  open,
  onOpenChange,
  loan,
  banks,
  categories,
  onSave,
  isLoading = false,
}: EditLoanDialogProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [bankId, setBankId] = useState<string>("none");
  const [categoryId, setCategoryId] = useState<string>("none");
  const [subcategory, setSubcategory] = useState<string>("none");
  const [loanType, setLoanType] = useState<string>("pessoal");
  const [status, setStatus] = useState<string>("active");

  useEffect(() => {
    if (loan && open) {
      setName(loan.name || "");
      setDescription(loan.description || "");
      setBankId(loan.bankId || "none");
      setCategoryId(loan.categoryId || "none");
      setSubcategory(loan.subcategory || "none");
      setLoanType(loan.loanType || "pessoal");
      setStatus(loan.status || "active");
    }
  }, [loan, open]);

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const subcategories = selectedCategory?.subcategories || [];

  const handleSubmit = () => {
    if (!loan) return;
    onSave(loan.id, {
      name: name.trim(),
      description: description.trim(),
      bankId: bankId === "none" ? undefined : bankId,
      categoryId: categoryId === "none" ? undefined : categoryId,
      subcategory: subcategory === "none" ? undefined : subcategory,
      loanType,
      status: status as Loan["status"],
    });
  };

  if (!loan) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] rounded-3xl bg-card/95 backdrop-blur-xl border-white/10">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-primary" />
            Editar Empréstimo
          </DialogTitle>
          <DialogDescription>
            Atualize os metadados. Campos financeiros (valor, taxa, parcelas) são bloqueados para preservar a Tabela Price.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Empréstimo CEF"
            />
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalhes adicionais (opcional)"
              rows={2}
            />
          </div>

          {/* Tipo + Status */}
          <div className="grid grid-cols-2 gap-3">
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
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Banco */}
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

          {/* Categoria + Subcategoria */}
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

          {/* Aviso de campos bloqueados */}
          <div className="flex items-start gap-3 p-3 rounded-2xl bg-muted/40 border border-white/5">
            <Lock className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <div className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Bloqueado:</strong> Valor (R$ {loan.principal.toLocaleString("pt-BR")}), taxa ({loan.interestRate}%), {loan.installments} parcelas, frequência. Alterar esses valores quebraria a Tabela Price já gerada.
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || isLoading} className="rounded-xl">
            {isLoading ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
