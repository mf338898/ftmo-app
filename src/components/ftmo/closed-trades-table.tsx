"use client";

import { useState, useEffect, useMemo } from "react";
import { useDisplayMode, formatValue } from "./display-mode-context";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import clsx from "clsx";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { TradeRow } from "./types";

const formatDuration = (seconds?: number) => {
  if (!seconds) return "-";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (days > 0) {
    return `${days}j ${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

const formatCloseTime = (value?: string) => {
  if (!value) return "-";
  try {
    return format(new Date(value), "d MMM yyyy, HH:mm:ss", { locale: fr });
  } catch {
    return value;
  }
};

function PnlPipsCell({ value, isPips = false }: { value: number; isPips?: boolean }) {
  const { mode, baseCapital } = useDisplayMode();
  const isPositive = value >= 0;
  const displayValue = isPips ? value.toFixed(1) : formatValue(value, mode, baseCapital, "EUR", true);
  return (
    <div
      className={clsx(
        "inline-block rounded-lg px-2.5 py-1 text-sm font-semibold",
        isPositive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700",
      )}
    >
      {isPositive ? "+" : ""}
      {displayValue}
    </div>
  );
}

export function ClosedTradesTable({
  accountId,
  refreshKey = 0,
}: {
  accountId: string;
  refreshKey?: number;
}) {
  const [trades, setTrades] = useState<TradeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([
    { id: "closeTime", desc: true },
  ]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  useEffect(() => {
    const fetchTrades = async () => {
      try {
        const res = await fetch(
          `/api/ftmo/trades?accountId=${accountId}&userId=demo-user&status=closed`,
        );
        if (!res.ok) {
          setTrades([]);
          return;
        }
        const data = await res.json();
        setTrades(data.trades ?? []);
      } catch (error) {
        console.error("Error fetching trades:", error);
        setTrades([]);
      } finally {
        setLoading(false);
      }
    };
    fetchTrades();
  }, [accountId, refreshKey]);

  const filteredTrades = useMemo(() => {
    let filtered = trades;
    if (typeFilter !== "all") {
      filtered = filtered.filter((t) => t.type === typeFilter);
    }
    if (globalFilter) {
      const search = globalFilter.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.ticket.toLowerCase().includes(search) ||
          t.symbol.toLowerCase().includes(search),
      );
    }
    return filtered;
  }, [trades, typeFilter, globalFilter]);

  const columns: ColumnDef<TradeRow>[] = useMemo(
    () => [
      {
        accessorKey: "ticket",
        header: () => (
          <div className="flex items-center gap-1">
            Type
            <button className="text-slate-400 hover:text-slate-600">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
            </button>
          </div>
        ),
        cell: ({ row }) => {
          const trade = row.original;
          const hasNotes = !!(trade.notes || trade.screenshotUrl);
          return (
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-900">{trade.ticket}</span>
              {hasNotes && (
                <svg
                  className="h-4 w-4 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                  />
                </svg>
              )}
              <div
                className={clsx(
                  "flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-semibold",
                  trade.type === "buy"
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700",
                )}
              >
                {trade.type === "buy" ? (
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M14.707 12.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 14.586V7a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
                {trade.type === "buy" ? "Buy" : "Sell"}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "closeTime",
        header: () => (
          <div className="flex items-center gap-1">
            Heure de clôture
            <button className="text-slate-400 hover:text-slate-600">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
            </button>
          </div>
        ),
        cell: ({ row }) => (
          <span className="text-sm text-slate-700">
            {formatCloseTime(row.original.closeTime)}
          </span>
        ),
      },
      {
        accessorKey: "volume",
        header: () => (
          <div className="flex items-center gap-1">
            Volume
            <button className="text-slate-400 hover:text-slate-600">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
            </button>
          </div>
        ),
        cell: ({ row }) => (
          <span className="text-sm text-slate-700">{row.original.volume}</span>
        ),
      },
      {
        accessorKey: "symbol",
        header: () => (
          <div className="flex items-center gap-1">
            Symbole
            <button className="text-slate-400 hover:text-slate-600">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
            </button>
          </div>
        ),
        cell: ({ row }) => (
          <span className="text-sm font-medium text-slate-900">{row.original.symbol}</span>
        ),
      },
      {
        accessorKey: "profit",
        header: "PnL",
        cell: ({ row }) => (
          <PnlPipsCell value={row.original.profit ?? 0} />
        ),
      },
      {
        accessorKey: "pips",
        header: "Pips",
        cell: ({ row }) => (
          <PnlPipsCell value={row.original.pips ?? 0} isPips />
        ),
      },
      {
        accessorKey: "durationSeconds",
        header: "Durée",
        cell: ({ row }) => (
          <span className="text-sm text-slate-700">
            {formatDuration(row.original.durationSeconds)}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: () => (
          <div className="flex items-center gap-2">
            <button className="text-slate-400 hover:text-slate-600">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </button>
            <button className="text-slate-400 hover:text-slate-600">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
          </div>
        ),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: filteredTrades,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const handleExport = () => {
    const csv = [
      ["Ticket", "Type", "Heure de clôture", "Volume", "Symbole", "PnL", "Pips", "Durée"],
      ...filteredTrades.map((t) => [
        t.ticket,
        t.type,
        formatCloseTime(t.closeTime),
        t.volume,
        t.symbol,
        t.profit ?? 0,
        t.pips ?? 0,
        formatDuration(t.durationSeconds),
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `trades-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-slate-500">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-700">Trier par</label>
          <select
            value={sorting[0]?.id ?? "closeTime"}
            onChange={(e) =>
              setSorting([{ id: e.target.value, desc: sorting[0]?.desc ?? true }])
            }
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="closeTime">Heure de clôture ↓</option>
            <option value="profit">PnL</option>
            <option value="symbol">Symbole</option>
            <option value="volume">Volume</option>
          </select>
        </div>

        <div className="flex-1">
          <input
            type="text"
            placeholder="Rechercher un ticket / tags"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm placeholder:text-slate-400"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="all">Tous</option>
            <option value="buy">Buy</option>
            <option value="sell">Sell</option>
          </select>

          <button
            onClick={handleExport}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Exporter
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="max-h-[600px] overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-slate-200">
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
              {filteredTrades.length === 0 && (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500" colSpan={8}>
                    Aucun trade à afficher
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

