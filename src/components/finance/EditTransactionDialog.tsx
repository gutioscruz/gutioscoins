import { useState, useEffect } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Transaction, TransactionType, Category, Bank } from "@/types/finance";
import { toast } from "sonner";
import { transactionSchema } from "@/lib/validations";
import { z } from "zod";
import { format } from "date-fns";

interface EditTransactionDialogProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateTransaction: (id: string, transaction: Partial<Transaction>) => void;
  categories: Category[];
  banks: Bank[];
}

export const EditTransactionDialog = ({ 
  transaction, 
  open, 
  onOpenChange, 
  onUpdateTransaction, 
  categories, 
  banks 
}: EditTransactionDialogProps) => {
  const [type, setType] = useState<TransactionType>("expense");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [bankId, setBankId] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    if (transaction) {
      setType(transaction.type);
      setDescription(transaction.description);
      // For installments, show the installment amount
      setAmount(transaction.amount.toString());
      setCategoryId(transaction.categoryId);
      setSubcategory(transaction.subcategory || "");
      setBankId(transaction.bankId);
      setDate(format(transaction.date, "yyyy-MM-dd"));
    }
  }, [transaction]);

  const filteredCategories = categories.filter(c => c.type === type);
  const selectedCategory = categories.find(c => c.id === categoryId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!transaction || !description || !amount || !categoryId || !bankId) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    try {
      const numericAmount = parseFloat(amount);
      if (isNaN(numericAmount)) {
        toast.error("Valor inválido");
        return;
      }

      // For installments, we need to update the total amount
      const actualAmount = numericAmount;

      const validated = transactionSchema.parse({
        description,
        amount: actualAmount,
        type,
        categoryId,
        subcategory: subcategory || undefined,
        bankId,
        date: new Date(date + "T00:00:00"),
        isInstallment: transaction.isInstallment,
        installmentCount: transaction.installmentCount,
        installmentNumber: transaction.installmentNumber,
      });

      onUpdateTransaction(transaction.id, {
        description: validated.description,
        amount: validated.amount,
        type: validated.type,
        categoryId: validated.categoryId,
        subcategory: validated.subcategory,
        bankId: validated.bankId,
        date: validated.date,
      });

      toast.success("Transação atualizada com sucesso!");
      onOpenChange(false);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("Erro ao atualizar transação");
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Editar Transação
          </DialogTitle>
          <DialogDescription>
            Faça alterações na transação selecionada.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-type">Tipo</Label>
              <Select value={type} onValueChange={(value: TransactionType) => {
                setType(value);
                setCategoryId("");
                setSubcategory("");
              }}>
                <SelectTrigger id="edit-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Receita</SelectItem>
                  <SelectItem value="expense">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-amount">Valor{transaction?.isInstallment && " (por parcela)"}</Label>
              <Input
                id="edit-amount"
                type="number"
                step="0.01"
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Descrição</Label>
            <Input
              id="edit-description"
              placeholder="Ex: Salário, Supermercado..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-category">Categoria</Label>
              <Select value={categoryId} onValueChange={(value) => {
                setCategoryId(value);
                setSubcategory("");
              }}>
                <SelectTrigger id="edit-category">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {filteredCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedCategory && selectedCategory.subcategories.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="edit-subcategory">Subcategoria</Label>
                <Select value={subcategory} onValueChange={setSubcategory}>
                  <SelectTrigger id="edit-subcategory">
                    <SelectValue placeholder="Opcional" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedCategory.subcategories.map((sub) => (
                      <SelectItem key={sub} value={sub}>
                        {sub}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-bank">Banco/Cartão</Label>
              <Select value={bankId} onValueChange={setBankId}>
                <SelectTrigger id="edit-bank">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {banks.map((bank) => (
                    <SelectItem key={bank.id} value={bank.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: bank.color }}
                        />
                        {bank.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-date">Data</Label>
              <Input
                id="edit-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          {transaction?.isInstallment && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Esta é uma compra parcelada ({transaction.installmentNumber}/{transaction.installmentCount}x).
                {transaction.installmentCount && amount && (
                  <> Valor total: <span className="font-medium text-foreground">
                    R$ {(parseFloat(amount) * transaction.installmentCount).toFixed(2)}
                  </span></>
                )}
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" className="flex-1">
              Salvar Alterações
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
