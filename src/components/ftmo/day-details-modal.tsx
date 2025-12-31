"use client";

import { useState, useEffect, useMemo } from "react";
import { Dialog } from "@headlessui/react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import clsx from "clsx";
import { useDisplayMode, formatValue } from "./display-mode-context";
import type { TradeRow, Withdrawal } from "./types";

// Calculer le profit net (profit brut + swap + commission)
function getNetProfit(trade: TradeRow): number {
  const profit = trade.profit ?? 0;
  const swap = trade.swap ?? 0;
  const commission = trade.commission ?? 0;
  return profit + swap + commission;
}

// Formater la durée en HH:MM:SS
const formatDuration = (seconds?: number) => {
  if (!seconds) return "-";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

// Formater l'heure de clôture
const formatCloseTime = (value?: string) => {
  if (!value) return "-";
  try {
    return format(new Date(value), "HH:mm:ss", { locale: fr });
  } catch {
    return value;
  }
};

interface DayDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date | null;
  accountId: string;
}

export function DayDetailsModal({
  isOpen,
  onClose,
  date,
  accountId,
}: DayDetailsModalProps) {
  const { mode, baseCapital } = useDisplayMode();
  const [trades, setTrades] = useState<TradeRow[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !date) return;

    const fetchDayTrades = async () => {
      setLoading(true);
      try {
        // Calculer le début et la fin du jour
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);

        const res = await fetch(
          `/api/ftmo/trades?accountId=${accountId}&userId=demo-user&status=closed&start=${dayStart.toISOString()}&end=${dayEnd.toISOString()}`,
        );
        if (!res.ok) {
          setTrades([]);
          return;
        }
        const data = await res.json();
        const dayTrades = (data.trades ?? []).filter((trade: TradeRow) => {
          if (!trade.closeTime) return false;
          const closeDate = new Date(trade.closeTime);
          return (
            closeDate >= dayStart &&
            closeDate <= dayEnd &&
            format(closeDate, "yyyy-MM-dd") === format(date, "yyyy-MM-dd")
          );
        });
        // Trier par heure de clôture (croissant)
        dayTrades.sort((a: TradeRow, b: TradeRow) => {
          const aTime = new Date(a.closeTime ?? "").getTime();
          const bTime = new Date(b.closeTime ?? "").getTime();
          return aTime - bTime;
        });
        setTrades(dayTrades);

        // Récupérer les retraits du jour
        const wdRes = await fetch(
          `/api/ftmo/withdrawals?accountId=${accountId}&userId=demo-user&start=${dayStart.toISOString()}&end=${dayEnd.toISOString()}`,
        );
        if (wdRes.ok) {
          const data = await wdRes.json();
          const dayWds = (data.withdrawals ?? []).filter((w: Withdrawal) => {
            const d = new Date(w.date);
            return d >= dayStart && d <= dayEnd;
          });
          setWithdrawals(dayWds);
        } else {
          setWithdrawals([]);
        }
      } catch (error) {
        console.error("Error fetching day trades:", error);
        setTrades([]);
        setWithdrawals([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDayTrades();
  }, [isOpen, date, accountId]);

  // Calculer les statistiques
  const stats = useMemo(() => {
    if (trades.length === 0) {
      return {
        totalPnl: 0,
        successRate: 0,
        profitFactor: 0,
        totalTrades: 0,
      };
    }

    const netProfits = trades.map(getNetProfit);
    const totalPnl = netProfits.reduce((acc, pnl) => acc + pnl, 0);
    const winningTrades = netProfits.filter((pnl) => pnl > 0);
    const losingTrades = netProfits.filter((pnl) => pnl < 0);
    const successRate = (winningTrades.length / trades.length) * 100;

    const totalProfits = winningTrades.reduce((acc, pnl) => acc + pnl, 0);
    const totalLosses = Math.abs(
      losingTrades.reduce((acc, pnl) => acc + pnl, 0),
    );
    const profitFactor =
      totalLosses === 0
        ? totalProfits > 0
          ? Infinity
          : 0
        : totalProfits / totalLosses;

    return {
      totalPnl,
      successRate,
      profitFactor,
      totalTrades: trades.length,
    };
  }, [trades]);

  const totalWithdrawals = useMemo(
    () =>
      withdrawals.reduce((acc, w) => acc + Math.abs(w.amount ?? 0), 0),
    [withdrawals],
  );

  const handleDeleteWithdrawal = async (w: Withdrawal) => {
    if (!w.id) return;
    
    // Demander confirmation avant de supprimer
    const confirmed = window.confirm(
      `Êtes-vous sûr de vouloir supprimer ce retrait de ${formatValue(
        -Math.abs(w.amount),
        mode,
        baseCapital,
        "EUR",
        true,
      )} ?`
    );
    
    if (!confirmed) return;
    
    setDeletingId(w.id);
    try {
      await fetch(
        `/api/ftmo/withdrawals?id=${w.id}&accountId=${accountId}&userId=demo-user`,
        { method: "DELETE" },
      );
      // refetch
      const dayStart = new Date(date!);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date!);
      dayEnd.setHours(23, 59, 59, 999);
      const wdRes = await fetch(
        `/api/ftmo/withdrawals?accountId=${accountId}&userId=demo-user&start=${dayStart.toISOString()}&end=${dayEnd.toISOString()}`,
      );
      if (wdRes.ok) {
        const data = await wdRes.json();
        const dayWds = (data.withdrawals ?? []).filter((wd: Withdrawal) => {
          const d = new Date(wd.date);
          return d >= dayStart && d <= dayEnd;
        });
        setWithdrawals(dayWds);
      }
    } catch (e) {
      console.error("Delete withdrawal failed", e);
    } finally {
      setDeletingId(null);
    }
  };

  if (!date) return null;

  const formattedDate = format(date, "EEEE, dd/MM/yyyy", { locale: fr });
  const capitalizedDate =
    formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-2xl bg-white shadow-xl">
          {/* En-tête */}
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
            <Dialog.Title className="text-xl font-bold text-slate-900 break-words">
              {capitalizedDate}
            </Dialog.Title>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            >
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Contenu */}
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center p-12">
                <p className="text-slate-500">Chargement...</p>
              </div>
            ) : trades.length === 0 && withdrawals.length === 0 ? (
              <div className="flex items-center justify-center p-12">
                <p className="text-slate-500">Aucune donnée pour ce jour</p>
              </div>
            ) : (
              <>
                {/* Section statistiques */}
                <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      PnL
                    </div>
                    <div
                      className={clsx(
                        "mt-2 text-2xl font-bold",
                        stats.totalPnl >= 0 ? "text-green-600" : "text-red-600",
                      )}
                    >
                      {formatValue(stats.totalPnl, mode, baseCapital, "EUR", true)}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Taux de réussite
                    </div>
                    <div className="mt-2 text-2xl font-bold text-slate-900">
                      {stats.successRate.toFixed(2)}%
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Facteur de profit
                    </div>
                    <div className="mt-2 text-2xl font-bold text-slate-900">
                      {stats.profitFactor === Infinity
                        ? "∞"
                        : stats.profitFactor.toFixed(2)}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Nombre de trades
                    </div>
                    <div className="mt-2 text-2xl font-bold text-slate-900">
                      {stats.totalTrades}
                    </div>
                  </div>

                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
                    <div className="text-xs font-medium uppercase tracking-wide text-blue-600">
                      Retraits
                    </div>
                    <div className="mt-1 text-sm text-blue-700">
                      {withdrawals.length} retrait(s)
                    </div>
                    <div className="mt-1 text-xl font-bold text-blue-700">
                      {formatValue(
                        -Math.abs(totalWithdrawals),
                        mode,
                        baseCapital,
                        "EUR",
                        true,
                      )}
                    </div>
                  </div>
                </div>

                {/* Section retraits (si présents) */}
                {withdrawals.length > 0 && (
                  <div className="mb-6 rounded-xl border border-blue-100 bg-blue-50 p-4 shadow-sm">
                    <h3 className="mb-3 text-sm font-semibold text-blue-800">
                      Retraits du jour
                    </h3>
                    <div className="space-y-2">
                      {withdrawals.map((w) => (
                        <div
                          key={w.id ?? `${w.date}-${w.amount}`}
                          className="flex items-start justify-between rounded-lg bg-white px-3 py-2 shadow-sm"
                        >
                          <div>
                            <div className="flex items-center gap-1 mb-1">
                              <span className="text-xs font-bold uppercase text-blue-800">
                                Retrait
                              </span>
                            </div>
                            <p className="text-sm font-semibold text-blue-800">
                              {w.type ?? "Récompense 80%"}
                            </p>
                            {w.type?.includes("80%") && (
                              <p className="text-xs text-green-600">
                                {formatValue(
                                  Math.abs(w.amount * 0.8),
                                  mode,
                                  baseCapital,
                                  "EUR",
                                  true,
                                )} reçu sur compte bancaire
                              </p>
                            )}
                            {w.note && (
                              <p className="text-xs text-slate-600">{w.note}</p>
                            )}
                            <p className="text-xs text-slate-500">
                              {format(new Date(w.date), "HH:mm", { locale: fr })}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <div className="text-sm font-semibold text-blue-700">
                                {formatValue(
                                  -Math.abs(w.amount),
                                  mode,
                                  baseCapital,
                                  "EUR",
                                  true,
                                )}
                              </div>
                              <div className="text-xs text-blue-600">
                                (100% retiré)
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteWithdrawal(w)}
                              disabled={deletingId === w.id}
                              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                              title="Supprimer le retrait"
                            >
                              {deletingId === w.id ? (
                                <span className="text-xs text-blue-500">...</span>
                              ) : (
                                <svg
                                  className="h-4 w-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                  />
                                </svg>
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tableau des trades */}
                {trades.length > 0 && (
                  <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                              <div className="break-words">Type</div>
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                              <div className="break-words">Heure de clôture</div>
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                              <div className="break-words">Symbole</div>
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                              <div className="break-words">Volume</div>
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                              <div className="break-words">Durée</div>
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                              <div className="break-words">PnL</div>
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                              <div className="break-words">Action</div>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {trades.map((trade) => {
                            const netProfit = getNetProfit(trade);
                            const isPositive = netProfit >= 0;
                            return (
                              <tr key={trade.ticket} className="hover:bg-slate-50">
                                <td className="px-4 py-3">
                                  <div className="break-words">
                                  {trade.type === "buy" ? (
                                    <div className="flex items-center gap-2">
                                      <svg
                                        className="h-4 w-4 text-green-600"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M5 10l7-7m0 0l7 7m-7-7v18"
                                        />
                                      </svg>
                                      <span className="text-sm font-medium text-slate-900">
                                        Buy
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2">
                                      <svg
                                        className="h-4 w-4 text-red-600"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M19 14l-7 7m0 0l-7-7m7 7V3"
                                        />
                                      </svg>
                                      <span className="text-sm font-medium text-slate-900">
                                        Sell
                                      </span>
                                    </div>
                                  )}
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-slate-700">
                                  <div className="break-words">{formatCloseTime(trade.closeTime)}</div>
                                </td>
                                <td className="px-4 py-3 text-slate-700">
                                  <div className="break-words">{trade.symbol}</div>
                                </td>
                                <td className="px-4 py-3 text-slate-700">
                                  <div className="break-words">{trade.volume.toFixed(2)}</div>
                                </td>
                                <td className="px-4 py-3 text-slate-700">
                                  <div className="break-words">{formatDuration(trade.durationSeconds)}</div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="break-words">
                                    <span
                                      className={clsx(
                                        "text-sm font-semibold",
                                        isPositive ? "text-green-600" : "text-red-600",
                                      )}
                                    >
                                      {formatValue(
                                        netProfit,
                                        mode,
                                        baseCapital,
                                        "EUR",
                                        true,
                                      )}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <button className="text-slate-400 hover:text-slate-600">
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
                                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                      />
                                    </svg>
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Bouton Fermer */}
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={onClose}
                    className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700"
                  >
                    Fermer
                  </button>
                </div>
              </>
            )}
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}

