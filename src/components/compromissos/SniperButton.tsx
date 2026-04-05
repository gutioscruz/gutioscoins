import { useState } from "react";
import { Crosshair } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Loan } from "@/types/finance";

// Simula a lógica de AM (Amortization) / PV (Present Value) do FinanceJS
const calculateAmortizedPresentValue = (rate: number, nper: number, pmt: number) => {
  if (rate === 0) return nper * pmt;
  // PV = PMT * ((1 - (1 + r)^-n) / r)
  return pmt * ((1 - Math.pow(1 + rate, -nper)) / rate);
};

export const SniperButton = ({ loan }: { loan?: Loan }) => {
  const [open, setOpen] = useState(false);

  if (!loan) return null;

  const unpaidPayments = loan.payments?.filter(p => !p.paid) || [];
  if (unpaidPayments.length === 0) return null;

  // Saldo Devedor Atual (Linear)
  const pmt = unpaidPayments[0]?.amount || 0;
  const nper = unpaidPayments.length;
  // A taxa do empréstimo em %, convertida para decimal
  const r = loan.interestRate / 100;

  const linearBalance = nper * pmt;
  // Valor Presente (Amortizado) descontando os juros embutidos
  const presentValue = calculateAmortizedPresentValue(r, nper, pmt);
  const savings = Math.max(0, linearBalance - presentValue);

  if (savings <= 0) return null;

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl h-8 w-8 p-0 border-transparent bg-transparent hover:bg-emerald-500/10 text-emerald-500/70 hover:text-emerald-400 hover:ring-2 ring-emerald-500/50 transition-all duration-300 dark:bg-zinc-900"
              onClick={() => setOpen(true)}
            >
              <Crosshair className="h-4 w-4" />
              <span className="sr-only">Simular Antecipação</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent className="bg-zinc-900 border-emerald-500/30 text-emerald-400">
            <p>Simular Antecipação</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md bg-zinc-950 border-emerald-500/20 shadow-2xl shadow-emerald-500/10">
          <DialogHeader>
            <DialogTitle className="text-zinc-300 text-center">Modo Sniper Ativado</DialogTitle>
            <DialogDescription className="text-zinc-500 text-center">
              Análise de Valor Presente (Amortizado) contra Saldo Linear.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-6 space-y-6">
            <p className="text-zinc-400 text-sm uppercase tracking-widest font-semibold flex items-center gap-2">
              <Crosshair className="h-4 w-4" /> Alvo Fixado
            </p>
            <div className="text-emerald-400 text-4xl font-bold animate-pulse drop-shadow-[0_0_15px_rgba(52,211,153,0.5)] text-center w-full">
              Economia Imediata:<br/>
              <span className="text-5xl mt-2 block">
                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(savings)}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 w-full mt-6 pt-6 border-t border-zinc-800/50">
              <div className="flex flex-col items-center p-3 rounded-2xl bg-zinc-900/50">
                <span className="text-zinc-500 text-xs mb-1">Saldo Linear (Futuro)</span>
                <span className="text-zinc-300 font-medium">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(linearBalance)}
                </span>
              </div>
              <div className="flex flex-col items-center p-3 rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-500/20">
                <span className="text-emerald-500/70 text-xs mb-1">Valor Amortizado (Hoje)</span>
                <span className="text-emerald-400 font-medium">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(presentValue)}
                </span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
