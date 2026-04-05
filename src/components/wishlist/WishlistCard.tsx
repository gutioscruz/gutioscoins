import { ExternalLink, Pencil, Trash2, ShoppingCart, Calendar, TrendingUp, Star } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WishlistItem } from "@/hooks/useWishlist";
import { useWishlistProjection } from "@/hooks/useWishlistProjection";
import { useFinance } from "@/contexts/FinanceContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface WishlistCardProps {
  item: WishlistItem;
  onEdit: (item: WishlistItem) => void;
  onDelete: (id: string) => void;
  onMarkPurchased: (id: string) => void;
}

const priorityLabels = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
};

const priorityColors = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400",
  high: "bg-red-500/20 text-red-600 dark:text-red-400",
};

export const WishlistCard = ({ item, onEdit, onDelete, onMarkPurchased }: WishlistCardProps) => {
  const { categories } = useFinance();
  const projection = useWishlistProjection(item);
  
  const category = categories.find(c => c.id === item.categoryId);
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <Card className="relative overflow-hidden">
      {item.priority === 'high' && (
        <div className="absolute top-0 right-0 w-0 h-0 border-t-[40px] border-t-red-500 border-l-[40px] border-l-transparent">
          <Star className="absolute -top-9 right-1 h-4 w-4 text-white" />
        </div>
      )}
      
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-lg truncate">{item.name}</h3>
              <Badge className={priorityColors[item.priority]} variant="secondary">
                {priorityLabels[item.priority]}
              </Badge>
            </div>
            {category && (
              <p className="text-sm text-muted-foreground mt-1">
                {category.name}
                {item.subcategory && ` > ${item.subcategory}`}
              </p>
            )}
          </div>
          <div className="flex gap-1 shrink-0">
            {item.url && (
              <Button variant="ghost" size="icon" asChild>
                <a href={item.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => onEdit(item)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-destructive"
              onClick={() => onDelete(item.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-3xl font-bold text-primary">
              {formatCurrency(item.price)}
            </p>
            {item.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {item.description}
              </p>
            )}
          </div>
        </div>

        {/* Projection Section */}
        <div className="bg-muted/50 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span>Projeção Financeira</span>
          </div>
          
          {projection.canBuyNow ? (
            <p className="text-sm text-income font-medium">
              ✓ Você pode comprar este item agora!
            </p>
          ) : projection.monthsToSave > 0 ? (
            <div className="space-y-1">
              <p className="text-sm">
                Pode comprar em{" "}
                <span className="font-medium text-primary">
                  {format(projection.suggestedDate, "MMMM 'de' yyyy", { locale: ptBR })}
                </span>
              </p>
              <p className="text-xs text-muted-foreground">
                Economizando {formatCurrency(projection.monthlySavingsNeeded)}/mês por {projection.monthsToSave} {projection.monthsToSave === 1 ? 'mês' : 'meses'}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Configure seu salário em Orçamento para ver projeções
            </p>
          )}

          {projection.tips.length > 1 && (
            <p className="text-xs text-muted-foreground italic">
              💡 {projection.tips[1]}
            </p>
          )}
        </div>

        {item.targetDate && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Meta: {format(item.targetDate, "dd/MM/yyyy")}</span>
          </div>
        )}

        <Button 
          onClick={() => onMarkPurchased(item.id)} 
          className="w-full gap-2"
          variant="outline"
        >
          <ShoppingCart className="h-4 w-4" />
          Comprei!
        </Button>
      </CardContent>
    </Card>
  );
};
