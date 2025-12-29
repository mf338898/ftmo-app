"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentProps,
} from "react";
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
const DEFAULT_ANALYTICS: AnalyticsData = {
  byHour: [],
  byType: { buy: 0, sell: 0 },
  byVolume: [],
  bySymbol: [],
};
const chartMargin = { top: 10, right: 10, left: 10, bottom: 10 };

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

type FiltersState = {
  type: string;
  volume: string;
  symbol: string;
};

function TradeFilters({
  filters,
  onChange,
  volumes,
  symbols,
}: {
  filters: FiltersState;
  onChange: (updater: (prev: FiltersState) => FiltersState) => void;
  volumes: number[];
  symbols: string[];
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-slate-700">Filtrer les Trades</span>
      <select
        value={filters.type}
        onChange={(e) => onChange((prev) => ({ ...prev, type: e.target.value }))}
        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
      >
        <option value="all">Type</option>
        <option value="buy">Buy</option>
        <option value="sell">Sell</option>
      </select>
      <select
        value={filters.volume}
        onChange={(e) => onChange((prev) => ({ ...prev, volume: e.target.value }))}
        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
      >
        <option value="all">Volume</option>
        {volumes.map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>
      <select
        value={filters.symbol}
        onChange={(e) => onChange((prev) => ({ ...prev, symbol: e.target.value }))}
        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
      >
        <option value="all">Symbole</option>
        {symbols.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </div>
  );
}

type BarChartCardProps = {
  title: string;
  data: Array<{ pnl: number; [key: string]: string | number }>;
  xKey: string;
  formatPnl: (value: number) => string;
  xAxisProps?: Partial<ComponentProps<typeof XAxis>>;
};

function BarChartCard({
  title,
  data,
  xKey,
  formatPnl,
  xAxisProps = {},
}: BarChartCardProps) {
  return (
    <ChartCard title={title}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={chartMargin}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey={xKey}
            tickLine={false}
            stroke="#64748b"
            fontSize={12}
            {...xAxisProps}
          />
          <YAxis
            tickFormatter={(v) => formatPnl(v as number)}
            tickLine={false}
            stroke="#64748b"
            fontSize={12}
          />
          <Tooltip
            formatter={(value: number | undefined) =>
              formatPnl(typeof value === "number" ? value : 0)
            }
            contentStyle={{
              backgroundColor: "white",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
            }}
          />
          <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={`${title}-${index}`}
                fill={entry.pnl >= 0 ? teal : red}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
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
  const [filters, setFilters] = useState<FiltersState>({
    type: "all",
    volume: "all",
    symbol: "all",
  });

  const formatPnl = useCallback(
    (value: number) => formatValue(value, mode, baseCapital, "EUR"),
    [baseCapital, mode],
  );

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/ftmo/analytics?accountId=${accountId}&userId=demo-user`,
      );
      if (!res.ok) {
        setAnalytics(DEFAULT_ANALYTICS);
        return;
      }
      const data = await res.json();
      setAnalytics(data.analytics ?? DEFAULT_ANALYTICS);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      setAnalytics(DEFAULT_ANALYTICS);
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    void fetchAnalytics();
  }, [fetchAnalytics, refreshKey]);

  const analyticsData = analytics ?? DEFAULT_ANALYTICS;

  const byHourData = useMemo(
    () =>
      analyticsData.byHour.map((item) => ({
        hour: `${item.hour}:00`,
        pnl: mode === "percentage" ? (item.pnl / baseCapital) * 100 : item.pnl,
      })),
    [analyticsData.byHour, baseCapital, mode],
  );

  const byTypeData = useMemo(
    () => [
      {
        type: "Sell",
        pnl:
          mode === "percentage"
            ? (analyticsData.byType.sell / baseCapital) * 100
            : analyticsData.byType.sell,
      },
      {
        type: "Buy",
        pnl:
          mode === "percentage"
            ? (analyticsData.byType.buy / baseCapital) * 100
            : analyticsData.byType.buy,
      },
    ],
    [analyticsData.byType, baseCapital, mode],
  );

  const byVolumeData = useMemo(
    () =>
      analyticsData.byVolume.map((item) => ({
        volume: item.volume.toString(),
        pnl: mode === "percentage" ? (item.pnl / baseCapital) * 100 : item.pnl,
      })),
    [analyticsData.byVolume, baseCapital, mode],
  );

  const bySymbolData = useMemo(
    () =>
      analyticsData.bySymbol.map((item) => ({
        symbol: item.symbol,
        pnl: mode === "percentage" ? (item.pnl / baseCapital) * 100 : item.pnl,
      })),
    [analyticsData.bySymbol, baseCapital, mode],
  );

  const volumes = useMemo(
    () => analyticsData.byVolume.map((v) => v.volume),
    [analyticsData.byVolume],
  );
  const symbols = useMemo(
    () => analyticsData.bySymbol.map((s) => s.symbol),
    [analyticsData.bySymbol],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-slate-500">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <TradeFilters
          filters={filters}
          onChange={setFilters}
          volumes={volumes}
          symbols={symbols}
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <BarChartCard
          title="Heure d'ouverture"
          data={byHourData}
          xKey="hour"
          formatPnl={formatPnl}
          xAxisProps={{
            angle: -45,
            textAnchor: "end",
            height: 60,
          }}
        />

        <BarChartCard
          title="Achat & Vente"
          data={byTypeData}
          xKey="type"
          formatPnl={formatPnl}
        />

        <BarChartCard
          title="Volume"
          data={byVolumeData}
          xKey="volume"
          formatPnl={formatPnl}
          xAxisProps={{
            angle: -45,
            textAnchor: "end",
            height: 60,
          }}
        />

        <BarChartCard
          title="Symbole"
          data={bySymbolData}
          xKey="symbol"
          formatPnl={formatPnl}
          xAxisProps={{
            angle: -45,
            textAnchor: "end",
            height: 60,
          }}
        />
      </div>
    </div>
  );
}

