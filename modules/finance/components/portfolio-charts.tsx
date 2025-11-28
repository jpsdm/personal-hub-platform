"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ASSET_TYPE_COLORS,
  ASSET_TYPE_LABELS,
} from "@/modules/finance/lib/constants";
import { formatCurrency } from "@/modules/finance/lib/utils";
import type { InvestmentWithQuote } from "@/modules/finance/types";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface PortfolioChartsProps {
  investments: InvestmentWithQuote[];
}

export function PortfolioCharts({ investments }: PortfolioChartsProps) {
  if (investments.length === 0) {
    return null;
  }

  // Calculate allocation by asset type
  const allocationByType = investments.reduce((acc, inv) => {
    const type = inv.asset.type;
    if (!acc[type]) {
      acc[type] = {
        value: 0,
        label:
          ASSET_TYPE_LABELS[type as keyof typeof ASSET_TYPE_LABELS] || type,
      };
    }
    acc[type].value += inv.currentValue;
    return acc;
  }, {} as Record<string, { value: number; label: string }>);

  const typeChartData = Object.entries(allocationByType).map(
    ([type, data]) => ({
      name: data.label,
      value: data.value,
      type,
      color:
        ASSET_TYPE_COLORS[type as keyof typeof ASSET_TYPE_COLORS]?.solid ||
        "#6B7280",
    })
  );

  // Calculate allocation by individual asset
  const assetChartData = investments
    .sort((a, b) => b.currentValue - a.currentValue)
    .slice(0, 10)
    .map((inv, index) => ({
      name: inv.asset.symbol,
      value: inv.currentValue,
      color:
        ASSET_TYPE_COLORS[inv.asset.type as keyof typeof ASSET_TYPE_COLORS]
          ?.solid || "#6B7280",
    }));

  const totalValue = investments.reduce(
    (sum, inv) => sum + inv.currentValue,
    0
  );

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = ((data.value / totalValue) * 100).toFixed(1);
      return (
        <div className="bg-popover border rounded-lg shadow-lg p-3">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            {formatCurrency(data.value)} ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Allocation by Type */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Alocação por Tipo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typeChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {typeChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value) => (
                    <span className="text-xs text-muted-foreground">
                      {value}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Top Assets */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Maiores Posições</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={assetChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {assetChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      opacity={1 - index * 0.08}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value) => (
                    <span className="text-xs text-muted-foreground font-mono">
                      {value}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
