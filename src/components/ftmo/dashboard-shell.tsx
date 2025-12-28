"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Tab } from "@headlessui/react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import clsx from "clsx";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format } from "date-fns";
import type { Account, EquityPoint, KpiSummary, TradeRow } from "./types";

const ftmoBlue = "#1f6ff2";

const currency = (value?: number, currencyCode = "USD") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 2,
  }).format(value ?? 0);

const percent = (value?: number) =>
  `${value !== undefined ? value.toFixed(2) : "0.00"}%`;

const dateTime = (value?: string) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return format(parsed, "dd MMM HH:mm");
};

const fallbackAccounts: Account[] = [
  {
    id: "demo-account",
    name: "FTMO Challenge",
    accountType: "challenge",
    platform: "mt5",
    size: 100000,
    currency: "USD",
    startDate: "2024-10-01T00:00:00Z",
    endDate: "2024-12-31T00:00:00Z",
    balance: 102340,
    equity: 103120,
    drawdownPct: 3.2,
    profitFactor: 1.9,
    avgRrr: 1.4,
  },
];

const fallbackTrades: TradeRow[] = [
  {
    ticket: "123456",
    accountId: "demo-account",
    openTime: "2024-11-02T09:24:00Z",
    type: "buy",
    volume: 1,
    symbol: "XAUUSD",
    entryPrice: 1870.5,
    stopLoss: 1862,
    takeProfit: 1887,
    closeTime: "2024-11-02T12:05:00Z",
    closePrice: 1884.1,
    profit: 1360,
    pips: 140,
    durationSeconds: 9720,
    status: "closed",
    swap: -2.5,
    commission: -4,
  },
  {
    ticket: "123457",
    accountId: "demo-account",
    openTime: "2024-11-03T08:14:00Z",
    type: "sell",
    volume: 0.5,
    symbol: "EURUSD",
    entryPrice: 1.072,
    stopLoss: 1.076,
    takeProfit: 1.063,
    closeTime: "2024-11-03T16:10:00Z",
    closePrice: 1.068,
    profit: 200,
    pips: 40,
    durationSeconds: 28600,
    status: "closed",
  },
  {
    ticket: "LIVE-OPEN",
    accountId: "demo-account",
    openTime: "2024-11-04T10:05:00Z",
    type: "buy",
    volume: 1.2,
    symbol: "US30",
    entryPrice: 34450,
    stopLoss: 34320,
    takeProfit: 34720,
    profit: 180,
    pips: 45,
    durationSeconds: 5400,
    status: "open",
    currentPnl: 180,
  },
];

const fallbackSummary: KpiSummary = {
  balance: 102340,
  equity: 103120,
  unrealizedPnl: 780,
  drawdownPct: 3.2,
  profitFactor: 1.9,
  avgRrr: 1.4,
  totalProfit: 2340,
  averageLot: 0.9,
  averageDurationSeconds: 15800,
};

const fallbackEquity: EquityPoint[] = [
  { time: "2024-10-01T00:00:00Z", equity: 100000, drawdownPct: 0 },
  { time: "2024-10-10T00:00:00Z", equity: 100800, drawdownPct: -0.8 },
  { time: "2024-10-18T00:00:00Z", equity: 99800, drawdownPct: -2.0 },
  { time: "2024-10-28T00:00:00Z", equity: 101200, drawdownPct: -0.5 },
  { time: "2024-11-02T12:05:00Z", equity: 102560, drawdownPct: -0.3 },
  { time: "2024-11-04T10:05:00Z", equity: 103120, drawdownPct: -1.1 },
];

type Filters = {
  result: "all" | "winner" | "loser";
  symbol: string;
  sortBy: string;
  sortDir: "asc" | "desc";
};

const formatDuration = (seconds?: number) => {
  if (!seconds) return "-";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
};

const badge = (value: string) =>
  clsx(
    "rounded-full px-2 py-1 text-xs font-semibold uppercase tracking-wide",
    value === "buy"
      ? "bg-blue-50 text-blue-700"
      : value === "sell"
        ? "bg-red-50 text-red-700"
        : "bg-slate-100 text-slate-700",
  );

function TradesTable({
  data,
  columns,
}: {
  data: TradeRow[];
  columns: ColumnDef<TradeRow>[];
}) {
  const [sorting, setSorting] = useState<SortingState>([]);

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="max-h-[420px] overflow-auto">
        <table className="min-w-full text-sm text-slate-800">
          <thead className="bg-slate-50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-slate-100 last:border-none hover:bg-slate-50/70"
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td className="px-3 py-4 text-center text-slate-500" colSpan={12}>
                  Aucun trade à afficher pour ce filtre.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EquityCard({
  series,
  currencyCode,
}: {
  series: EquityPoint[];
  currencyCode: string;
}) {
  const data = series.length ? series : fallbackEquity;
  const shortDate = (value: string) => format(new Date(value), "dd MMM");

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Équité & Drawdown
          </p>
          <p className="text-base font-semibold text-slate-900">
            Courbe interactive
          </p>
        </div>
      </div>
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="time"
              tickFormatter={shortDate}
              tickLine={false}
              stroke="#94a3b8"
            />
            <YAxis
              yAxisId="left"
              tickFormatter={(v) => currency(v as number, currencyCode)}
              width={90}
              stroke="#94a3b8"
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tickFormatter={(v) => percent(v as number)}
              width={60}
              stroke="#94a3b8"
            />
            <Tooltip
              formatter={(value, name) =>
                name === "drawdownPct"
                  ? percent(value as number)
                  : currency(value as number, currencyCode)
              }
              labelFormatter={(label) => dateTime(String(label))}
            />
            <Area
              yAxisId="right"
              type="monotone"
              dataKey="drawdownPct"
              fill="#e0ecff"
              stroke="#94b8ff"
              name="Drawdown"
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="equity"
              stroke={ftmoBlue}
              strokeWidth={2.5}
              dot={false}
              name="Équité"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function KpiGrid({
  summary,
  currencyCode,
}: {
  summary: KpiSummary | null;
  currencyCode: string;
}) {
  const data = summary ?? fallbackSummary;
  const cards = [
    { label: "Balance", value: currency(data.balance, currencyCode) },
    { label: "Équité", value: currency(data.equity, currencyCode) },
    { label: "PnL non réalisé", value: currency(data.unrealizedPnl, currencyCode) },
    { label: "Drawdown", value: percent(data.drawdownPct) },
    {
      label: "Facteur de profit",
      value: data.profitFactor === Infinity ? "∞" : data.profitFactor.toFixed(2),
    },
    { label: "RRR moyen", value: data.avgRrr.toFixed(2) },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <p className="text-xs uppercase tracking-wide text-slate-500">
            {card.label}
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {card.value}
          </p>
        </div>
      ))}
    </div>
  );
}

function AccountSelector({
  accounts,
  selected,
  onChange,
}: {
  accounts: Account[];
  selected?: string | null;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-500">
          Comptes FTMO
        </p>
        <select
          value={selected ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none ring-0 focus:border-blue-500"
        >
          {accounts.map((acc) => (
            <option key={acc.id} value={acc.id}>
              {acc.name} {acc.size ? `- ${acc.size.toLocaleString()}` : ""}
            </option>
          ))}
        </select>
      </div>
      <div className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-medium uppercase tracking-wide text-slate-600">
        {accounts.length} compte(s)
      </div>
    </div>
  );
}

function ImportPanel({
  onImport,
  accountName,
  disabled,
}: {
  onImport: (file: File) => Promise<void>;
  accountName: string;
  disabled: boolean;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleUpload = async () => {
    if (!file) {
      setMessage("Ajoutez un fichier CSV ou XLSX FTMO.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await onImport(file);
      setMessage("Import terminé avec succès.");
      setFile(null);
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : "Échec de l'import, réessayez.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-dashed border-slate-300 bg-white/60 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-semibold text-slate-900">Import FTMO</p>
        <p className="text-xs text-slate-500">
          {accountName} — CSV ou XLSX, dédoublonné par Ticket.
        </p>
        {message && <p className="text-xs text-slate-600">{message}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="file"
          accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-sm"
        />
        <button
          onClick={handleUpload}
          disabled={busy || disabled}
          className={clsx(
            "rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition",
            busy || disabled
              ? "bg-slate-400"
              : "bg-blue-600 hover:bg-blue-700",
          )}
        >
          {busy ? "Import..." : "Importer"}
        </button>
      </div>
    </div>
  );
}

function AccountMeta({ account }: { account: Account }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-slate-500">
        Paramètres du compte
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <MetaRow label="Type" value={account.accountType ?? "N/A"} />
        <MetaRow
          label="Taille"
          value={account.size ? `${account.size.toLocaleString()}` : "N/A"}
        />
        <MetaRow label="Plateforme" value={account.platform ?? "N/A"} />
        <MetaRow label="Devise" value={account.currency ?? "USD"} />
        <MetaRow label="Début" value={dateTime(account.startDate)} />
        <MetaRow label="Fin" value={dateTime(account.endDate)} />
      </div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="text-sm font-semibold text-slate-900">{value ?? "—"}</p>
    </div>
  );
}

function TradesFilters({
  filters,
  onChange,
}: {
  filters: Filters;
  onChange: (next: Filters) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm">
      <select
        value={filters.result}
        onChange={(e) =>
          onChange({ ...filters, result: e.target.value as Filters["result"] })
        }
        className="rounded-lg border border-slate-200 bg-white px-2 py-1 shadow-sm"
      >
        <option value="all">Tous</option>
        <option value="winner">Gagnants</option>
        <option value="loser">Perdants</option>
      </select>
      <input
        placeholder="Symbole (EURUSD...)"
        value={filters.symbol}
        onChange={(e) => onChange({ ...filters, symbol: e.target.value })}
        className="rounded-lg border border-slate-200 bg-white px-2 py-1 shadow-sm"
      />
    </div>
  );
}

function JournalPanel({
  trades,
  onSave,
  saving,
}: {
  trades: TradeRow[];
  onSave: (
    ticket: string,
    data: { notes: string; screenshotUrl: string; mfe?: number; mae?: number },
  ) => Promise<void>;
  saving: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(
    trades[0]?.ticket ?? null,
  );
  const [notes, setNotes] = useState("");
  const [screenshot, setScreenshot] = useState("");
  const [mfe, setMfe] = useState<string>("");
  const [mae, setMae] = useState<string>("");
  const [message, setMessage] = useState<string | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (selected) {
      const trade = trades.find((t) => t.ticket === selected);
      setNotes(trade?.notes ?? "");
      setScreenshot(trade?.screenshotUrl ?? "");
      setMfe(trade?.mfe?.toString() ?? "");
      setMae(trade?.mae?.toString() ?? "");
    }
  }, [selected, trades]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const stats = useMemo(() => {
    const hours = trades.reduce<Record<string, number>>((acc, trade) => {
      const hour = new Date(trade.openTime).getHours();
      acc[hour] = (acc[hour] ?? 0) + (trade.profit ?? 0);
      return acc;
    }, {});
    const bestHour = Object.entries(hours).sort((a, b) => b[1] - a[1])[0]?.[0];
    const withStops = trades.filter((t) => t.stopLoss && t.takeProfit);
    const efficiency =
      withStops.length === 0
        ? 0
        : withStops.filter((t) => (t.profit ?? 0) > 0).length /
          withStops.length;
    return {
      bestHour,
      efficiency: Number((efficiency * 100).toFixed(1)),
    };
  }, [trades]);

  const handleSave = async () => {
    if (!selected) return;
    setMessage(null);
    try {
      await onSave(selected, {
        notes,
        screenshotUrl: screenshot,
        mfe: mfe ? Number(mfe) : undefined,
        mae: mae ? Number(mae) : undefined,
      });
      setMessage("Journal mis à jour.");
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : "Impossible de sauvegarder.",
      );
    }
  };

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Journal de trading
          </p>
          <p className="text-sm text-slate-700">
            Notes & captures par ticket.
          </p>
        </div>
        <select
          value={selected ?? ""}
          onChange={(e) => setSelected(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
        >
          {trades.map((t) => (
            <option key={t.ticket} value={t.ticket}>
              {t.ticket} — {t.symbol}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">
            Heure la plus rentable
          </p>
          <p className="text-lg font-semibold text-slate-900">
            {stats.bestHour !== undefined ? `${stats.bestHour}h` : "N/A"}
          </p>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">
            Efficacité SL/TP
          </p>
          <p className="text-lg font-semibold text-slate-900">
            {stats.efficiency}%
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-600">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500"
            placeholder="Ce qui a bien fonctionné, ce qui est à améliorer..."
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-600">
            Capture / URL
          </label>
          <input
            value={screenshot}
            onChange={(e) => setScreenshot(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500"
            placeholder="https://..."
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-500">
                MFE
              </p>
              <input
                value={mfe}
                onChange={(e) => setMfe(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm shadow-sm"
                placeholder="Ex: 2.5"
              />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-500">
                MAE
              </p>
              <input
                value={mae}
                onChange={(e) => setMae(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm shadow-sm"
                placeholder="Ex: -1.2"
              />
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving || !selected}
          className={clsx(
            "rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition",
            saving ? "bg-slate-400" : "bg-blue-600 hover:bg-blue-700",
          )}
        >
          {saving ? "Enregistrement..." : "Enregistrer"}
        </button>
        {message && <p className="text-xs text-slate-600">{message}</p>}
      </div>
    </div>
  );
}

function TradesSection({
  openTrades,
  closedTrades,
  filters,
  onFilters,
}: {
  openTrades: TradeRow[];
  closedTrades: TradeRow[];
  filters: Filters;
  onFilters: (next: Filters) => void;
}) {
  const openColumns = useMemo<ColumnDef<TradeRow>[]>(
    () => [
      { accessorKey: "ticket", header: "Ticket" },
      {
        accessorKey: "openTime",
        header: "Ouverture",
        cell: ({ row }) => dateTime(row.original.openTime),
      },
      {
        accessorKey: "type",
        header: "Type",
        cell: ({ row }) => (
          <span className={badge(row.original.type)}>{row.original.type}</span>
        ),
      },
      { accessorKey: "volume", header: "Lot", cell: ({ getValue }) => getValue<number>()?.toFixed(2) },
      { accessorKey: "symbol", header: "Symbole" },
      {
        accessorKey: "entryPrice",
        header: "Prix entrée",
        cell: ({ getValue }) => getValue<number>()?.toFixed(3),
      },
      { accessorKey: "stopLoss", header: "SL", cell: ({ getValue }) => getValue<number>()?.toFixed(3) ?? "-" },
      { accessorKey: "takeProfit", header: "TP", cell: ({ getValue }) => getValue<number>()?.toFixed(3) ?? "-" },
      {
        accessorKey: "currentPnl",
        header: "PnL",
        cell: ({ getValue }) => {
          const v = getValue<number>() ?? 0;
          return (
            <span className={v >= 0 ? "text-emerald-600" : "text-red-600"}>
              {currency(v)}
            </span>
          );
        },
      },
      {
        accessorKey: "pips",
        header: "Pips",
        cell: ({ getValue }) => getValue<number>()?.toFixed(1) ?? "-",
      },
      {
        accessorKey: "durationSeconds",
        header: "Durée",
        cell: ({ getValue }) => formatDuration(getValue<number>()),
      },
    ],
    [],
  );

  const closedColumns = useMemo<ColumnDef<TradeRow>[]>(
    () => [
      { accessorKey: "ticket", header: "Ticket" },
      {
        accessorKey: "openTime",
        header: "Ouverture",
        cell: ({ row }) => dateTime(row.original.openTime),
      },
      {
        accessorKey: "closeTime",
        header: "Clôture",
        cell: ({ row }) => dateTime(row.original.closeTime),
      },
      {
        accessorKey: "type",
        header: "Type",
        cell: ({ row }) => (
          <span className={badge(row.original.type)}>{row.original.type}</span>
        ),
      },
      { accessorKey: "volume", header: "Lot", cell: ({ getValue }) => getValue<number>()?.toFixed(2) },
      { accessorKey: "symbol", header: "Symbole" },
      {
        accessorKey: "entryPrice",
        header: "Prix entrée",
        cell: ({ getValue }) => getValue<number>()?.toFixed(3),
      },
      {
        accessorKey: "closePrice",
        header: "Prix sortie",
        cell: ({ getValue }) => getValue<number>()?.toFixed(3) ?? "-",
      },
      {
        accessorKey: "profit",
        header: "Profit net",
        cell: ({ getValue }) => {
          const v = getValue<number>() ?? 0;
          return (
            <span className={v >= 0 ? "text-emerald-600" : "text-red-600"}>
              {currency(v)}
            </span>
          );
        },
      },
      {
        accessorKey: "swap",
        header: "Swap",
        cell: ({ getValue }) => currency(getValue<number>() ?? 0),
      },
      {
        accessorKey: "commission",
        header: "Commissions",
        cell: ({ getValue }) => currency(getValue<number>() ?? 0),
      },
      {
        accessorKey: "pips",
        header: "Pips",
        cell: ({ getValue }) => getValue<number>()?.toFixed(1) ?? "-",
      },
      {
        accessorKey: "durationSeconds",
        header: "Durée",
        cell: ({ getValue }) => formatDuration(getValue<number>()),
      },
    ],
    [],
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Trades
          </p>
          <p className="text-sm text-slate-700">
            Ouverts, clôturés et journal FTMO.
          </p>
        </div>
        <TradesFilters filters={filters} onChange={onFilters} />
      </div>
      <Tab.Group>
        <Tab.List className="flex gap-2 rounded-xl bg-slate-100 p-1 text-sm">
          {["Ouverts", "Clôturés"].map((label) => (
            <Tab
              key={label}
              className={({ selected }) =>
                clsx(
                  "flex-1 rounded-lg px-3 py-2 font-semibold transition",
                  selected
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-800",
                )
              }
            >
              {label}
            </Tab>
          ))}
        </Tab.List>
        <Tab.Panels className="mt-4">
          <Tab.Panel>
            <TradesTable data={openTrades} columns={openColumns} />
          </Tab.Panel>
          <Tab.Panel>
            <TradesTable data={closedTrades} columns={closedColumns} />
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
}

export default function DashboardShell() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [summary, setSummary] = useState<KpiSummary | null>(null);
  const [equitySeries, setEquitySeries] = useState<EquityPoint[]>([]);
  const [openTrades, setOpenTrades] = useState<TradeRow[]>([]);
  const [closedTrades, setClosedTrades] = useState<TradeRow[]>([]);
  const [filters, setFilters] = useState<Filters>({
    result: "all",
    symbol: "",
    sortBy: "openTime",
    sortDir: "desc",
  });
  const [loading, setLoading] = useState(true);
  const [savingJournal, setSavingJournal] = useState(false);

  const applyFallbackFilters = useCallback(
    (status: "open" | "closed") => {
      return fallbackTrades
        .filter((t) => t.status === status)
        .filter((t) =>
          filters.symbol
            ? t.symbol.toLowerCase().includes(filters.symbol.toLowerCase())
            : true,
        )
        .filter((t) => {
          if (filters.result === "winner") return (t.profit ?? 0) > 0;
          if (filters.result === "loser") return (t.profit ?? 0) < 0;
          return true;
        });
    },
    [filters],
  );

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const res = await fetch("/api/ftmo/accounts?userId=demo-user");
        if (!res.ok) throw new Error("Impossible de charger les comptes.");
        const data = (await res.json()) as { accounts: Account[] };
        const list = data.accounts.length ? data.accounts : fallbackAccounts;
        setAccounts(list);
        setSelectedAccount(list[0]?.id ?? null);
      } catch {
        setAccounts(fallbackAccounts);
        setSelectedAccount(fallbackAccounts[0]?.id ?? null);
      } finally {
        setLoading(false);
      }
    };
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (!selectedAccount) return;
    const fetchSummary = async () => {
      try {
        const res = await fetch(
          `/api/ftmo/summary?accountId=${selectedAccount}`,
        );
        if (!res.ok) throw new Error("Résumé indisponible");
        const data = await res.json();
        setSummary(data.kpis);
        setEquitySeries(data.equitySeries ?? []);
      } catch {
        setSummary(fallbackSummary);
        setEquitySeries(fallbackEquity);
      }
    };
    fetchSummary();
  }, [selectedAccount]);

  useEffect(() => {
    if (!selectedAccount) return;
    const fetchTrades = async (status: "open" | "closed") => {
      const qs = new URLSearchParams({
        accountId: selectedAccount,
        status,
        sortBy: filters.sortBy,
        sortDir: filters.sortDir,
      });
      if (filters.symbol) qs.set("symbol", filters.symbol);
      if (filters.result !== "all") qs.set("result", filters.result);
      const res = await fetch(`/api/ftmo/trades?${qs.toString()}`);
      if (!res.ok) throw new Error("Trades indisponibles");
      const data = (await res.json()) as { trades: TradeRow[] };
      if (status === "open") setOpenTrades(data.trades ?? []);
      else setClosedTrades(data.trades ?? []);
    };

    fetchTrades("open").catch(() =>
      setOpenTrades(applyFallbackFilters("open")),
    );
    fetchTrades("closed").catch(() =>
      setClosedTrades(applyFallbackFilters("closed")),
    );
  }, [selectedAccount, filters, applyFallbackFilters]);

  const handleImport = async (file: File) => {
    if (!selectedAccount) throw new Error("Choisissez un compte avant d'importer.");
    const form = new FormData();
    form.append("file", file);
    form.append("accountId", selectedAccount);
    form.append("accountName", accounts.find((a) => a.id === selectedAccount)?.name ?? "FTMO Account");
    form.append("userId", "demo-user");
    const res = await fetch("/api/ftmo/import", {
      method: "POST",
      body: form,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? "Import impossible");
    }
    await Promise.all([
      fetch(`/api/ftmo/summary?accountId=${selectedAccount}`)
        .then((r) => r.json())
        .then((data) => {
          setSummary(data.kpis);
          setEquitySeries(data.equitySeries ?? []);
        })
        .catch(() => {}),
      fetch(`/api/ftmo/trades?accountId=${selectedAccount}&status=open`)
        .then((r) => r.json())
        .then((data) => setOpenTrades(data.trades ?? []))
        .catch(() => {}),
      fetch(`/api/ftmo/trades?accountId=${selectedAccount}&status=closed`)
        .then((r) => r.json())
        .then((data) => setClosedTrades(data.trades ?? []))
        .catch(() => {}),
    ]);
  };

  const handleSaveJournal = async (
    ticket: string,
    payload: { notes: string; screenshotUrl: string; mfe?: number; mae?: number },
  ) => {
    setSavingJournal(true);
    await fetch("/api/ftmo/journal", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticket, accountId: selectedAccount, ...payload }),
    }).finally(() => setSavingJournal(false));
  };

  const activeAccount =
    accounts.find((acc) => acc.id === selectedAccount) ?? fallbackAccounts[0];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <AccountSelector
          accounts={accounts.length ? accounts : fallbackAccounts}
          selected={selectedAccount}
          onChange={setSelectedAccount}
        />
        <ImportPanel
          onImport={handleImport}
          accountName={activeAccount?.name ?? "FTMO"}
          disabled={loading}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.7fr,1.1fr]">
        <div className="space-y-4">
          <AccountMeta account={activeAccount} />
          <KpiGrid summary={summary} currencyCode={activeAccount.currency ?? "USD"} />
          <EquityCard
            series={equitySeries}
            currencyCode={activeAccount.currency ?? "USD"}
          />
        </div>
        <div className="space-y-4">
          <TradesSection
            openTrades={openTrades.length ? openTrades : fallbackTrades.filter((t) => t.status === "open")}
            closedTrades={closedTrades.length ? closedTrades : fallbackTrades.filter((t) => t.status === "closed")}
            filters={filters}
            onFilters={setFilters}
          />
          <JournalPanel
            trades={closedTrades.length ? closedTrades : fallbackTrades}
            onSave={handleSaveJournal}
            saving={savingJournal}
          />
        </div>
      </div>
    </div>
  );
}

