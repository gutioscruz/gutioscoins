import { useEffect, useState } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useNavigate } from "react-router-dom";
import { PlusCircle, MessageSquare, Target, LayoutDashboard, Landmark, CalendarDays } from "lucide-react";

export function GlobalCommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Digite um comando ou busque..." />
      <CommandList>
        <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
        <CommandGroup heading="Ações Rápidas">
          <CommandItem
            onSelect={() => {
              runCommand(() => {
                if (window.location.pathname !== "/") {
                  navigate("/?action=add_transaction");
                } else {
                  window.dispatchEvent(new CustomEvent('open-add-transaction'));
                }
              });
            }}
          >
            <PlusCircle className="mr-2 h-4 w-4 text-primary" />
            <span>Adicionar Despesa / Receita</span>
            <span className="ml-auto text-xs tracking-widest text-muted-foreground">⌘D</span>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              runCommand(() => window.dispatchEvent(new CustomEvent('open-alfred-chat')));
            }}
          >
            <MessageSquare className="mr-2 h-4 w-4 text-emerald-500" />
            <span>Falar com Consultor (Alfred)</span>
            <span className="ml-auto text-xs tracking-widest text-muted-foreground">⌘A</span>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              runCommand(() => navigate("/goals"));
            }}
          >
            <Target className="mr-2 h-4 w-4 text-purple-500" />
            <span>Ver Meta SP</span>
            <span className="ml-auto text-xs tracking-widest text-muted-foreground">⌘M</span>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Navegação">
          <CommandItem onSelect={() => runCommand(() => navigate("/dashboard"))}>
            <LayoutDashboard className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Ir para Dashboard</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/banks"))}>
            <Landmark className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Ir para Patrimônio</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/compromissos"))}>
            <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Ir para Compromissos</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
