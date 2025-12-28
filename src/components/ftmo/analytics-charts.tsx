"use client";

import { useState, useEffect } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useDisplayMode, formatValue } from "./display-mode-context";
import type { AnalyticsData } from "./types";

const teal = "#14b8a6";
const red = "#ef4444";

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-slate-900">{title}</h3>
      <div className="h-[300px] w-full">{children}</div>
    </div>
  );
}

export function AnalyticsCharts({
  accountId,
  refreshKey = 0,
}: {
  accountId: string;
  refreshKey?: number;
}) {
  const { mode, baseCapital } = useDisplayMode();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [volumeFilter, setVolumeFilter] = useState<string>("all");
  const [symbolFilter, setSymbolFilter] = useState<string>("all");

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await fetch(
          `/api/ftmo/analytics?accountId=${accountId}&userId=demo-user`,
        );
        if (!res.ok) {
          setAnalytics({
            byHour: [],
            byType: { buy: 0, sell: 0 },
            byVolume: [],
            bySymbol: [],
          });
          return;
        }
        const data = await res.json();
        setAnalytics(data.analytics ?? {
          byHour: [],
          byType: { buy: 0, sell: 0 },
          byVolume: [],
          bySymbol: [],
        });
      } catch (error) {
        console.error("Error fetching analytics:", error);
        setAnalytics({
          byHour: [],
          byType: { buy: 0, sell: 0 },
          byVolume: [],
          bySymbol: [],
        });
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [accountId, refreshKey]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-slate-500">Chargement...</p>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-slate-500">Aucune donnée disponible</p>
      </div>
    );
  }

  // Convertir les données en pourcentage si nécessaire
  const byHourData = analytics.byHour.map((item) => ({
    hour: `${item.hour}:00`,
    pnl: mode === "percentage" ? (item.pnl / baseCapital) * 100 : item.pnl,
  }));

  const byTypeData = [
    { 
      type: "Sell", 
      pnl: mode === "percentage" ? (analytics.byType.sell / baseCapital) * 100 : analytics.byType.sell,
    },
    { 
      type: "Buy", 
      pnl: mode === "percentage" ? (analytics.byType.buy / baseCapital) * 100 : analytics.byType.buy,
    },
  ];

  const byVolumeData = analytics.byVolume.map((item) => ({
    volume: item.volume.toString(),
    pnl: mode === "percentage" ? (item.pnl / baseCapital) * 100 : item.pnl,
  }));

  const bySymbolData = analytics.bySymbol.map((item) => ({
    symbol: item.symbol,
    pnl: mode === "percentage" ? (item.pnl / baseCapital) * 100 : item.pnl,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-700">Filtrer les Trades</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="all">Type</option>
            <option value="buy">Buy</option>
            <option value="sell">Sell</option>
          </select>
          <select
            value={volumeFilter}
            onChange={(e) => setVolumeFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="all">Volume</option>
            {analytics.byVolume.map((v) => (
              <option key={v.volume} value={v.volume}>
                {v.volume}
              </option>
            ))}
          </select>
          <select
            value={symbolFilter}
            onChange={(e) => setSymbolFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="all">Symbole</option>
            {analytics.bySymbol.map((s) => (
              <option key={s.symbol} value={s.symbol}>
                {s.symbol}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <ChartCard title="Heure d'ouverture">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byHourData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="hour"
                tickLine={false}
                stroke="#64748b"
                fontSize={12}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis
                tickFormatter={(v) => formatValue(v as number, mode, baseCapital, "EUR")}
                tickLine={false}
                stroke="#64748b"
                fontSize={12}
              />
              <Tooltip
                formatter={(value: number | undefined) => formatValue(value, mode, baseCapital, "EUR")}
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                {byHourData.map((entry, index) => (
                  <Cell key={`cell-hour-${index}`} fill={entry.pnl >= 0 ? teal : red} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Achat & Vente">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byTypeData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="type"
                tickLine={false}
                stroke="#64748b"
                fontSize={12}
              />
              <YAxis
                tickFormatter={(v) => formatValue(v as number, mode, baseCapital, "EUR")}
                tickLine={false}
                stroke="#64748b"
                fontSize={12}
              />
              <Tooltip
                formatter={(value: number | undefined) => formatValue(value, mode, baseCapital, "EUR")}
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                {byTypeData.map((entry, index) => (
                  <Cell key={`cell-type-${index}`} fill={entry.pnl >= 0 ? teal : red} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Volume">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byVolumeData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="volume"
                tickLine={false}
                stroke="#64748b"
                fontSize={12}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis
                tickFormatter={(v) => formatValue(v as number, mode, baseCapital, "EUR")}
                tickLine={false}
                stroke="#64748b"
                fontSize={12}
              />
              <Tooltip
                formatter={(value: number | undefined) => formatValue(value, mode, baseCapital, "EUR")}
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                {byVolumeData.map((entry, index) => (
                  <Cell key={`cell-volume-${index}`} fill={entry.pnl >= 0 ? teal : red} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Symbole">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bySymbolData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="symbol"
                tickLine={false}
                stroke="#64748b"
                fontSize={12}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis
                tickFormatter={(v) => formatValue(v as number, mode, baseCapital, "EUR")}
                tickLine={false}
                stroke="#64748b"
                fontSize={12}
              />
              <Tooltip
                formatter={(value: number | undefined) => formatValue(value, mode, baseCapital, "EUR")}
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                {bySymbolData.map((entry, index) => (
                  <Cell key={`cell-symbol-${index}`} fill={entry.pnl >= 0 ? teal : red} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

