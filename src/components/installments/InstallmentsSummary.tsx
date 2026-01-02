import { Card, CardContent } from "@/components/ui/card";
import { Layers, DollarSign, Clock, CheckCircle2 } from "lucide-react";

interface InstallmentsSummaryProps {
  activeCount: number;
  totalAmount: number;
  remainingAmount: number;
  paidAmount: number;
}

export function InstallmentsSummary({
  activeCount,
  totalAmount,
  remainingAmount,
  paidAmount,
}: InstallmentsSummaryProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);

  const cards = [
    {
      title: "Ativos",
      value: activeCount.toString(),
      subtitle: "parcelamentos",
      icon: Layers,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Total",
      value: formatCurrency(totalAmount),
      subtitle: "valor total",
      icon: DollarSign,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Restante",
      value: formatCurrency(remainingAmount),
      subtitle: "a pagar",
      icon: Clock,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
    {
      title: "Pago",
      value: formatCurrency(paidAmount),
      subtitle: "já quitado",
      icon: CheckCircle2,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${card.bgColor}`}>
                <card.icon className={`h-6 w-6 ${card.color}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{card.title}</p>
                <p className="text-2xl font-bold">{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.subtitle}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
