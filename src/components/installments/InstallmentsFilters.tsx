import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Filter, X } from "lucide-react";

interface InstallmentsFiltersProps {
  cards: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string }>;
  selectedCardId: string;
  selectedCategoryId: string;
  sortBy: string;
  onCardChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onSortChange: (value: string) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

export function InstallmentsFilters({
  cards,
  categories,
  selectedCardId,
  selectedCategoryId,
  sortBy,
  onCardChange,
  onCategoryChange,
  onSortChange,
  onClearFilters,
  hasActiveFilters,
}: InstallmentsFiltersProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" />
            <span>Filtros:</span>
          </div>

          <Select value={selectedCardId} onValueChange={onCardChange}>
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue placeholder="Todos os cartões" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os cartões</SelectItem>
              {cards.map((card) => (
                <SelectItem key={card.id} value={card.id}>
                  {card.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedCategoryId} onValueChange={onCategoryChange}>
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue placeholder="Todas categorias" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={onSortChange}>
            <SelectTrigger className="w-[180px] h-9">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="endDate">Término mais próximo</SelectItem>
              <SelectItem value="amount">Maior valor</SelectItem>
              <SelectItem value="progress">Maior progresso</SelectItem>
              <SelectItem value="remaining">Maior saldo restante</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="h-9 gap-1"
            >
              <X className="h-4 w-4" />
              Limpar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}