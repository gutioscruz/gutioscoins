import { Bank } from "@/types/finance";

interface BankFilterChipsProps {
  banks: Bank[];
  selectedBank: string;
  onBankChange: (bankId: string) => void;
}

export const BankFilterChips = ({
  banks,
  selectedBank,
  onBankChange,
}: BankFilterChipsProps) => {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
      <button
        onClick={() => onBankChange("")}
        className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition-all ${
          selectedBank === ""
            ? "bg-foreground text-background"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Todos
      </button>
      {banks.map((bank) => (
        <button
          key={bank.id}
          onClick={() => onBankChange(bank.id)}
          className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5 ${
            selectedBank === bank.id
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: bank.color }}
          />
          {bank.name}
        </button>
      ))}
    </div>
  );
};
