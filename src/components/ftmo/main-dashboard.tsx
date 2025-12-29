"use client";

import { useCallback, useState } from "react";
import { Tab } from "@headlessui/react";
import clsx from "clsx";
import { EquityChart } from "./equity-chart";
import { StatisticsPage } from "./statistics-page";
import { TradingJournal } from "./trading-journal";
import { ImportPanel } from "./import-panel";
import { useDisplayMode } from "./display-mode-context";
import {
  createImportFormData,
  fallbackAccounts,
  useFtmoAccounts,
  useFtmoSummary,
  useWithdrawalDefaults,
  DEMO_USER_ID,
} from "./ftmo-hooks";
import type { Account, EquityPoint, Withdrawal } from "./types";

type WithdrawalFormState = {
  date: string;
  amountReceived: string;
  amountReal: string;
  type: string;
  note: string;
};

function DashboardHeader({
  activeAccount,
  isBusy,
  onImport,
  onOpenWithdrawal,
  onCleanup,
}: {
  activeAccount: Account;
  isBusy: boolean;
  onImport: (file: File) => Promise<void>;
  onOpenWithdrawal: () => void;
  onCleanup: () => Promise<void>;
}) {
  return (
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
          onImport={onImport}
            accountName={activeAccount.name}
          disabled={isBusy}
          />
            <button
          onClick={onOpenWithdrawal}
            className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm transition-all hover:bg-blue-100"
          >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Ajouter un retrait
          </button>
          <button
          onClick={onCleanup}
            className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 shadow-sm transition-all hover:bg-red-100"
            title="Supprimer tous les comptes sauf le principal"
          >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
  );
}

function ModeToggleBanner({
  mode,
  baseCapital,
  onToggle,
}: {
  mode: "absolute" | "percentage";
  baseCapital: number;
  onToggle: () => void;
}) {
  return (
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <span>
            Affichage en pourcentage basé sur le dépôt initial de{" "}
          <span className="font-semibold text-slate-900">
            {baseCapital.toLocaleString("fr-FR")} €
          </span>
          </span>
        </div>
        {mode === "percentage" && (
          <button
          onClick={onToggle}
            className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50"
            title="Afficher en euros"
          >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          onClick={onToggle}
            className="flex items-center gap-2 rounded-lg border-2 border-blue-600 bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700"
            title="Afficher en pourcentage"
          >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
  );
}

function DashboardTabs({
  activeAccount,
  selectedAccount,
  equitySeries,
  withdrawals,
  kpis,
  refreshKey,
}: {
  activeAccount: Account;
  selectedAccount: string | null;
  equitySeries: EquityPoint[];
  withdrawals: Withdrawal[];
  kpis: { balance: number; equity: number; totalProfit?: number } | null;
  refreshKey: number;
}) {
  return (
      <Tab.Group>
        <Tab.List className="flex gap-1 border-b border-slate-200">
        {["Graphique d'équité", "Statistiques", "Journal de Trading"].map(
          (label) => (
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
          ),
        )}
        </Tab.List>

        <Tab.Panels className="mt-6">
          <Tab.Panel>
            <EquityChart
              series={equitySeries}
              withdrawals={withdrawals}
              account={{
                ...activeAccount,
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
  );
}

function WithdrawalModal({
  isOpen,
  onClose,
  onSave,
  form,
  onChange,
  todayIso,
  defaultAmounts,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (form: WithdrawalFormState) => Promise<void>;
  form: WithdrawalFormState;
  onChange: (updater: (prev: WithdrawalFormState) => WithdrawalFormState) => void;
  todayIso: () => string;
  defaultAmounts: () => { amountReceived: string; amountReal: string };
}) {
  if (!isOpen) return null;

  const defaults = defaultAmounts();

  return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Ajouter un retrait</h3>
              <button
            onClick={onClose}
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
              value={form.date || todayIso()}
              onChange={(e) => onChange((f) => ({ ...f, date: e.target.value }))}
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
              value={form.amountReceived || defaults.amountReceived}
                  onChange={(e) => {
                    const receivedValue = e.target.value;
                    const receivedNum = Number(receivedValue);
                if (!Number.isNaN(receivedNum) && receivedNum >= 0) {
                      const realValue = receivedNum / 0.8;
                  onChange((f) => ({
                        ...f,
                        amountReceived: receivedValue,
                        amountReal: realValue.toFixed(2),
                      }));
                    } else {
                  onChange((f) => ({
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
              value={form.amountReal || defaults.amountReal}
                  onChange={(e) => {
                    const realValue = e.target.value;
                    const realNum = Number(realValue);
                if (!Number.isNaN(realNum) && realNum >= 0) {
                      const receivedValue = realNum * 0.8;
                  onChange((f) => ({
                        ...f,
                        amountReal: realValue,
                        amountReceived: receivedValue.toFixed(2),
                      }));
                    } else {
                  onChange((f) => ({
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
              value={form.type}
              onChange={(e) => onChange((f) => ({ ...f, type: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Récompense 80%"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Note (optionnel)</label>
                <textarea
              value={form.note}
              onChange={(e) => onChange((f) => ({ ...f, note: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  rows={2}
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
            onClick={onClose}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
            onClick={() => {
              void onSave(form);
            }}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}

export function MainDashboard() {
  const { mode, toggleMode, baseCapital } = useDisplayMode();
  const { activeAccount, selectedAccount, loading: accountsLoading, refreshAccounts } =
    useFtmoAccounts();
  const [refreshKey, setRefreshKey] = useState(0);
  const { equitySeries, withdrawals, kpis, loading: summaryLoading, refreshSummary } =
    useFtmoSummary(selectedAccount, refreshKey);
  const { todayIso, defaultWithdrawalAmounts } = useWithdrawalDefaults(kpis?.totalProfit);
  const [withdrawalModalOpen, setWithdrawalModalOpen] = useState(false);
  const [withdrawalForm, setWithdrawalForm] = useState<WithdrawalFormState>(() => {
    const defaults = defaultWithdrawalAmounts();
    return {
      date: todayIso(),
      amountReceived: defaults.amountReceived,
      amountReal: defaults.amountReal,
      type: "Récompense 80%",
      note: "",
    };
  });

  const isBusy = accountsLoading || summaryLoading;

  const refreshAll = useCallback(async () => {
    setRefreshKey((prev) => prev + 1);
    await refreshAccounts();
    await new Promise((resolve) => setTimeout(resolve, 500));
    await refreshSummary();
  }, [refreshAccounts, refreshSummary]);

  const handleImport = useCallback(
    async (file: File) => {
      const account = activeAccount ?? fallbackAccounts[0];
      const form = createImportFormData(file, account);

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
      await refreshAll();
      return result;
    },
    [activeAccount, refreshAll],
  );

  const handleCleanup = useCallback(async () => {
    if (
      !confirm(
        "Supprimer tous les comptes superflus et ne garder que le compte principal ?",
      )
    ) {
      return;
    }
    try {
      const res = await fetch("/api/ftmo/cleanup", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        alert(
          `Nettoyage terminé !\n${data.message}\n${data.deletedAccounts} compte(s) supprimé(s).`,
        );
        await refreshAll();
      } else {
        alert(`Erreur: ${data.error}`);
      }
    } catch (error) {
      alert(
        `Erreur lors du nettoyage: ${
          error instanceof Error ? error.message : "Erreur inconnue"
        }`,
      );
    }
  }, [refreshAll]);

  const handleWithdrawalSave = useCallback(
    async (formState: WithdrawalFormState) => {
                  if (!selectedAccount) return;
      const dateVal = formState.date || todayIso();

                  let realWithdrawalAmount: number;
      if (formState.amountReal) {
        realWithdrawalAmount = Number(formState.amountReal);
      } else if (formState.amountReceived) {
        realWithdrawalAmount = Number(formState.amountReceived) / 0.8;
                  } else {
        const defaults = defaultWithdrawalAmounts();
                    realWithdrawalAmount = Number(defaults.amountReal);
                  }
                  
      if (!dateVal || Number.isNaN(realWithdrawalAmount) || realWithdrawalAmount <= 0) {
                    alert("Date et montant sont requis.");
                    return;
                  }
                  
                  const payload = {
                    accountId: selectedAccount,
        userId: DEMO_USER_ID,
                    date: dateVal,
        amount: realWithdrawalAmount,
        type: formState.type || "Récompense 80%",
        note: formState.note || undefined,
      };

                  const res = await fetch("/api/ftmo/withdrawals", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                  });

                  if (!res.ok) {
                    const errorData = await res.json().catch(() => ({}));
        alert(
          `Erreur lors de l'enregistrement du retrait: ${
            errorData.error || "Erreur inconnue"
          }`,
        );
                    return;
                  }

      await res.json();
                  setWithdrawalModalOpen(false);
      const defaults = defaultWithdrawalAmounts();
      setWithdrawalForm({
        date: todayIso(),
        amountReceived: defaults.amountReceived,
        amountReal: defaults.amountReal,
        type: "Récompense 80%",
        note: "",
      });
      await refreshAll();
    },
    [defaultWithdrawalAmounts, refreshAll, selectedAccount, todayIso],
  );

  const openWithdrawalModal = useCallback(() => {
    const defaults = defaultWithdrawalAmounts();
                  setWithdrawalForm({
                    date: todayIso(),
                    amountReceived: defaults.amountReceived,
                    amountReal: defaults.amountReal,
                    type: "Récompense 80%",
                    note: "",
                  });
    setWithdrawalModalOpen(true);
  }, [defaultWithdrawalAmounts, todayIso]);

  if (accountsLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-slate-500">Chargement...</p>
            </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        activeAccount={activeAccount}
        isBusy={isBusy}
        onImport={handleImport}
        onOpenWithdrawal={openWithdrawalModal}
        onCleanup={handleCleanup}
      />

      <ModeToggleBanner mode={mode} baseCapital={baseCapital} onToggle={toggleMode} />

      <DashboardTabs
        activeAccount={activeAccount}
        selectedAccount={selectedAccount}
        equitySeries={equitySeries}
        withdrawals={withdrawals}
        kpis={kpis}
        refreshKey={refreshKey}
      />

      <WithdrawalModal
        isOpen={withdrawalModalOpen}
        onClose={() => setWithdrawalModalOpen(false)}
        onSave={handleWithdrawalSave}
        form={withdrawalForm}
        onChange={setWithdrawalForm}
        todayIso={todayIso}
        defaultAmounts={defaultWithdrawalAmounts}
      />
    </div>
  );
}

