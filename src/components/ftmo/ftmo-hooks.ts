import { useCallback, useEffect, useMemo, useState } from "react";
import type { Account, EquityPoint, Withdrawal } from "./types";

export const DEMO_USER_ID = "demo-user";

export const fallbackAccounts: Account[] = [
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

export const fallbackEquity: EquityPoint[] = [
  { time: "2024-12-17T00:07:00Z", equity: 160000, drawdownPct: 0 },
  { time: "2024-12-18T04:05:00Z", equity: 160800, drawdownPct: -0.5 },
  { time: "2024-12-19T12:00:00Z", equity: 162450, drawdownPct: -0.3 },
  { time: "2024-12-20T15:30:00Z", equity: 163200, drawdownPct: -0.2 },
  { time: "2024-12-21T10:15:00Z", equity: 164500, drawdownPct: -0.1 },
  { time: "2024-12-25T23:44:00Z", equity: 166290.12, drawdownPct: -0.05 },
];

type SummaryResponse = {
  equitySeries?: EquityPoint[];
  withdrawals?: Withdrawal[];
  kpis?: {
    balance: number;
    equity: number;
    totalProfit?: number;
  };
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message =
      typeof body.error === "string"
        ? body.error
        : body.error?.message ?? "Request failed";
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

function pickDefaultAccount(
  list: Account[],
  previous: string | null,
): string | null {
  if (previous && list.some((a) => a.id === previous)) return previous;
  const withData = list.find(
    (a) => (a.balance ?? 0) > 0 || (a.equity ?? 0) > 0,
  );
  return withData?.id ?? list[0]?.id ?? null;
}

export function useFtmoAccounts(initialSelected: string | null = null) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(
    initialSelected,
  );
  const [loading, setLoading] = useState(true);

  const refreshAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchJson<{ accounts: Account[] }>(
        `/api/ftmo/accounts?userId=${DEMO_USER_ID}`,
      );
      const list = data.accounts.length ? data.accounts : fallbackAccounts;
      setAccounts(list);
      setSelectedAccount((prev) => pickDefaultAccount(list, prev));
    } catch {
      setAccounts(fallbackAccounts);
      setSelectedAccount((prev) => pickDefaultAccount(fallbackAccounts, prev));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshAccounts();
  }, [refreshAccounts]);

  const activeAccount = useMemo(
    () =>
      accounts.find((acc) => acc.id === selectedAccount) ?? fallbackAccounts[0],
    [accounts, selectedAccount],
  );

  return {
    accounts,
    activeAccount,
    selectedAccount,
    setSelectedAccount,
    loading,
    refreshAccounts,
  };
}

export function useFtmoSummary(
  selectedAccount: string | null,
  refreshKey: number,
) {
  const [equitySeries, setEquitySeries] = useState<EquityPoint[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [kpis, setKpis] = useState<
    { balance: number; equity: number; totalProfit?: number } | null
  >(null);
  const [loading, setLoading] = useState(true);

  const refreshSummary = useCallback(async () => {
    if (!selectedAccount) return;
    setLoading(true);
    try {
      const data = await fetchJson<SummaryResponse>(
        `/api/ftmo/summary?accountId=${selectedAccount}&userId=${DEMO_USER_ID}`,
      );
      setEquitySeries(data.equitySeries ?? fallbackEquity);
      setWithdrawals(data.withdrawals ?? []);
      setKpis(
        data.kpis
          ? {
              balance: data.kpis.balance,
              equity: data.kpis.equity,
              totalProfit: data.kpis.totalProfit ?? 0,
            }
          : null,
      );
    } catch {
      setEquitySeries(fallbackEquity);
      setWithdrawals([]);
      setKpis(null);
    } finally {
      setLoading(false);
    }
  }, [selectedAccount]);

  useEffect(() => {
    void refreshSummary();
  }, [refreshSummary, refreshKey]);

  return { equitySeries, withdrawals, kpis, loading, refreshSummary };
}

export function useWithdrawalDefaults(totalProfit?: number) {
  const todayIso = useCallback(
    () => new Date().toISOString().split("T")[0],
    [],
  );

  const defaultWithdrawalAmounts = useCallback(() => {
    const gains = Math.max(totalProfit ?? 0, 0);
    const amountReceived = gains * 0.8;
    return {
      amountReceived: amountReceived.toFixed(2),
      amountReal: (amountReceived / 0.8).toFixed(2),
    };
  }, [totalProfit]);

  return { todayIso, defaultWithdrawalAmounts };
}

export function createImportFormData(file: File, account: Account) {
  const form = new FormData();
  form.append("file", file);
  form.append("accountId", account.id);
  form.append("accountName", account.name ?? "FTMO Account");
  form.append("userId", DEMO_USER_ID);
  form.append("accountType", account.accountType ?? "challenge");
  form.append("platform", account.platform ?? "mt5");
  form.append("currency", account.currency ?? "EUR");
  return form;
}

