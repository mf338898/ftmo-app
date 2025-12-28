"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { useDisplayMode, formatValue } from "./display-mode-context";
import type { StatisticsKpi, DailySummary } from "./types";

const percent = (value?: number) =>
  `${value !== undefined ? value.toFixed(2) : "0.00"}%`;

function KpiCard({
  label,
  value,
  valueColor,
  icon = true,
}: {
  label: string;
  value: string;
  valueColor?: "green" | "red" | "default";
  icon?: boolean;
}) {
  const colorClass =
    valueColor === "green"
      ? "text-green-600"
      : valueColor === "red"
        ? "text-red-600"
        : "text-slate-900";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-1.5">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {label}
        </p>
        {icon && (
          <div className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-100 text-[10px] text-slate-500">
            i
          </div>
        )}
      </div>
      <p className={clsx("mt-2 text-2xl font-bold", colorClass)}>{value}</p>
    </div>
  );
}

function DailySummaryTable({ data }: { data: DailySummary[] }) {
  const { mode, baseCapital } = useDisplayMode();
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <h3 className="text-lg font-bold text-slate-900">Résumé quotidien</h3>
          <div className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-100 text-[10px] text-slate-500">
            i
          </div>
        </div>
        <button className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50">
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        </button>
      </div>
      <div className="overflow-hidden rounded-lg border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                Trades
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                Lots
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                Résultat
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {data.map((row) => {
              const date = new Date(row.date);
              const day = date.getDate();
              const month = date.getMonth() + 1;
              const isPositive = row.result >= 0;
              return (
                <tr key={row.date} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-blue-600">
                    {day}/{month}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{row.trades}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {row.lots.toFixed(2)}
                  </td>
                  <td
                    className={clsx(
                      "px-4 py-3 font-semibold",
                      isPositive ? "text-green-600" : "text-red-600",
                    )}
                  >
                    {formatValue(row.result, mode, baseCapital, "EUR", true)}
                  </td>
                </tr>
              );
            })}
            {data.length === 0 && (
              <tr>
                <td
                  className="px-4 py-4 text-center text-slate-500"
                  colSpan={4}
                >
                  Aucune donnée disponible
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function StatisticsPage({
  accountId,
  currencyCode = "EUR",
  refreshKey = 0,
}: {
  accountId: string;
  currencyCode?: string;
  refreshKey?: number;
}) {
  const { mode, baseCapital } = useDisplayMode();
  const [statistics, setStatistics] = useState<StatisticsKpi | null>(null);
  const [dailySummary, setDailySummary] = useState<DailySummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(
          `/api/ftmo/statistics?accountId=${accountId}&userId=demo-user`,
        );
        if (!res.ok) {
          setStatistics(null);
          setDailySummary([]);
          return;
        }
        const data = await res.json();
        setStatistics(data.statistics);
        setDailySummary(data.dailySummary ?? []);
      } catch (error) {
        console.error("Error fetching statistics:", error);
        setStatistics(null);
        setDailySummary([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [accountId, refreshKey]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-slate-500">Chargement...</p>
      </div>
    );
  }

  if (!statistics) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-slate-500">Aucune donnée disponible</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-slate-900">Statistiques</h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr,1fr]">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <KpiCard
              label="Equity"
              value={formatValue(statistics.equity, mode, baseCapital, currencyCode)}
            />
            <KpiCard
              label="Solde"
              value={formatValue(statistics.balance, mode, baseCapital, currencyCode)}
            />
            <KpiCard
              label="Taux de réussite"
              value={percent(statistics.successRate)}
              valueColor="green"
            />
            <KpiCard
              label="Profit moyen"
              value={formatValue(statistics.averageProfit, mode, baseCapital, currencyCode, true)}
              valueColor="green"
            />
            <KpiCard
              label="Perte moyenne"
              value={formatValue(statistics.averageLoss, mode, baseCapital, currencyCode, true)}
              valueColor="red"
            />
            <KpiCard label="Nombre de trades" value={statistics.totalTrades.toString()} />
            <KpiCard label="Lots" value={statistics.totalLots.toFixed(2)} />
            <KpiCard
              label="Ratio de Sharpe"
              value={statistics.sharpeRatio.toFixed(2)}
            />
            <KpiCard label="RRR moyen" value={statistics.avgRrr.toFixed(2)} />
            <KpiCard
              label="Valeur attendue"
              value={formatValue(statistics.expectedValue, mode, baseCapital, currencyCode)}
            />
            <KpiCard
              label="Facteur de profit"
              value={
                statistics.profitFactor === Infinity
                  ? "∞"
                  : statistics.profitFactor.toFixed(2)
              }
            />
          </div>
        </div>

        <div>
          <DailySummaryTable data={dailySummary} />
        </div>
      </div>
    </div>
  );
}

