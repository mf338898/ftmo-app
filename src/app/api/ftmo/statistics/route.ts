import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import type { TradeDoc } from "@/lib/firestoreSchemas";
import type { StatisticsKpi, DailySummary } from "@/components/ftmo/types";

export const runtime = "nodejs";

// Calculer le profit net (profit brut + swap + commission)
// Note: swap et commission sont déjà en négatif dans les fichiers FTMO
// Donc on les additionne (soustraire un négatif = additionner)
function getNetProfit(trade: TradeDoc): number {
  const profit = trade.profit ?? 0;
  const swap = trade.swap ?? 0;
  const commission = trade.commission ?? 0;
  // Le profit net = profit brut + swap + commission
  // (swap et commission sont déjà négatifs, donc on les additionne)
  return profit + swap + commission;
}

function calculateStatistics(trades: TradeDoc[], initialBalance: number): StatisticsKpi {
  const closed = trades.filter((t) => t.status === "closed");
  const winners = closed.filter((t) => getNetProfit(t) > 0);
  const losers = closed.filter((t) => getNetProfit(t) < 0);

  const totalProfit = closed.reduce((acc, t) => acc + getNetProfit(t), 0);
  const totalLots = trades.reduce((acc, t) => acc + (t.volume ?? 0), 0);

  const avgProfit =
    winners.length > 0
      ? winners.reduce((acc, t) => acc + getNetProfit(t), 0) / winners.length
      : 0;
  const avgLoss =
    losers.length > 0
      ? losers.reduce((acc, t) => acc + Math.abs(getNetProfit(t)), 0) / losers.length
      : 0;

  const successRate = closed.length > 0 ? (winners.length / closed.length) * 100 : 0;

  const grossProfit = winners.reduce((acc, t) => acc + getNetProfit(t), 0);
  const grossLoss = losers.reduce((acc, t) => acc + Math.abs(getNetProfit(t)), 0);
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

  const winRate = successRate / 100;
  const expectedValue = winRate * avgProfit - (1 - winRate) * avgLoss;

  const returns = closed.map((t) => getNetProfit(t) / initialBalance);
  const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
  const variance =
    returns.length > 0
      ? returns.reduce((acc, r) => acc + Math.pow(r - avgReturn, 2), 0) / returns.length
      : 0;
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0;

  const equity = initialBalance + totalProfit;
  const balance = equity;

  return {
    equity,
    balance,
    successRate,
    averageProfit: avgProfit,
    averageLoss: -avgLoss,
    totalTrades: closed.length,
    totalLots,
    sharpeRatio,
    avgRrr: 0,
    expectedValue,
    profitFactor,
  };
}

function calculateDailySummary(trades: TradeDoc[]): DailySummary[] {
  const closed = trades.filter((t) => t.status === "closed" && t.closeTime);
  const byDate = new Map<string, { trades: number; lots: number; profit: number }>();

  closed.forEach((trade) => {
    if (!trade.closeTime) return;
    const date = new Date(trade.closeTime).toISOString().split("T")[0];
    const existing = byDate.get(date) ?? { trades: 0, lots: 0, profit: 0 };
    byDate.set(date, {
      trades: existing.trades + 1,
      lots: existing.lots + (trade.volume ?? 0),
      profit: existing.profit + getNetProfit(trade),
    });
  });

  return Array.from(byDate.entries())
    .map(([date, data]) => ({
      date,
      trades: data.trades,
      lots: data.lots,
      result: data.profit,
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get("accountId");
  const userId = searchParams.get("userId") ?? "demo-user";
  const tagsParam = searchParams.getAll("tag");
  const tagsCsv = searchParams.get("tags");
  const tagFilters = [
    ...tagsParam,
    ...(tagsCsv ? tagsCsv.split(",").map((t) => t.trim()).filter(Boolean) : []),
  ];

  if (!accountId) {
    return NextResponse.json({ error: "accountId required" }, { status: 400 });
  }

  try {
    // Toujours utiliser 160000 comme capital de départ (standard FTMO)
    const initialBalance = 160000;

    const tradesSnap = await db
      .collection("trades")
      .where("accountId", "==", accountId)
      .where("userId", "==", userId)
      .get();

    const trades = tradesSnap.docs.map(
      (doc) => ({ ticket: doc.id, ...doc.data() } as TradeDoc),
    );

    const tagsSnap = await db
      .collection("tags")
      .where("accountId", "==", accountId)
      .where("userId", "==", userId)
      .get();
    const storedTags = tagsSnap.docs
      .map((doc) => doc.data()?.name as string | undefined)
      .filter((t): t is string => typeof t === "string" && t.length > 0);

    const availableTags = Array.from(
      new Set([
        ...storedTags,
        ...trades
          .map((t) => t.tags ?? [])
          .flat()
          .filter((t): t is string => typeof t === "string" && t.length > 0),
      ]),
    ).sort((a, b) => a.localeCompare(b, "fr"));

    const filteredTrades =
      tagFilters.length === 0
        ? trades
        : trades.filter((t) => tagFilters.every((tag) => t.tags?.includes(tag)));

    if (filteredTrades.length === 0) {
      return NextResponse.json({
        statistics: null,
        dailySummary: [],
        availableTags,
      });
    }

    const statistics = calculateStatistics(filteredTrades, initialBalance);
    const dailySummary = calculateDailySummary(filteredTrades);

    return NextResponse.json({ statistics, dailySummary, availableTags });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Firebase admin credentials")) {
      return NextResponse.json(
        {
          statistics: null,
          dailySummary: [],
          error: "Firebase non configuré",
        },
        { status: 200 },
      );
    }
    return NextResponse.json(
      { statistics: null, dailySummary: [], error: error instanceof Error ? error.message : "Internal error" },
      { status: 200 },
    );
  }
}

