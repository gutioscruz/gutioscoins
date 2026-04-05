import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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

const IMPULSE_CATEGORY_KEYWORDS = ["compras", "lazer", "entretenimento", "shopping"];
const IMPULSE_THRESHOLD = 150;

function isImpulseCategory(categoryName?: string): boolean {
  if (!categoryName) return false;
  const lower = categoryName.toLowerCase();
  return IMPULSE_CATEGORY_KEYWORDS.some((kw) => lower.includes(kw));
}

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
  const [isInstallment, setIsInstallment] = useState(false);
  const [installmentCount, setInstallmentCount] = useState("");
  const [cardId, setCardId] = useState("");
  const [showImpulseAlert, setShowImpulseAlert] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Escutar evento customizado
    const handleOpen = () => setOpen(true);
    window.addEventListener('open-add-transaction', handleOpen);
    return () => window.removeEventListener('open-add-transaction', handleOpen);
  }, []);

  useEffect(() => {
    if (location.search.includes('action=add_transaction')) {
      setOpen(true);
      // Limpa a URL usando navegação silenciosa (replace)
      navigate(location.pathname, { replace: true });
    }
  }, [location, navigate]);

  const filteredCategories = categories.filter(c => c.type === type);
  const selectedCategory = categories.find(c => c.id === categoryId);
  const selectedBank = banks.find(b => b.id === bankId);
  const hasCards = selectedBank && selectedBank.cards && selectedBank.cards.length > 0;

  const buildTransaction = (): Omit<Transaction, "id"> | null => {
    if (!description || !amount || !categoryId || !bankId) {
      toast.error("Preencha todos os campos obrigatórios");
      return null;
    }

    try {
      const numericAmount = parseFloat(amount);
      if (isNaN(numericAmount)) {
        toast.error("Valor inválido");
        return null;
      }

      const numericInstallmentCount = isInstallment && installmentCount ? parseInt(installmentCount) : undefined;
      
      if (isInstallment && (!numericInstallmentCount || numericInstallmentCount < 2)) {
        toast.error("Parcelas devem ser no mínimo 2");
        return null;
      }

      const validated = transactionSchema.parse({
        description,
        amount: numericAmount,
        type,
        categoryId,
        subcategory: subcategory || undefined,
        bankId,
        date: new Date(date),
        isInstallment,
        installmentCount: numericInstallmentCount,
        installmentNumber: 1,
      });

      return {
        description: validated.description,
        amount: validated.amount,
        type: validated.type,
        categoryId: validated.categoryId,
        subcategory: validated.subcategory,
        bankId: validated.bankId,
        cardId: cardId || undefined,
        date: validated.date,
        isInstallment: validated.isInstallment,
        installmentCount: validated.installmentCount,
        installmentNumber: validated.installmentNumber,
        parentTransactionId: validated.parentTransactionId,
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("Erro ao adicionar transação");
      }
      return null;
    }
  };

  const doSubmit = () => {
    const transaction = buildTransaction();
    if (!transaction) return;

    onAddTransaction(transaction);
    
    const numericInstallmentCount = isInstallment && installmentCount ? parseInt(installmentCount) : undefined;
    const successMessage = isInstallment && numericInstallmentCount 
      ? `Compra parcelada em ${numericInstallmentCount}x adicionada! Todas as parcelas foram criadas.`
      : type === "income" 
        ? "Receita adicionada com sucesso!" 
        : "Despesa adicionada com sucesso!";
    
    toast.success(successMessage);
    resetForm();
  };

  const resetForm = () => {
    setDescription("");
    setAmount("");
    setCategoryId("");
    setSubcategory("");
    setBankId("");
    setDate(new Date().toISOString().split("T")[0]);
    setIsInstallment(false);
    setInstallmentCount("");
    setCardId("");
    setOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const numericAmount = parseFloat(amount);
    const catName = selectedCategory?.name;

    // Regra das 48h: impulse check
    if (
      type === "expense" &&
      !isNaN(numericAmount) &&
      numericAmount > IMPULSE_THRESHOLD &&
      isImpulseCategory(catName)
    ) {
      setShowImpulseAlert(true);
      return;
    }

    doSubmit();
  };

  const handleSendToWishlist = () => {
    toast.info("💡 Considere adicionar este item à Wishlist e aguardar 48h antes de comprar.");
    setShowImpulseAlert(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Nova Transação
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adicionar Transação</DialogTitle>
            <DialogDescription>
              Registre uma nova receita ou despesa no seu controle financeiro.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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
                <Label htmlFor="amount">Valor (R$)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <Select value={categoryId} onValueChange={(value) => {
                  setCategoryId(value);
                  setSubcategory("");
                }}>
                  <SelectTrigger id="category">
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
                  <Label htmlFor="subcategory">Subcategoria</Label>
                  <Select value={subcategory} onValueChange={setSubcategory}>
                    <SelectTrigger id="subcategory">
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

            <div className="space-y-2">
              <Label htmlFor="bank">Banco</Label>
              <Select value={bankId} onValueChange={(value) => {
                setBankId(value);
                setCardId("");
              }}>
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

            {hasCards && (
              <div className="space-y-2">
                <Label htmlFor="card">Cartão (Opcional)</Label>
                <Select value={cardId || "none"} onValueChange={(value) => setCardId(value === "none" ? "" : value)}>
                  <SelectTrigger id="card">
                    <SelectValue placeholder="Selecione um cartão ou deixe em branco" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum (usar conta do banco)</SelectItem>
                    {selectedBank?.cards?.filter(card => card.id).map((card) => (
                      <SelectItem key={card.id} value={card.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: card.color }}
                          />
                          {card.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentType">Tipo de Pagamento</Label>
              <Select 
                value={isInstallment ? "installment" : "single"} 
                onValueChange={(value) => {
                  setIsInstallment(value === "installment");
                  if (value === "single") {
                    setInstallmentCount("");
                  }
                }}
              >
                <SelectTrigger id="paymentType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">À vista</SelectItem>
                  <SelectItem value="installment">Parcelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isInstallment && (
              <div className="space-y-2">
                <Label htmlFor="installmentCount">Número de Parcelas</Label>
                <Input
                  id="installmentCount"
                  type="number"
                  min="2"
                  max="100"
                  placeholder="Ex: 12"
                  value={installmentCount}
                  onChange={(e) => setInstallmentCount(e.target.value)}
                />
                {installmentCount && amount && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm">
                      <span className="text-muted-foreground">Valor por parcela:</span>
                      <span className="font-medium text-foreground ml-2">
                        R$ {(parseFloat(amount) / parseInt(installmentCount)).toFixed(2)}
                      </span>
                    </p>
                  </div>
                )}
              </div>
            )}

            <Button type="submit" className="w-full">
              Adicionar Transação
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Regra das 48h — Impulse Alert */}
      <AlertDialog open={showImpulseAlert} onOpenChange={setShowImpulseAlert}>
        <AlertDialogContent className="rounded-3xl border-none bg-card/90 backdrop-blur-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg">⚠️ Regra das 48h</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Este gasto de <span className="font-bold text-foreground">R$ {parseFloat(amount || "0").toFixed(2)}</span> em{" "}
              <span className="font-bold text-foreground">{selectedCategory?.name}</span> impacta diretamente sua meta de SP.
              <br /><br />
              Deseja enviar para a Wishlist e aguardar 48h antes de decidir?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" onClick={handleSendToWishlist}>
              💭 Enviar para Wishlist
            </AlertDialogCancel>
            <AlertDialogAction className="rounded-xl" onClick={() => { setShowImpulseAlert(false); doSubmit(); }}>
              Registrar mesmo assim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
