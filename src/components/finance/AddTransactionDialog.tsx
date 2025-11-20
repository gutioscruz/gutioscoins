import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

interface AddTransactionDialogProps {
  onAddTransaction: (transaction: Omit<Transaction, "id">) => void;
  categories: Category[];
  banks: Bank[];
}

export const AddTransactionDialog = ({ onAddTransaction, categories, banks }: AddTransactionDialogProps) => {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<TransactionType>("expense");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [bankId, setBankId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const filteredCategories = categories.filter(c => c.type === type);
  const selectedCategory = categories.find(c => c.id === categoryId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!description || !amount || !categoryId || !bankId) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    try {
      // Parse and validate the amount
      const numericAmount = parseFloat(amount);
      if (isNaN(numericAmount)) {
        toast.error("Valor inválido");
        return;
      }

      // Validate the transaction data
      const validated = transactionSchema.parse({
        description,
        amount: numericAmount,
        type,
        categoryId,
        subcategory: subcategory || undefined,
        bankId,
        date: new Date(date),
      });

      const transaction: Omit<Transaction, "id"> = {
        description: validated.description,
        amount: validated.amount,
        type: validated.type,
        categoryId: validated.categoryId,
        subcategory: validated.subcategory,
        bankId: validated.bankId,
        date: validated.date,
      };

      onAddTransaction(transaction);
      
      toast.success(
        type === "income" ? "Receita adicionada com sucesso!" : "Despesa adicionada com sucesso!"
      );

      // Reset form
      setDescription("");
      setAmount("");
      setCategoryId("");
      setSubcategory("");
      setBankId("");
      setDate(new Date().toISOString().split("T")[0]);
      setOpen(false);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("Erro ao adicionar transação");
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Nova Transação
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Adicionar Transação</DialogTitle>
          <DialogDescription>
            Registre uma nova receita ou despesa no seu controle financeiro.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="type">Tipo</Label>
            <Select value={type} onValueChange={(value: TransactionType) => {
              setType(value);
              setCategoryId("");
              setSubcategory("");
            }}>
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income">Receita</SelectItem>
                <SelectItem value="expense">Despesa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              placeholder="Ex: Salário, Supermercado..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Valor</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Categoria</Label>
            <Select value={categoryId} onValueChange={(value) => {
              setCategoryId(value);
              setSubcategory("");
            }}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Selecione uma categoria" />
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
              <Label htmlFor="subcategory">Subcategoria (Opcional)</Label>
              <Select value={subcategory} onValueChange={setSubcategory}>
                <SelectTrigger id="subcategory">
                  <SelectValue placeholder="Selecione uma subcategoria" />
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

          <div className="space-y-2">
            <Label htmlFor="bank">Banco/Cartão</Label>
            <Select value={bankId} onValueChange={setBankId}>
              <SelectTrigger id="bank">
                <SelectValue placeholder="Selecione um banco" />
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
            <Label htmlFor="date">Data</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <Button type="submit" className="w-full">
            Adicionar Transação
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
