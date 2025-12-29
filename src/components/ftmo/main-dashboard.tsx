"use client";

import { useState, useEffect, useCallback } from "react";
import { Tab } from "@headlessui/react";
import clsx from "clsx";
import { EquityChart } from "./equity-chart";
import { StatisticsPage } from "./statistics-page";
import { TradingJournal } from "./trading-journal";
import { ImportPanel } from "./import-panel";
import { useDisplayMode } from "./display-mode-context";
import type { Account, EquityPoint, Withdrawal } from "./types";

const fallbackAccounts: Account[] = [
  {
    id: "demo-account",
    name: "FTMO Challenge",
    accountType: "challenge",
    platform: "mt5",
    size: 160000,
    currency: "EUR",
    startDate: "2024-10-01T00:00:00Z",
    endDate: "2024-12-31T00:00:00Z",
    balance: 166290.12,
    equity: 166290.12,
    drawdownPct: 3.2,
    profitFactor: 3.63,
    avgRrr: 1.04,
  },
];

const fallbackEquity: EquityPoint[] = [
  { time: "2024-12-17T00:07:00Z", equity: 160000, drawdownPct: 0 },
  { time: "2024-12-18T04:05:00Z", equity: 160800, drawdownPct: -0.5 },
  { time: "2024-12-19T12:00:00Z", equity: 162450, drawdownPct: -0.3 },
  { time: "2024-12-20T15:30:00Z", equity: 163200, drawdownPct: -0.2 },
  { time: "2024-12-21T10:15:00Z", equity: 164500, drawdownPct: -0.1 },
  { time: "2024-12-25T23:44:00Z", equity: 166290.12, drawdownPct: -0.05 },
];

export function MainDashboard() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [equitySeries, setEquitySeries] = useState<EquityPoint[]>([]);
  const [kpis, setKpis] = useState<{ balance: number; equity: number; totalProfit: number } | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [withdrawalModalOpen, setWithdrawalModalOpen] = useState(false);
  const [withdrawalForm, setWithdrawalForm] = useState({
    date: "",
    amountReceived: "", // Montant reçu (80%)
    amountReal: "", // Montant réel retiré (100%)
    type: "Récompense 80%",
    note: "",
  });
  const { mode, toggleMode } = useDisplayMode();

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/ftmo/accounts?userId=demo-user");
      if (!res.ok) throw new Error("Impossible de charger les comptes.");
      const data = (await res.json()) as { accounts: Account[] };
      const list = data.accounts.length ? data.accounts : fallbackAccounts;
      setAccounts(list);
      if (!selectedAccount && list.length > 0) {
        // Prioriser un compte avec des données (balance/equity > 0)
        const accountWithData = list.find(a => (a.balance ?? 0) > 0 || (a.equity ?? 0) > 0);
        setSelectedAccount(accountWithData?.id ?? list[0]?.id ?? null);
      }
    } catch {
      setAccounts(fallbackAccounts);
      if (!selectedAccount) {
        setSelectedAccount(fallbackAccounts[0]?.id ?? null);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedAccount]);

  const fetchSummary = useCallback(async () => {
    if (!selectedAccount) return;
    try {
      const res = await fetch(
        `/api/ftmo/summary?accountId=${selectedAccount}&userId=demo-user`,
      );
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setEquitySeries(data.equitySeries ?? fallbackEquity);
      setWithdrawals(data.withdrawals ?? []);
      // Utiliser le solde et l'équité calculés depuis les KPIs (basés sur 160000)
      if (data.kpis) {
        setKpis({
          balance: data.kpis.balance,
          equity: data.kpis.equity,
          totalProfit: data.kpis.totalProfit ?? 0,
        });
      } else {
        setKpis(null);
      }
    } catch {
      setEquitySeries(fallbackEquity);
      setKpis(null);
    }
  }, [selectedAccount]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary, refreshKey]);

  const todayIso = () => new Date().toISOString().split("T")[0];
  const defaultWithdrawalAmount = () => {
    const gains = Math.max(kpis?.totalProfit ?? 0, 0);
    // Par défaut, on retire 80% des gains actuels (montant reçu)
    const amountReceived = gains * 0.8;
    return {
      amountReceived: amountReceived.toFixed(2),
      amountReal: (amountReceived / 0.8).toFixed(2),
    };
  };

  const handleImport = useCallback(
    async (file: File) => {
      let accountIdToUse = selectedAccount;
      
      // Si aucun compte n'est sélectionné, utiliser le premier compte ou créer un nouveau
      if (!accountIdToUse) {
        if (accounts.length > 0) {
          accountIdToUse = accounts[0].id;
          setSelectedAccount(accountIdToUse);
        } else {
          accountIdToUse = `account-${Date.now()}`;
          setSelectedAccount(accountIdToUse);
        }
      }

      const form = new FormData();
      form.append("file", file);
      form.append("accountId", accountIdToUse);
      form.append(
        "accountName",
        accounts.find((a) => a.id === accountIdToUse)?.name ?? "FTMO Account",
      );
      form.append("userId", "demo-user");
      form.append("accountType", "challenge");
      form.append("platform", "mt5");
      form.append("currency", "EUR");

      const res = await fetch("/api/ftmo/import", {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const errorMsg =
          typeof body.error === "string"
            ? body.error
            : body.error?.message ?? "Import impossible";
        throw new Error(errorMsg);
      }

      const result = await res.json();
      // Mettre à jour le refreshKey pour forcer le rafraîchissement
      setRefreshKey((prev) => prev + 1);
      // Recharger les comptes et le résumé
      await fetchAccounts();
      // Attendre un peu pour que les données soient disponibles
      await new Promise(resolve => setTimeout(resolve, 500));
      await fetchSummary();
      return result;
    },
    [selectedAccount, accounts, fetchAccounts, fetchSummary],
  );

  const activeAccount =
    accounts.find((acc) => acc.id === selectedAccount) ?? fallbackAccounts[0];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-slate-500">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Tableau de bord FTMO</h1>
          <p className="text-sm text-slate-600">
            Compte: {activeAccount.name}{" "}
            {activeAccount.size
              ? `(${activeAccount.size.toLocaleString()} ${activeAccount.currency})`
              : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ImportPanel
            onImport={handleImport}
            accountName={activeAccount.name}
            disabled={loading || !selectedAccount}
          />
            <button
              onClick={() => {
                const defaults = defaultWithdrawalAmount();
                setWithdrawalForm({
                  date: todayIso(),
                  amountReceived: defaults.amountReceived,
                  amountReal: defaults.amountReal,
                  type: "Récompense 80%",
                  note: "",
                });
                setWithdrawalModalOpen(true);
              }}
            className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm transition-all hover:bg-blue-100"
          >
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
                d="M12 4v16m8-8H4"
              />
            </svg>
            Ajouter un retrait
          </button>
          <button
            onClick={async () => {
              if (!confirm("Supprimer tous les comptes superflus et ne garder que le compte principal ?")) {
                return;
              }
              try {
                const res = await fetch("/api/ftmo/cleanup", { method: "POST" });
                const data = await res.json();
                if (res.ok) {
                  alert(`Nettoyage terminé !\n${data.message}\n${data.deletedAccounts} compte(s) supprimé(s).`);
                  setRefreshKey((prev) => prev + 1);
                  await fetchAccounts();
                  await fetchSummary();
                } else {
                  alert(`Erreur: ${data.error}`);
                }
              } catch (error) {
                alert(`Erreur lors du nettoyage: ${error instanceof Error ? error.message : "Erreur inconnue"}`);
              }
            }}
            className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 shadow-sm transition-all hover:bg-red-100"
            title="Supprimer tous les comptes sauf le principal"
          >
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
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            Nettoyer les comptes
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <span>
            Affichage en pourcentage basé sur le dépôt initial de{" "}
            <span className="font-semibold text-slate-900">160 000 €</span>
          </span>
        </div>
        {mode === "percentage" && (
          <button
            onClick={toggleMode}
            className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50"
            title="Afficher en euros"
          >
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
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Afficher en €
          </button>
        )}
        {mode === "absolute" && (
          <button
            onClick={toggleMode}
            className="flex items-center gap-2 rounded-lg border-2 border-blue-600 bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700"
            title="Afficher en pourcentage"
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
                d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
            Afficher en %
          </button>
        )}
      </div>

      <Tab.Group>
        <Tab.List className="flex gap-1 border-b border-slate-200">
          {["Graphique d'équité", "Statistiques", "Journal de Trading"].map((label) => (
            <Tab
              key={label}
              className={({ selected }) =>
                clsx(
                  "px-4 py-2 text-sm font-semibold transition-colors",
                  selected
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-slate-500 hover:text-slate-700",
                )
              }
            >
              {label}
            </Tab>
          ))}
        </Tab.List>

        <Tab.Panels className="mt-6">
          <Tab.Panel>
            <EquityChart
              series={equitySeries}
              withdrawals={withdrawals}
              account={{
                ...activeAccount,
                // Utiliser le solde et l'équité calculés depuis les KPIs (basés sur 160000)
                balance: kpis?.balance ?? activeAccount.balance,
                equity: kpis?.equity ?? activeAccount.equity,
              }}
              refreshKey={refreshKey}
            />
          </Tab.Panel>
          <Tab.Panel>
            <StatisticsPage
              accountId={selectedAccount ?? "demo-account"}
              currencyCode={activeAccount.currency ?? "EUR"}
              refreshKey={refreshKey}
            />
          </Tab.Panel>
          <Tab.Panel>
            <TradingJournal
              accountId={selectedAccount ?? "demo-account"}
              refreshKey={refreshKey}
            />
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>

      {withdrawalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Ajouter un retrait</h3>
              <button
                onClick={() => setWithdrawalModalOpen(false)}
                className="rounded-md p-2 text-slate-500 hover:bg-slate-100"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Date</label>
                <input
                  type="date"
                  value={withdrawalForm.date || todayIso()}
                  onChange={(e) =>
                    setWithdrawalForm((f) => ({ ...f, date: e.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Montant reçu (80% du retrait réel)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={withdrawalForm.amountReceived || defaultWithdrawalAmount().amountReceived}
                  onChange={(e) => {
                    const receivedValue = e.target.value;
                    const receivedNum = Number(receivedValue);
                    if (!isNaN(receivedNum) && receivedNum >= 0) {
                      const realValue = receivedNum / 0.8;
                      setWithdrawalForm((f) => ({
                        ...f,
                        amountReceived: receivedValue,
                        amountReal: realValue.toFixed(2),
                      }));
                    } else {
                      setWithdrawalForm((f) => ({
                        ...f,
                        amountReceived: receivedValue,
                        amountReal: "",
                      }));
                    }
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Ex: 2000"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Montant réel retiré du compte FTMO (100%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={withdrawalForm.amountReal || defaultWithdrawalAmount().amountReal}
                  onChange={(e) => {
                    const realValue = e.target.value;
                    const realNum = Number(realValue);
                    if (!isNaN(realNum) && realNum >= 0) {
                      const receivedValue = realNum * 0.8;
                      setWithdrawalForm((f) => ({
                        ...f,
                        amountReal: realValue,
                        amountReceived: receivedValue.toFixed(2),
                      }));
                    } else {
                      setWithdrawalForm((f) => ({
                        ...f,
                        amountReal: realValue,
                        amountReceived: "",
                      }));
                    }
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Ex: 2500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Type / libellé</label>
                <input
                  type="text"
                  value={withdrawalForm.type}
                  onChange={(e) =>
                    setWithdrawalForm((f) => ({ ...f, type: e.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Récompense 80%"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Note (optionnel)</label>
                <textarea
                  value={withdrawalForm.note}
                  onChange={(e) =>
                    setWithdrawalForm((f) => ({ ...f, note: e.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  rows={2}
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setWithdrawalModalOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                onClick={async () => {
                  if (!selectedAccount) return;
                  const dateVal = withdrawalForm.date || todayIso();
                  // Utiliser le montant réel (100%) s'il est renseigné, sinon calculer depuis le montant reçu (80%)
                  let realWithdrawalAmount: number;
                  if (withdrawalForm.amountReal && withdrawalForm.amountReal !== "") {
                    realWithdrawalAmount = Number(withdrawalForm.amountReal);
                  } else if (withdrawalForm.amountReceived && withdrawalForm.amountReceived !== "") {
                    realWithdrawalAmount = Number(withdrawalForm.amountReceived) / 0.8;
                  } else {
                    const defaults = defaultWithdrawalAmount();
                    realWithdrawalAmount = Number(defaults.amountReal);
                  }
                  
                  if (!dateVal || isNaN(realWithdrawalAmount) || realWithdrawalAmount <= 0) {
                    alert("Date et montant sont requis.");
                    return;
                  }
                  
                  const payload = {
                    accountId: selectedAccount,
                    userId: "demo-user",
                    date: dateVal,
                    amount: realWithdrawalAmount, // Stocker le montant réel (100%)
                    type: withdrawalForm.type || "Récompense 80%",
                    note: withdrawalForm.note || undefined,
                  };
                  console.log("Création retrait:", payload);
                  const res = await fetch("/api/ftmo/withdrawals", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                  });
                  if (!res.ok) {
                    const errorData = await res.json().catch(() => ({}));
                    console.error("Erreur création retrait:", errorData);
                    alert(`Erreur lors de l'enregistrement du retrait: ${errorData.error || "Erreur inconnue"}`);
                    return;
                  }
                  const result = await res.json();
                  console.log("Retrait créé avec succès:", result);
                  setWithdrawalModalOpen(false);
                  const defaults = defaultWithdrawalAmount();
                  setWithdrawalForm({
                    date: todayIso(),
                    amountReceived: defaults.amountReceived,
                    amountReal: defaults.amountReal,
                    type: "Récompense 80%",
                    note: "",
                  });
                  // Forcer le rafraîchissement
                  setRefreshKey((prev) => prev + 1);
                  // Attendre un peu pour que Firestore propage les données
                  await new Promise(resolve => setTimeout(resolve, 500));
                  await fetchSummary();
                }}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

