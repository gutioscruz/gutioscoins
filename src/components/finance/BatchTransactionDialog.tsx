import { useState, useRef } from "react";
import { Upload, Download, AlertCircle, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Category, Bank } from "@/types/finance";

interface BatchTransactionDialogProps {
  onBatchAdd: (transactions: BatchTransaction[], globalCardId?: string) => Promise<void>;
  categories: Category[];
  banks: Bank[];
}

export interface BatchTransaction {
  date: string;
  type: 'income' | 'expense';
  description: string;
  amount: number;
  categoryName: string;
  subcategory?: string;
  bankName: string;
}

interface ParsedRow {
  data: BatchTransaction;
  errors: string[];
  rowNumber: number;
}

export const BatchTransactionDialog = ({ onBatchAdd, categories, banks }: BatchTransactionDialogProps) => {
  const [open, setOpen] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedGlobalCardId, setSelectedGlobalCardId] = useState<string>("none");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const headers = "data,tipo,descricao,valor,categoria,subcategoria,banco";
    const example1 = "2024-01-15,despesa,Mercado Semanal,250.50,Alimentação,Supermercado,Nubank";
    const example2 = "2024-01-20,receita,Salário,5000,Salário,,Banco do Brasil";
    const csv = [headers, example1, example2].join("\n");
    
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "template_transacoes.csv";
    link.click();
  };

  const parseCSV = (content: string): ParsedRow[] => {
    const lines = content.trim().split("\n");
    if (lines.length < 2) return [];

    const results: ParsedRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split(",").map(v => v.trim());
      const errors: string[] = [];

      // Parse date
      const dateStr = values[0];
      if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        errors.push("Data inválida (use YYYY-MM-DD)");
      }

      // Parse type
      const typeStr = values[1]?.toLowerCase();
      if (typeStr !== "receita" && typeStr !== "despesa" && typeStr !== "income" && typeStr !== "expense") {
        errors.push("Tipo deve ser 'receita' ou 'despesa'");
      }
      const type = (typeStr === "receita" || typeStr === "income") ? "income" : "expense";

      // Parse description
      const description = values[2];
      if (!description) {
        errors.push("Descrição é obrigatória");
      }

      // Parse amount
      const amountStr = values[3]?.replace(",", ".");
      const amount = parseFloat(amountStr);
      if (isNaN(amount) || amount <= 0) {
        errors.push("Valor deve ser um número positivo");
      }

      // Parse category
      const categoryName = values[4];
      const category = categories.find(c => 
        c.name.toLowerCase() === categoryName?.toLowerCase() && 
        c.type === type
      );
      if (!category) {
        errors.push(`Categoria '${categoryName}' não encontrada para ${type === 'income' ? 'receitas' : 'despesas'}`);
      }

      // Parse subcategory
      const subcategory = values[5] || undefined;
      if (subcategory && category && !category.subcategories?.includes(subcategory)) {
        errors.push(`Subcategoria '${subcategory}' não existe em '${categoryName}'`);
      }

      // Parse bank
      const bankName = values[6];
      const bank = banks.find(b => b.name.toLowerCase() === bankName?.toLowerCase());
      if (!bank) {
        errors.push(`Banco '${bankName}' não encontrado`);
      }

      results.push({
        data: {
          date: dateStr,
          type,
          description: description || "",
          amount: amount || 0,
          categoryName: categoryName || "",
          subcategory,
          bankName: bankName || "",
        },
        errors,
        rowNumber: i + 1,
      });
    }

    return results;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const parsed = parseCSV(content);
      setParsedData(parsed);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    const validRows = parsedData.filter(row => row.errors.length === 0);
    if (validRows.length === 0) {
      toast.error("Nenhuma transação válida para importar");
      return;
    }

    setIsImporting(true);
    setProgress(0);

    try {
      const transactions = validRows.map(row => row.data);
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(p => Math.min(p + 10, 90));
      }, 100);

      await onBatchAdd(transactions, selectedGlobalCardId === "none" ? undefined : selectedGlobalCardId);
      
      clearInterval(progressInterval);
      setProgress(100);
      
      toast.success(`${validRows.length} transações importadas com sucesso!`);
      setOpen(false);
      setParsedData([]);
    } catch (error: any) {
      toast.error(`Erro na importação: ${error.message}`);
    } finally {
      setIsImporting(false);
      setProgress(0);
    }
  };

  const validCount = parsedData.filter(r => r.errors.length === 0).length;
  const errorCount = parsedData.filter(r => r.errors.length > 0).length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="h-4 w-4 mr-2" />
          Importar Lote
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar Transações em Lote</DialogTitle>
          <DialogDescription>
            Faça upload de um arquivo CSV com suas transações
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Global Card Selection */}
          <div className="space-y-2 p-3 bg-muted/40 rounded-lg border">
            <span className="text-sm font-medium">Conta/Cartão de Destino Global (Opcional)</span>
            <p className="text-xs text-muted-foreground pb-2">
              Se você está importando uma fatura inteira de cartão de crédito, selecione-o aqui para que todas as despesas sejam mapeadas para ele.
            </p>
            <select
              className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              value={selectedGlobalCardId}
              onChange={(e) => setSelectedGlobalCardId(e.target.value)}
            >
              <option value="none">Nenhum (usar definições do CSV)</option>
              {banks.flatMap(b => b.cards || []).map(card => (
                <option key={card.id} value={card.id}>
                  {card.name}
                </option>
              ))}
            </select>
          </div>

          {/* Template download */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <span className="text-sm">Baixe o template para preencher</span>
            <Button variant="ghost" size="sm" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Template CSV
            </Button>
          </div>

          {/* File upload */}
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              Selecionar Arquivo CSV
            </Button>
          </div>

          {/* Preview */}
          {parsedData.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{validCount} válidas</span>
                </div>
                {errorCount > 0 && (
                  <div className="flex items-center gap-1 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <span>{errorCount} com erros</span>
                  </div>
                )}
              </div>

              <ScrollArea className="h-[200px] border rounded-lg">
                <div className="p-3 space-y-2">
                  {parsedData.map((row, idx) => (
                    <div 
                      key={idx}
                      className={`p-2 rounded text-sm ${
                        row.errors.length > 0 ? 'bg-destructive/10' : 'bg-muted'
                      }`}
                    >
                      <div className="flex justify-between">
                        <span className="font-medium">
                          Linha {row.rowNumber}: {row.data.description}
                        </span>
                        <span className={row.data.type === 'income' ? 'text-income' : 'text-expense'}>
                          R$ {row.data.amount.toFixed(2)}
                        </span>
                      </div>
                      {row.errors.length > 0 && (
                        <div className="text-destructive text-xs mt-1">
                          {row.errors.join(", ")}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Progress */}
              {isImporting && (
                <Progress value={progress} className="h-2" />
              )}

              {/* Import button */}
              <Button 
                className="w-full" 
                onClick={handleImport}
                disabled={validCount === 0 || isImporting}
              >
                {isImporting ? "Importando..." : `Importar ${validCount} Transações`}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
