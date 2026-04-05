import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { MapPin } from "lucide-react";

interface SPSimulatorToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

export const SPSimulatorToggle = ({ enabled, onToggle }: SPSimulatorToggleProps) => {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-card/40 backdrop-blur-md border-none shadow-sm px-4 py-3">
      <MapPin className="h-4 w-4 text-purple-500 shrink-0" />
      <Label htmlFor="sp-simulator" className="text-sm font-medium cursor-pointer flex-1">
        Simular Saldo SP (R$ 6.800)
      </Label>
      <Switch
        id="sp-simulator"
        checked={enabled}
        onCheckedChange={onToggle}
      />
    </div>
  );
};
