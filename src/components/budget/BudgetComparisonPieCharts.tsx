import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { BudgetAreaAllocation } from "@/types/finance";

interface BudgetComparisonPieChartsProps {
  allocations: BudgetAreaAllocation[];
  salary: number;
}

export const BudgetComparisonPieCharts = ({
  allocations,
  salary,
}: BudgetComparisonPieChartsProps) => {
  const plannedData = useMemo(() => {
    return allocations
      .filter(a => a.plannedAmount > 0)
      .map(a => ({
        name: a.area.name,
        value: a.plannedAmount,
        color: a.area.color,
      }));
  }, [allocations]);

  const actualData = useMemo(() => {
    return allocations
      .filter(a => a.actualAmount > 0)
      .map(a => ({
        name: a.area.name,
        value: a.actualAmount,
        color: a.area.color,
      }));
  }, [allocations]);

  const totalPlanned = plannedData.reduce((sum, d) => sum + d.value, 0);
  const totalActual = actualData.reduce((sum, d) => sum + d.value, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-popover border rounded-lg shadow-lg p-3">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            {formatCurrency(data.value)}
          </p>
        </div>
      );
    }
    return null;
  };

  const renderCenterLabel = (total: number, label: string) => (
    <text
      x="50%"
      y="50%"
      textAnchor="middle"
      dominantBaseline="central"
      className="fill-foreground"
    >
      <tspan x="50%" dy="-0.5em" className="text-sm font-medium">
        {label}
      </tspan>
      <tspan x="50%" dy="1.5em" className="text-lg font-bold">
        {formatCurrency(total)}
      </tspan>
    </text>
  );

  if (plannedData.length === 0 && actualData.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comparativo Visual</CardTitle>
        <CardDescription>
          Distribuição do orçamento planejado vs gastos realizados
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Planned Chart */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-center text-muted-foreground">
              Orçado
            </h4>
            <div className="h-[250px]">
              {plannedData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={plannedData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {plannedData.map((entry, index) => (
                        <Cell key={`planned-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    {renderCenterLabel(totalPlanned, "Total")}
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Nenhum valor orçado
                </div>
              )}
            </div>
          </div>

          {/* Actual Chart */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-center text-muted-foreground">
              Realizado
            </h4>
            <div className="h-[250px]">
              {actualData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={actualData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {actualData.map((entry, index) => (
                        <Cell key={`actual-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    {renderCenterLabel(totalActual, "Total")}
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Nenhum gasto realizado
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Unified Legend */}
        <div className="flex flex-wrap justify-center gap-4 mt-4 pt-4 border-t">
          {allocations
            .filter(a => a.plannedAmount > 0 || a.actualAmount > 0)
            .map((allocation) => (
              <div key={allocation.area.id} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: allocation.area.color }}
                />
                <span className="text-sm">{allocation.area.name}</span>
              </div>
            ))}
        </div>

        {/* Summary comparison */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Orçado</p>
            <p className="text-lg font-bold">{formatCurrency(totalPlanned)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Realizado</p>
            <p className="text-lg font-bold">{formatCurrency(totalActual)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Diferença</p>
            <p className={`text-lg font-bold ${totalActual > totalPlanned ? 'text-destructive' : 'text-income'}`}>
              {totalActual > totalPlanned ? '+' : ''}{formatCurrency(totalActual - totalPlanned)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
