"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
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
import type { TradeRow, Withdrawal } from "./types";

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
        "inline-block rounded-lg px-1.5 py-0.5 sm:px-2.5 sm:py-1 text-xs sm:text-sm font-semibold whitespace-nowrap",
        isPositive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700",
      )}
    >
      {isPositive ? "+" : ""}
      {displayValue}
    </div>
  );
}

// Type mixte pour trades et retraits
type TableRow = TradeRow | { type: "withdrawal"; withdrawal: Withdrawal };

function TradeCard({
  row,
  isExpanded,
  onToggleExpand,
  allTags,
  onUpdateTags,
  onEnsureTag,
  savingTicket,
  mode,
  baseCapital,
}: {
  row: TableRow;
  isExpanded: boolean;
  onToggleExpand: () => void;
  allTags: string[];
  onUpdateTags: (trade: TradeRow, tags: string[]) => void;
  onEnsureTag: (tag: string) => Promise<void>;
  savingTicket: string | null;
  mode: "absolute" | "percentage";
  baseCapital: number;
}) {
  if ("withdrawal" in row) {
    const w = row.withdrawal;
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold uppercase text-blue-800 bg-blue-100 px-2 py-1 rounded">Retrait</span>
              <span className="text-sm text-slate-600">{w.type ?? "Récompense 80%"}</span>
            </div>
            <div className="text-xs sm:text-sm text-slate-600 mb-2">
              {format(new Date(w.date), "d MMM yyyy, HH:mm", { locale: fr })}
            </div>
            <div className="flex items-center gap-2">
              <div className="inline-block rounded-lg px-2.5 py-1 text-sm font-semibold bg-blue-100 text-blue-700">
                {formatValue(-Math.abs(w.amount), mode, baseCapital, "EUR", true)}
              </div>
              <span className="text-xs text-blue-600">(100% retiré)</span>
            </div>
            {w.note && (
              <div className="mt-2 text-xs text-slate-500">{w.note}</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const trade = row;
  const isPositive = (trade.profit ?? 0) >= 0;
  const hasNotes = !!(trade.notes || trade.screenshotUrl);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-semibold text-slate-900">Ticket {trade.ticket}</span>
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
          </div>
          <div className="flex items-center gap-3 mb-3">
            <div
              className={clsx(
                "flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold",
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
            <span className="text-xs sm:text-sm text-slate-600">
              {formatCloseTime(trade.closeTime)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="text-slate-400 hover:text-slate-600" title="Lien externe">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="space-y-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 w-16">Volume</span>
          <span className="text-sm font-medium text-slate-900">{trade.volume}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 w-16">Symbole</span>
          <span className="text-sm font-medium text-slate-900">{trade.symbol}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 w-16">PnL</span>
          <PnlPipsCell value={trade.profit ?? 0} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 w-16">Pips</span>
          <PnlPipsCell value={trade.pips ?? 0} isPips />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 w-16">Durée</span>
          <div className="inline-block rounded-lg px-2.5 py-1 text-sm font-medium bg-slate-100 text-slate-700">
            {formatDuration(trade.durationSeconds)}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-slate-200">
          <div>
            <div className="text-xs text-slate-500 mb-2">Tags</div>
            <TagCell
              trade={trade}
              allTags={allTags}
              onUpdate={(tags) => onUpdateTags(trade, tags)}
              onEnsureTag={onEnsureTag}
              disabled={savingTicket === trade.ticket}
            />
          </div>
        </div>
      )}

      <button
        onClick={onToggleExpand}
        className="mt-3 w-full flex items-center justify-center gap-1 text-xs text-slate-600 hover:text-slate-900 py-2 border-t border-slate-100"
      >
        {isExpanded ? "Afficher moins" : "Afficher plus"}
        <svg
          className={clsx("h-4 w-4 transition-transform", isExpanded && "rotate-180")}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </div>
  );
}

function TagCell({
  trade,
  allTags,
  onUpdate,
  onEnsureTag,
  disabled,
}: {
  trade: TradeRow;
  allTags: string[];
  onUpdate: (next: string[]) => void;
  onEnsureTag: (tag: string) => Promise<void>;
  disabled?: boolean;
}) {
  const [newTag, setNewTag] = useState("");
  const [selectValue, setSelectValue] = useState("");
  const [saving, setSaving] = useState(false);
  const currentTags = trade.tags ?? [];
  const availableTags = allTags.filter((t) => !currentTags.includes(t));

  // Debug logs
  useEffect(() => {
    console.log("[TagCell] Trade:", trade.ticket, "allTags:", allTags, "availableTags:", availableTags, "currentTags:", currentTags);
  }, [trade.ticket, allTags, availableTags, currentTags]);

  const addTag = async (tag: string) => {
    const trimmed = tag.trim();
    console.log("[TagCell] addTag called with:", trimmed, "currentTags:", currentTags);
    if (!trimmed || currentTags.includes(trimmed)) {
      console.log("[TagCell] Tag already exists or empty, skipping");
      return;
    }
    setSaving(true);
    try {
      console.log("[TagCell] Ensuring tag exists:", trimmed);
      await onEnsureTag(trimmed);
      console.log("[TagCell] Tag ensured, updating trade");
      onUpdate([...currentTags, trimmed]);
      setNewTag("");
      setSelectValue("");
      console.log("[TagCell] Tag added successfully");
    } catch (error) {
      console.error("[TagCell] Add tag failed:", error);
      alert(
        `Impossible d'ajouter le tag: ${
          error instanceof Error ? error.message : "Erreur inconnue"
        }`,
      );
    } finally {
      setSaving(false);
    }
  };

  const removeTag = (tag: string) => {
    onUpdate(currentTags.filter((t) => t !== tag));
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {currentTags.length === 0 && (
        <span className="text-xs text-slate-400">Aucun tag</span>
      )}
      {currentTags.map((tag) => (
        <button
          key={tag}
          onClick={() => removeTag(tag)}
          disabled={disabled}
          className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-50"
          title="Supprimer ce tag"
        >
          {tag}
          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      ))}
      <div className="flex items-center gap-2">
        <select
          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"
          disabled={disabled || saving}
          value={selectValue}
          onChange={(e) => {
            const selectedTag = e.target.value;
            console.log("[TagCell] Select changed:", selectedTag, "allTags:", allTags, "availableTags:", availableTags);
            if (selectedTag && selectedTag.trim()) {
              console.log("[TagCell] Calling addTag with:", selectedTag);
              void addTag(selectedTag);
            }
            setSelectValue("");
          }}
        >
          <option value="">
            + Ajouter {availableTags.length > 0 ? `(${availableTags.length})` : allTags.length > 0 ? `(${allTags.length} total)` : ""}
          </option>
          {availableTags.length === 0 && allTags.length > 0 && (
            <option value="" disabled>Tous les tags sont déjà ajoutés</option>
          )}
          {availableTags.length === 0 && allTags.length === 0 && (
            <option value="" disabled>Aucun tag disponible</option>
          )}
          {availableTags.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </select>
        <input
          className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-xs"
          placeholder="Nouveau tag"
          value={newTag}
          disabled={disabled || saving}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void addTag(newTag);
            }
          }}
        />
        <button
          onClick={() => {
            void addTag(newTag);
          }}
          disabled={disabled || saving || !newTag.trim()}
          className="rounded-lg bg-blue-600 px-2 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "..." : "Ajouter"}
        </button>
      </div>
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
  const { mode, baseCapital } = useDisplayMode();
  const [trades, setTrades] = useState<TradeRow[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([
    { id: "closeTime", desc: true },
  ]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [symbolFilter, setSymbolFilter] = useState<string>("all");
  const [allTags, setAllTags] = useState<string[]>([]);
  const [savingTicket, setSavingTicket] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "cards">("cards");
  const [expandedTrades, setExpandedTrades] = useState<Set<string>>(new Set());

  const computeTags = useCallback((list: TradeRow[]) => {
    return Array.from(
      new Set(
        list
          .map((t) => t.tags ?? [])
          .flat()
          .filter((tag): tag is string => typeof tag === "string" && tag.length > 0),
      ),
    );
  }, []);

  const fetchTags = useCallback(async () => {
    try {
      console.log("[ClosedTradesTable] Fetching tags for accountId:", accountId);
      const res = await fetch(
        `/api/ftmo/tags?accountId=${accountId}&userId=demo-user`,
      );
      if (!res.ok) {
        console.warn("[ClosedTradesTable] Failed to fetch tags, status:", res.status);
        return [];
      }
      const data = await res.json();
      const apiTags = data.tags ?? [];
      console.log("[ClosedTradesTable] Fetched tags from API:", apiTags);
      // Fusionner avec les tags existants (des trades)
      const tradeTags = computeTags(trades);
      const merged = Array.from(new Set([...apiTags, ...tradeTags])).sort((a, b) =>
        a.localeCompare(b, "fr"),
      );
      console.log("[ClosedTradesTable] Merged tags:", merged, "apiTags:", apiTags, "tradeTags:", tradeTags);
      setAllTags(merged);
      return apiTags;
    } catch (error) {
      console.error("[ClosedTradesTable] Error fetching tags:", error);
      return [];
    }
  }, [accountId, trades, computeTags]);

  // Charger les tags et les trades en parallèle, puis fusionner
  useEffect(() => {
    const fetchAll = async () => {
      try {
        console.log("[ClosedTradesTable] 🔄 Starting fetch for accountId:", accountId, "refreshKey:", refreshKey);
        setLoading(true);
        
        // Charger les tags et les trades en parallèle
        const [tagsRes, tradesRes, withdrawalsRes] = await Promise.all([
          fetch(`/api/ftmo/tags?accountId=${accountId}&userId=demo-user`),
          fetch(`/api/ftmo/trades?accountId=${accountId}&userId=demo-user&status=closed`),
          fetch(`/api/ftmo/withdrawals?accountId=${accountId}&userId=demo-user`),
        ]);

        // Traiter les tags
        let apiTags: string[] = [];
        if (tagsRes.ok) {
          const tagsData = await tagsRes.json();
          apiTags = tagsData.tags ?? [];
          console.log("[ClosedTradesTable] ✅ Loaded tags from API:", apiTags, "count:", apiTags.length);
        } else {
          console.warn("[ClosedTradesTable] ❌ Failed to load tags, status:", tagsRes.status);
        }

        // Traiter les trades
        let newTrades: TradeRow[] = [];
        if (tradesRes.ok) {
          const tradesData = await tradesRes.json();
          newTrades = tradesData.trades ?? [];
          setTrades(newTrades);
          console.log("[ClosedTradesTable] ✅ Loaded trades:", newTrades.length);
        } else {
          setTrades([]);
        }

        // Traiter les retraits
        if (withdrawalsRes.ok) {
          const withdrawalsData = await withdrawalsRes.json();
          setWithdrawals(withdrawalsData.withdrawals ?? []);
        } else {
          setWithdrawals([]);
        }

        // Fusionner tous les tags (API + trades) en une seule fois
        const tradeTags = computeTags(newTrades);
        const allTagsMerged = Array.from(
          new Set([...apiTags, ...tradeTags]),
        ).sort((a, b) => a.localeCompare(b, "fr"));
        console.log("[ClosedTradesTable] ✅ Setting allTags to:", allTagsMerged, "apiTags:", apiTags, "tradeTags:", tradeTags);
        setAllTags(allTagsMerged);
      } catch (error) {
        console.error("[ClosedTradesTable] ❌ Error fetching data:", error);
        setTrades([]);
        setWithdrawals([]);
      } finally {
        setLoading(false);
      }
    };
    void fetchAll();
  }, [accountId, refreshKey, computeTags]);

  // Ne pas synchroniser automatiquement ici car on le fait déjà dans le fetch principal
  // Cela évite les conflits de mise à jour

  const updateTradeTags = useCallback(
    async (trade: TradeRow, nextTags: string[]) => {
      setSavingTicket(trade.ticket);
      try {
        const res = await fetch("/api/ftmo/trades", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ticket: trade.ticket,
            accountId,
            userId: "demo-user",
            tags: nextTags,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "Impossible de mettre à jour les tags");
        }

        setTrades((prev) => {
          const updated = prev.map((t) =>
            t.ticket === trade.ticket ? { ...t, tags: nextTags } : t,
          );
          setAllTags((prevTags) =>
            Array.from(
              new Set([...prevTags, ...nextTags]),
            ).sort((a, b) => a.localeCompare(b, "fr")),
          );
          return updated;
        });
      } catch (error) {
        console.error("Update tags failed:", error);
        alert(
          `Impossible de mettre à jour les tags: ${
            error instanceof Error ? error.message : "Erreur inconnue"
          }`,
        );
      } finally {
        setSavingTicket(null);
      }
    },
    [accountId],
  );

  const ensureTagExists = useCallback(
    async (tag: string) => {
      console.log("[ClosedTradesTable] ensureTagExists called with:", tag);
      const res = await fetch("/api/ftmo/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          userId: "demo-user",
          name: tag,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.error("[ClosedTradesTable] Failed to create tag:", body);
        throw new Error(body.error ?? "Impossible d'enregistrer le tag");
      }
      const result = await res.json();
      console.log("[ClosedTradesTable] Tag created successfully:", result);
      // Ajouter immédiatement le tag à la liste
      setAllTags((prev) => {
        const updated = Array.from(new Set([...prev, tag])).sort((a, b) =>
          a.localeCompare(b, "fr"),
        );
        console.log("[ClosedTradesTable] Updated allTags immediately:", updated);
        return updated;
      });
      // Recharger depuis l'API pour être sûr
      try {
        const tagsRes = await fetch(
          `/api/ftmo/tags?accountId=${accountId}&userId=demo-user`,
        );
        if (tagsRes.ok) {
          const tagsData = await tagsRes.json();
          const apiTags = tagsData.tags ?? [];
          const tradeTags = computeTags(trades);
          const merged = Array.from(new Set([...apiTags, ...tradeTags])).sort((a, b) =>
            a.localeCompare(b, "fr"),
          );
          console.log("[ClosedTradesTable] Refetched and merged tags:", merged);
          setAllTags(merged);
        }
      } catch (error) {
        console.error("[ClosedTradesTable] Error refetching tags:", error);
      }
    },
    [accountId, trades, computeTags],
  );

  // Extraire les symboles uniques (incluant "Retrait" pour les retraits)
  const uniqueSymbols = useMemo(() => {
    const symbols = Array.from(
      new Set(trades.map((t) => t.symbol).filter((s): s is string => !!s)),
    ).sort((a, b) => a.localeCompare(b, "fr"));
    // Ajouter "Retrait" s'il y a des retraits
    if (withdrawals.length > 0) {
      return ["Retrait", ...symbols];
    }
    return symbols;
  }, [trades, withdrawals]);

  // Combiner trades et retraits en une seule liste pour le tableau
  const allRows = useMemo<TableRow[]>(() => {
    const rows: TableRow[] = [
      ...trades.map((t) => ({ ...t })),
      ...withdrawals.map((w) => ({
        type: "withdrawal" as const,
        withdrawal: w,
      })),
    ];
    // Trier par date (closeTime pour trades, date pour retraits)
    return rows.sort((a, b) => {
      const aTime = "withdrawal" in a
        ? new Date(a.withdrawal.date).getTime()
        : new Date(a.closeTime ?? "").getTime();
      const bTime = "withdrawal" in b
        ? new Date(b.withdrawal.date).getTime()
        : new Date(b.closeTime ?? "").getTime();
      return bTime - aTime; // Plus récent en premier
    });
  }, [trades, withdrawals]);

  const filteredRows = useMemo(() => {
    let filtered = allRows;
    
    // Filtre par type (Buy/Sell)
    if (typeFilter !== "all") {
      filtered = filtered.filter((row) => {
        if ("withdrawal" in row) return false; // Les retraits ne sont pas filtrés par type de trade
        return row.type === typeFilter;
      });
    }
    
    // Filtre par tag
    if (tagFilter !== "all") {
      filtered = filtered.filter((row) => {
        if ("withdrawal" in row) return false; // Les retraits n'ont pas de tags
        const tradeTags = row.tags ?? [];
        return tradeTags.includes(tagFilter);
      });
    }
    
    // Filtre par symbole (incluant "Retrait")
    if (symbolFilter !== "all") {
      filtered = filtered.filter((row) => {
        if ("withdrawal" in row) {
          return symbolFilter === "Retrait";
        }
        return row.symbol === symbolFilter;
      });
    }
    
    // Recherche globale (améliorée pour inclure les tags)
    if (globalFilter) {
      const search = globalFilter.toLowerCase();
      filtered = filtered.filter((row) => {
        if ("withdrawal" in row) {
          const w = row.withdrawal;
          return (
            (w.type ?? "").toLowerCase().includes(search) ||
            (w.note ?? "").toLowerCase().includes(search)
          );
        }
        const tradeTags = (row.tags ?? []).map((t) => t.toLowerCase()).join(" ");
        return (
          row.ticket.toLowerCase().includes(search) ||
          row.symbol.toLowerCase().includes(search) ||
          tradeTags.includes(search)
        );
      });
    }
    
    return filtered;
  }, [allRows, typeFilter, tagFilter, symbolFilter, globalFilter]);

  const columns: ColumnDef<TableRow>[] = useMemo(
    () => [
      {
        accessorKey: "ticket",
        header: () => (
          <div className="flex items-center gap-1 whitespace-nowrap">
            Type
            <button className="text-slate-400 hover:text-slate-600">
              <svg className="h-3 w-3 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          const rowData = row.original;
          if ("withdrawal" in rowData) {
            return (
              <span className="text-[10px] sm:text-xs font-bold uppercase text-blue-800 whitespace-nowrap">Retrait</span>
            );
          }
          const trade = rowData;
          return (
            <div
              className={clsx(
                "flex items-center gap-0.5 sm:gap-1 rounded px-1 sm:px-1.5 py-0.5 text-[10px] sm:text-xs font-semibold",
                trade.type === "buy"
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700",
              )}
            >
              {trade.type === "buy" ? (
                <svg className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M14.707 12.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 14.586V7a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              <span className="whitespace-nowrap">{trade.type === "buy" ? "Buy" : "Sell"}</span>
            </div>
          );
        },
      },
      {
        id: "closeTime",
        accessorFn: (row) => {
          if ("withdrawal" in row) {
            return new Date(row.withdrawal.date).getTime();
          }
          return new Date(row.closeTime ?? "").getTime();
        },
        header: () => (
          <div className="flex items-center gap-1">
            Date / Heure
            <button className="text-slate-400 hover:text-slate-600">
              <svg className="h-3 w-3 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          const rowData = row.original;
          if ("withdrawal" in rowData) {
            return (
              <span className="text-xs sm:text-sm text-slate-700 whitespace-nowrap">
                {format(new Date(rowData.withdrawal.date), "d MMM yyyy, HH:mm", { locale: fr })}
              </span>
            );
          }
          return (
            <span className="text-xs sm:text-sm text-slate-700 whitespace-nowrap">
              {formatCloseTime(rowData.closeTime)}
            </span>
          );
        },
      },
      {
        accessorKey: "volume",
        header: () => (
          <div className="flex items-center gap-1">
            Volume / Détails
            <button className="text-slate-400 hover:text-slate-600">
              <svg className="h-3 w-3 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          const rowData = row.original;
          if ("withdrawal" in rowData) {
            const w = rowData.withdrawal;
            return (
              <div className="text-xs sm:text-sm text-slate-700">
                {w.note && <div className="text-[10px] sm:text-xs text-slate-500 break-words">{w.note}</div>}
                {w.type?.includes("80%") && (
                  <div className="text-[10px] sm:text-xs text-green-600 mt-1 font-semibold">
                    {formatValue(
                      Math.abs(w.amount * 0.8),
                      mode,
                      baseCapital,
                      "EUR",
                      true,
                    )} reçu (80%)
                  </div>
                )}
              </div>
            );
          }
          return (
            <span className="text-xs sm:text-sm text-slate-700">{rowData.volume}</span>
          );
        },
      },
      {
        accessorKey: "symbol",
        header: () => (
          <div className="flex items-center gap-1">
            Symbole
            <button className="text-slate-400 hover:text-slate-600">
              <svg className="h-3 w-3 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          const rowData = row.original;
          if ("withdrawal" in rowData) {
            return <span className="text-xs sm:text-sm text-slate-400">-</span>;
          }
          return (
            <span className="text-xs sm:text-sm font-medium text-slate-900 whitespace-nowrap">{rowData.symbol}</span>
          );
        },
      },
      {
        id: "tags",
        header: "Tags",
        cell: ({ row }) => {
          const rowData = row.original;
          if ("withdrawal" in rowData) {
            return <span className="text-xs text-slate-400">-</span>;
          }
          return (
            <TagCell
              trade={rowData}
              allTags={allTags}
              onUpdate={(next) => updateTradeTags(rowData, next)}
              onEnsureTag={ensureTagExists}
              disabled={savingTicket === rowData.ticket}
            />
          );
        },
      },
      {
        accessorKey: "profit",
        header: "Montant",
        cell: ({ row }) => {
          const rowData = row.original;
          if ("withdrawal" in rowData) {
            const w = rowData.withdrawal;
            return (
              <div className="text-right">
                <div className={clsx(
                  "inline-block rounded-lg px-1.5 py-0.5 sm:px-2.5 sm:py-1 text-xs sm:text-sm font-semibold bg-blue-100 text-blue-700",
                )}>
                  {formatValue(
                    -Math.abs(w.amount),
                    mode,
                    baseCapital,
                    "EUR",
                    true,
                  )}
                </div>
                <div className="text-[10px] sm:text-xs text-blue-600 mt-0.5 sm:mt-1">
                  (100% retiré)
                </div>
              </div>
            );
          }
          return (
            <PnlPipsCell value={rowData.profit ?? 0} />
          );
        },
      },
      {
        accessorKey: "pips",
        header: "Pips",
        cell: ({ row }) => {
          const rowData = row.original;
          if ("withdrawal" in rowData) {
            return <span className="text-xs sm:text-sm text-slate-400">-</span>;
          }
          return (
            <PnlPipsCell value={rowData.pips ?? 0} isPips />
          );
        },
      },
      {
        accessorKey: "durationSeconds",
        header: "Durée",
        cell: ({ row }) => {
          const rowData = row.original;
          if ("withdrawal" in rowData) {
            return <span className="text-xs sm:text-sm text-slate-400">-</span>;
          }
          return (
            <span className="text-xs sm:text-sm text-slate-700 whitespace-nowrap">
              {formatDuration(rowData.durationSeconds)}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: "",
        cell: () => (
          <div className="flex items-center gap-2">
            <button className="text-slate-400 hover:text-slate-600">
              <svg className="h-3 w-3 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </button>
            <button className="text-slate-400 hover:text-slate-600">
              <svg className="h-3 w-3 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    [allTags, savingTicket, updateTradeTags, ensureTagExists, mode, baseCapital],
  );

  const table = useReactTable({
    data: filteredRows,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const toggleExpand = useCallback((ticket: string) => {
    setExpandedTrades((prev) => {
      const next = new Set(prev);
      if (next.has(ticket)) {
        next.delete(ticket);
      } else {
        next.add(ticket);
      }
      return next;
    });
  }, []);

  const handleExport = () => {
    const csv = [
      ["Type", "Date/Heure", "Volume/Détails", "Symbole", "Montant", "Pips", "Durée"],
      ...filteredRows.map((row) => {
        if ("withdrawal" in row) {
          const w = row.withdrawal;
          return [
            `Retrait - ${w.type ?? "Récompense 80%"}`,
            format(new Date(w.date), "d MMM yyyy, HH:mm", { locale: fr }),
            w.note || "-",
            "-",
            w.amount,
            "-",
            "-",
          ];
        }
        const t = row;
        return [
          t.ticket,
          formatCloseTime(t.closeTime),
          t.volume,
          t.symbol,
          t.profit ?? 0,
          t.pips ?? 0,
          formatDuration(t.durationSeconds),
        ];
      }),
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
      <div className="flex flex-wrap items-center gap-2 sm:gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode("table")}
            className={clsx(
              "flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors",
              viewMode === "table"
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            )}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Tableau
          </button>
          <button
            onClick={() => setViewMode("cards")}
            className={clsx(
              "flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors",
              viewMode === "cards"
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            )}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            Cartes
          </button>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <label className="text-xs sm:text-sm font-medium text-slate-700 whitespace-nowrap">Trier par</label>
          <select
            value={sorting[0]?.id ?? "closeTime"}
            onChange={(e) =>
              setSorting([{ id: e.target.value, desc: sorting[0]?.desc ?? true }])
            }
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs sm:px-3 sm:py-2 sm:text-sm min-w-[120px] sm:min-w-[140px]"
          >
            <option value="closeTime">Heure de clôture ↓</option>
            <option value="profit">PnL</option>
            <option value="symbol">Symbole</option>
            <option value="volume">Volume</option>
          </select>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <label className="text-xs sm:text-sm font-medium text-slate-700 whitespace-nowrap">Tag</label>
          <select
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs sm:px-3 sm:py-2 sm:text-sm min-w-[100px] sm:min-w-[120px]"
          >
            <option value="all">Tous les tags</option>
            {allTags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <label className="text-xs sm:text-sm font-medium text-slate-700 whitespace-nowrap">Symbole</label>
          <select
            value={symbolFilter}
            onChange={(e) => setSymbolFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs sm:px-3 sm:py-2 sm:text-sm min-w-[100px] sm:min-w-[120px]"
          >
            <option value="all">Tous les symboles</option>
            {uniqueSymbols.map((symbol) => (
              <option key={symbol} value={symbol}>
                {symbol}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 min-w-0">
          <input
            type="text"
            placeholder="Rechercher un ticket, notes, tags..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs placeholder:text-slate-400 sm:px-4 sm:py-2 sm:text-sm"
          />
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs sm:px-3 sm:py-2 sm:text-sm min-w-[70px] sm:min-w-[80px]"
          >
            <option value="all">Tous</option>
            <option value="buy">Buy</option>
            <option value="sell">Sell</option>
          </select>

          <button
            onClick={handleExport}
            className="flex items-center gap-1 sm:gap-2 rounded-lg bg-blue-600 px-2 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 sm:px-4 sm:py-2 sm:text-sm whitespace-nowrap"
            title="Exporter en CSV"
          >
            <span className="hidden sm:inline">Exporter</span>
            <span className="sm:hidden">Exp.</span>
            <svg className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </button>
        </div>
      </div>

      {viewMode === "table" ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="max-h-[400px] sm:max-h-[600px] overflow-auto">
            <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
              <table className="w-full text-xs sm:text-sm">
                <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <th
                          key={header.id}
                          className="px-2 py-2 sm:px-4 sm:py-3 text-left text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-slate-600 align-top min-w-[80px] sm:min-w-[100px]"
                        >
                          <div className="break-words whitespace-normal word-break-break-word">
                            {header.isPlaceholder
                              ? null
                              : flexRender(header.column.columnDef.header, header.getContext())}
                          </div>
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50">
                      {row.getVisibleCells().map((cell) => (
                        <td 
                          key={cell.id} 
                          className="px-2 py-2 sm:px-4 sm:py-3 align-top min-w-[80px] sm:min-w-[100px]"
                        >
                          <div className="break-words whitespace-normal word-break-break-word text-xs sm:text-sm">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                  {filteredRows.length === 0 && (
                    <tr>
                      <td className="px-2 py-8 text-center text-slate-500 text-xs sm:text-sm" colSpan={8}>
                        Aucun trade ou retrait à afficher
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRows.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
              <p className="text-slate-500">Aucun trade ou retrait à afficher</p>
            </div>
          ) : (
            filteredRows.map((row) => {
              const ticket = "withdrawal" in row ? row.withdrawal.id : row.ticket;
              if (!ticket) return null;
              return (
                <TradeCard
                  key={ticket}
                  row={row}
                  isExpanded={expandedTrades.has(ticket)}
                  onToggleExpand={() => toggleExpand(ticket)}
                  allTags={allTags}
                  onUpdateTags={updateTradeTags}
                  onEnsureTag={ensureTagExists}
                  savingTicket={savingTicket}
                  mode={mode}
                  baseCapital={baseCapital}
                />
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

