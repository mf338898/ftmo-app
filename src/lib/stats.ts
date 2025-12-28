import type { AccountDoc, TradeDoc, WithdrawalDoc } from "./firestoreSchemas";

export type EquityPoint = {
  time: string;
  equity: number;
  drawdownPct: number;
  balance?: number;
};

export type AggregateResult = {
  kpis: {
    balance: number;
    equity: number;
    unrealizedPnl: number;
    drawdownPct: number;
    profitFactor: number;
    avgRrr: number;
    totalProfit: number;
    averageLot: number;
    averageDurationSeconds: number;
  };
  equitySeries: EquityPoint[];
};

// Fonction supprimée car non utilisée - le tri est fait directement dans computeAggregates

// Calculer le profit net (profit brut + swap + commission)
// Note: swap et commission sont déjà en négatif dans les fichiers FTMO
// Donc on les additionne (soustraire un négatif = additionner)
const getNetProfit = (trade: TradeDoc): number => {
  const profit = trade.profit ?? 0;
  const swap = trade.swap ?? 0;
  const commission = trade.commission ?? 0;
  // Le profit net = profit brut + swap + commission
  // (swap et commission sont déjà négatifs, donc on les additionne)
  return profit + swap + commission;
};

const calcProfitFactor = (trades: TradeDoc[]): number => {
  const closed = trades.filter((t) => t.status === "closed");
  const grossProfit = closed
    .map((t) => getNetProfit(t))
    .filter((p) => p > 0)
    .reduce((acc, v) => acc + v, 0);
  const grossLoss = closed
    .map((t) => getNetProfit(t))
    .filter((p) => p < 0)
    .reduce((acc, v) => acc + Math.abs(v), 0);
  if (grossLoss === 0) return grossProfit > 0 ? Infinity : 0;
  return grossProfit / grossLoss;
};

const calcAvgRrr = (trades: TradeDoc[]): number => {
  const rrPairs = trades
    .map((t) => {
      if (!t.takeProfit || !t.stopLoss || !t.entryPrice) return null;
      const reward = Math.abs(t.takeProfit - t.entryPrice);
      const risk = Math.abs(t.entryPrice - t.stopLoss);
      if (!risk) return null;
      return reward / risk;
    })
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v));

  if (!rrPairs.length) return 0;
  return rrPairs.reduce((acc, v) => acc + v, 0) / rrPairs.length;
};

export function computeAggregates(
  trades: TradeDoc[],
  withdrawals: WithdrawalDoc[] = [],
  initialBalance = 160000, // Capital de départ FTMO par défaut
): AggregateResult {
  // Séparer les trades fermés et ouverts
  const closedTrades = trades.filter((t) => t.status === "closed");
  const openTrades = trades.filter((t) => t.status === "open");

  // Trier les trades fermés par date de clôture
  const orderedClosed = [...closedTrades].sort((a, b) => {
    const aTime = new Date(a.closeTime ?? "").getTime();
    const bTime = new Date(b.closeTime ?? "").getTime();
    return aTime - bTime;
  });

  const orderedWithdrawals = [...withdrawals].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  let running = initialBalance;
  let peak = initialBalance;
  let minDrawdownPct = 0;

  // Créer la série d'équité avec un point initial
  const equitySeries: EquityPoint[] = [];

  // Point initial (balance de départ) - utiliser la date du premier trade
  if (orderedClosed.length > 0) {
    const firstTrade = orderedClosed[0];
    const firstTime = firstTrade.openTime ?? firstTrade.closeTime ?? new Date().toISOString();
    equitySeries.push({
      time: firstTime,
      equity: initialBalance,
      drawdownPct: 0,
    });
  } else if (trades.length > 0) {
    // Si pas de trades fermés, utiliser le premier trade ouvert
    const firstTrade = trades[0];
    equitySeries.push({
      time: firstTrade.openTime ?? new Date().toISOString(),
      equity: initialBalance,
      drawdownPct: 0,
    });
  }

  // Fusionner événements trades clôturés et retraits
  type Event =
    | { kind: "trade"; time: string; delta: number }
    | { kind: "withdrawal"; time: string; delta: number };

  const events: Event[] = [
    ...orderedClosed.map((trade) => ({
      kind: "trade" as const,
      time: trade.closeTime ?? trade.openTime ?? new Date().toISOString(),
      delta: getNetProfit(trade),
    })),
    ...orderedWithdrawals.map((w) => ({
      kind: "withdrawal" as const,
      time: w.date,
      delta: -Math.abs(w.amount), // retrait = diminution de cash, pas une perte de trade
    })),
  ].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  events.forEach((event) => {
    running += event.delta;
    peak = Math.max(peak, running);
    const drawdownPct = peak === 0 ? 0 : ((running - peak) / peak) * 100;
    minDrawdownPct = Math.min(minDrawdownPct, drawdownPct);

    equitySeries.push({
      time: event.time,
      equity: running,
      drawdownPct,
    });
  });

  // Ajouter le point final avec les trades ouverts (si il y en a)
  const openUnrealizedPnl = openTrades.reduce(
    (acc, t) => acc + (t.currentPnl ?? t.profit ?? 0),
    0,
  );
  const finalEquity = running + openUnrealizedPnl;
  
  if (openUnrealizedPnl !== 0 || equitySeries.length === 0) {
    peak = Math.max(peak, finalEquity);
    const finalDrawdownPct =
      peak === 0 ? 0 : ((finalEquity - peak) / peak) * 100;
    minDrawdownPct = Math.min(minDrawdownPct, finalDrawdownPct);

    equitySeries.push({
      time: new Date().toISOString(),
      equity: finalEquity,
      drawdownPct: finalDrawdownPct,
    });
  }

  // Si aucune série n'a été créée, créer au moins un point
  if (equitySeries.length === 0) {
    equitySeries.push({
      time: new Date().toISOString(),
      equity: initialBalance,
      drawdownPct: 0,
    });
  }

  const totalProfit = trades
    .filter((t) => t.status === "closed")
    .reduce((acc, t) => acc + getNetProfit(t), 0);

  const totalWithdrawals = orderedWithdrawals.reduce(
    (acc, w) => acc + Math.abs(w.amount),
    0,
  );

  const openUnrealized = trades
    .filter((t) => t.status === "open")
    .reduce((acc, t) => acc + (t.currentPnl ?? 0), 0);

  const averageLot =
    trades.length === 0
      ? 0
      : trades.reduce((acc, t) => acc + (t.volume ?? 0), 0) / trades.length;

  const durationValues = trades
    .map((t) => t.durationSeconds)
    .filter((v): v is number => typeof v === "number");
  const averageDurationSeconds =
    durationValues.length === 0
      ? 0
      : durationValues.reduce((acc, v) => acc + v, 0) / durationValues.length;

  return {
    kpis: {
      balance: initialBalance + totalProfit - totalWithdrawals,
      equity: initialBalance + totalProfit - totalWithdrawals + openUnrealized,
      unrealizedPnl: openUnrealized,
      drawdownPct: Math.abs(minDrawdownPct),
      profitFactor: calcProfitFactor(trades),
      avgRrr: calcAvgRrr(trades),
      totalProfit,
      averageLot,
      averageDurationSeconds,
    },
    equitySeries,
  };
}

export function mergeAccountSnapshot(
  account: AccountDoc,
  aggregates: AggregateResult,
): AccountDoc {
  return {
    ...account,
    balance: aggregates.kpis.balance,
    equity: aggregates.kpis.equity,
    unrealizedPnl: aggregates.kpis.unrealizedPnl,
    drawdownPct: aggregates.kpis.drawdownPct,
    profitFactor: aggregates.kpis.profitFactor,
    avgRrr: aggregates.kpis.avgRrr,
    totalProfit: aggregates.kpis.totalProfit,
    averageLot: aggregates.kpis.averageLot,
    averageDurationSeconds: aggregates.kpis.averageDurationSeconds,
    updatedAt: new Date(),
  };
}

