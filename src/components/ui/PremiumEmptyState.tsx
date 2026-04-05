import { LucideIcon } from "lucide-react";

interface PremiumEmptyStateProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
}

export function PremiumEmptyState({ icon: Icon, title, subtitle }: PremiumEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center animate-in fade-in zoom-in duration-500">
      <div className="mb-6 rounded-full bg-muted/20 p-6 ring-1 ring-white/5">
        <Icon className="h-12 w-12 text-muted-foreground/30" strokeWidth={1.5} />
      </div>
      <h3 className="text-xl font-medium tracking-tight text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto">{subtitle}</p>
    </div>
  );
}
