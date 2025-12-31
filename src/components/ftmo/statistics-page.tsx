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
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <div className="break-words">Date</div>
                </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <div className="break-words">Trades</div>
                </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <div className="break-words">Lots</div>
                </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <div className="break-words">Résultat</div>
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
                      <div className="break-words whitespace-nowrap">{day}/{month}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <div className="break-words">{row.trades}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <div className="break-words">{(row.lots ?? 0).toFixed(2)}</div>
                    </td>
                    <td
                      className={clsx(
                        "px-4 py-3 font-semibold",
                        isPositive ? "text-green-600" : "text-red-600",
                      )}
                    >
                      <div className="break-words">{formatValue(row.result, mode, baseCapital, "EUR", true)}</div>
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
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [periodFilter, setPeriodFilter] = useState<"7d" | "30d" | "90d" | "all">("all");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const tagQuery = selectedTag ? `&tag=${encodeURIComponent(selectedTag)}` : "";
        const periodQuery = periodFilter !== "all" ? `&period=${periodFilter}` : "";
        const res = await fetch(
          `/api/ftmo/statistics?accountId=${accountId}&userId=demo-user${tagQuery}${periodQuery}`,
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
  }, [accountId, refreshKey, selectedTag, periodFilter]);

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const res = await fetch(
          `/api/ftmo/tags?accountId=${accountId}&userId=demo-user`,
        );
        if (!res.ok) {
          setAvailableTags([]);
          return;
        }
        const data = await res.json();
        setAvailableTags(data.tags ?? []);
      } catch {
        setAvailableTags([]);
      }
    };
    fetchTags();
  }, [accountId, refreshKey]);


  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-slate-900">Statistiques</h2>
        <p className="mt-1 text-sm text-slate-600">
          Retraits exclus par défaut. Filtrez les résultats par tag si besoin.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-slate-700">Période :</span>
          <button
            onClick={() => setPeriodFilter("7d")}
            className={clsx(
              "rounded-full border px-3 py-1 text-sm",
              periodFilter === "7d"
                ? "border-blue-500 bg-blue-50 text-blue-700"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
            )}
          >
            7 jours
          </button>
          <button
            onClick={() => setPeriodFilter("30d")}
            className={clsx(
              "rounded-full border px-3 py-1 text-sm",
              periodFilter === "30d"
                ? "border-blue-500 bg-blue-50 text-blue-700"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
            )}
          >
            30 jours
          </button>
          <button
            onClick={() => setPeriodFilter("90d")}
            className={clsx(
              "rounded-full border px-3 py-1 text-sm",
              periodFilter === "90d"
                ? "border-blue-500 bg-blue-50 text-blue-700"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
            )}
          >
            90 jours
          </button>
          <button
            onClick={() => setPeriodFilter("all")}
            className={clsx(
              "rounded-full border px-3 py-1 text-sm",
              periodFilter === "all"
                ? "border-blue-500 bg-blue-50 text-blue-700"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
            )}
          >
            Depuis le début
          </button>
        </div>
        {availableTags.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-slate-700">Tags :</span>
            <button
              onClick={() => setSelectedTag(null)}
              className={clsx(
                "rounded-full border px-3 py-1 text-sm",
                selectedTag === null
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
              )}
            >
              Tous les tags
            </button>
            {availableTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={clsx(
                  "rounded-full border px-3 py-1 text-sm",
                  selectedTag === tag
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                )}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <p className="text-slate-500">Chargement...</p>
        </div>
      ) : !statistics ? (
        <div className="flex items-center justify-center p-12">
          <p className="text-slate-500">Aucune donnée disponible</p>
        </div>
      ) : (
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
              <KpiCard label="Lots" value={(statistics.totalLots ?? 0).toFixed(2)} />
              <KpiCard
                label="Ratio de Sharpe"
                value={(statistics.sharpeRatio ?? 0).toFixed(2)}
              />
              <KpiCard label="RRR moyen" value={(statistics.avgRrr ?? 0).toFixed(2)} />
              <KpiCard
                label="Valeur attendue"
                value={formatValue(statistics.expectedValue, mode, baseCapital, currencyCode)}
              />
              <KpiCard
                label="Facteur de profit"
                value={
                  statistics.profitFactor === Infinity
                    ? "∞"
                    : (statistics.profitFactor ?? 0).toFixed(2)
                }
              />
            </div>
          </div>

          <div>
            <DailySummaryTable data={dailySummary} />
          </div>
        </div>
      )}
    </div>
  );
}

