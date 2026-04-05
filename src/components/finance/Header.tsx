import { Wallet } from "lucide-react";

export const Header = () => {
  return (
    <header className="border-b border-border bg-card shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary">
            <Wallet className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">FinanceApp</h1>
            <p className="text-xs text-muted-foreground">Controle Financeiro</p>
          </div>
        </div>
      </div>
    </header>
  );
};
