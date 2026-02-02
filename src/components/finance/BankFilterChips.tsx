import { Button } from "@/components/ui/button";
import { Bank } from "@/types/finance";
import { cn } from "@/lib/utils";

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
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
      <Button
        variant={selectedBank === "" ? "default" : "outline"}
        size="sm"
        onClick={() => onBankChange("")}
        className="shrink-0 transition-all"
      >
        Todos
      </Button>
      {banks.map((bank) => (
        <Button
          key={bank.id}
          variant={selectedBank === bank.id ? "default" : "outline"}
          size="sm"
          onClick={() => onBankChange(bank.id)}
          className={cn(
            "shrink-0 transition-all",
            selectedBank !== bank.id && "hover:border-2"
          )}
          style={{
            borderColor: selectedBank !== bank.id ? bank.color : undefined,
          }}
        >
          <div
            className="w-2 h-2 rounded-full mr-1.5"
            style={{ backgroundColor: bank.color }}
          />
          {bank.name}
        </Button>
      ))}
    </div>
  );
};
