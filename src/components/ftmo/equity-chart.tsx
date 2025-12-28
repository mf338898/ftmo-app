"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useDisplayMode, formatValue } from "./display-mode-context";
import type { EquityPoint, Account } from "./types";

const teal = "#14b8a6";
const tealLight = "#5eead4";
const red = "#ef4444";
const blue = "#3b82f6";

// currency function removed - using formatValue from context instead

const formatDate = (value: string) => {
  try {
    return format(new Date(value), "d MMM yyyy HH:mm", { locale: fr });
  } catch {
    return value;
  }
};

export function EquityChart({
  series,
  account,
}: {
  series: EquityPoint[];
  account: Account;
  refreshKey?: number;
}) {
  const { mode, baseCapital } = useDisplayMode();
  const currentEquity = series.length > 0 ? series[series.length - 1]?.equity : account.equity ?? 0;
  const currentBalance = account.balance ?? currentEquity;
  
  // Utiliser toujours 160 000 comme capital de base pour la ligne de référence
  const capitalBase = baseCapital; // 160 000
  
  // Convertir les données de la série en pourcentage si nécessaire
  const processedSeries = mode === "percentage"
    ? series.map((point) => ({
        ...point,
        equity: (point.equity / baseCapital) * 100,
      }))
    : series;

  // S'assurer que les données sont triées par date
  const sortedSeries = [...processedSeries].sort((a, b) => 
    new Date(a.time).getTime() - new Date(b.time).getTime()
  );
  
  // Filtrer les points invalides et s'assurer qu'on a au moins 2 points pour tracer une ligne
  const validSeries = sortedSeries.filter(p => p.time && !isNaN(new Date(p.time).getTime()));
  const data = validSeries.length >= 2
    ? validSeries
    : validSeries.length === 1
      ? [validSeries[0], { ...validSeries[0], time: new Date().toISOString() }]
      : [{ 
          time: new Date().toISOString(), 
          equity: mode === "percentage" ? (currentEquity / baseCapital) * 100 : currentEquity, 
          drawdownPct: 0 
        }];
  
  // Calculer les valeurs min/max pour l'axe Y
  const currentValue = mode === "percentage" 
    ? (currentEquity / baseCapital) * 100 
    : currentEquity;
  // La ligne de référence du capital de départ est toujours à 160 000 (ou 100% en mode pourcentage)
  const capitalBaseValue = mode === "percentage"
    ? 100 // 100% = 160 000
    : capitalBase; // 160 000

  const minValue = Math.min(...data.map((d) => d.equity), capitalBaseValue) * 0.95;
  const maxValue = Math.max(...data.map((d) => d.equity), currentValue) * 1.05;
  const step = (maxValue - minValue) / 13;
  const ticks = Array.from({ length: 14 }, (_, i) => minValue + step * i);

  const hasInitialDrawdown = data.length > 0 && data[0]?.equity < capitalBaseValue;
  
  // Formatter pour l'axe Y
  const yAxisFormatter = (v: number) => {
    if (mode === "percentage") {
      return `${v.toFixed(1)}%`;
    }
    return formatValue(v, "absolute", baseCapital, account.currency ?? "EUR");
  };

  return (
    <div className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="absolute left-6 top-6 z-10">
        <div className="rounded-lg bg-blue-500 px-3 py-2 text-sm font-semibold text-white shadow-sm">
          {formatValue(currentBalance, mode, baseCapital, account.currency)} Solde
        </div>
      </div>

      <div className="h-[500px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="time"
              tickFormatter={formatDate}
              tickLine={false}
              stroke="#64748b"
              fontSize={12}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              tickFormatter={yAxisFormatter}
              tickLine={false}
              stroke="#64748b"
              fontSize={12}
              domain={[minValue, maxValue]}
              ticks={ticks}
            />
            <Tooltip
              formatter={(value: number | undefined) => {
                if (mode === "percentage") {
                  return `${value !== undefined ? value.toFixed(2) : "0.00"}%`;
                }
                return formatValue(value, mode, baseCapital, account.currency ?? "EUR");
              }}
              labelFormatter={(label) => formatDate(String(label))}
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                padding: "8px 12px",
              }}
            />

            {/* Ligne de référence du capital de départ (160 000) */}
            <ReferenceLine
              y={capitalBaseValue}
              stroke="#1e293b"
              strokeDasharray="5 5"
              label={{
                value: mode === "percentage" ? "100% (160 000)" : "160 000 (Capital de départ)",
                position: "right",
                fill: "#1e293b",
                fontSize: 12,
                fontWeight: 500,
              }}
            />

            <ReferenceLine
              y={currentValue}
              stroke={blue}
              strokeDasharray="3 3"
              strokeOpacity={0.5}
            />

            {hasInitialDrawdown && data.length > 1 && (
              <Line
                type="monotone"
                dataKey="equity"
                data={data.slice(0, 2)}
                stroke={red}
                strokeWidth={2.5}
                dot={false}
                activeDot={false}
              />
            )}

            <Area
              type="monotone"
              dataKey="equity"
              fill={tealLight}
              fillOpacity={0.3}
              stroke="none"
            />

            <Line
              type="monotone"
              dataKey="equity"
              stroke={teal}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 6, fill: teal }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

