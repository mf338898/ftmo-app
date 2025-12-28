import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import type { TradeDoc, WithdrawalDoc } from "@/lib/firestoreSchemas";
import type { MonthlyStats, DailyPnlEntry } from "@/components/ftmo/types";
import { startOfMonth, endOfMonth, format } from "date-fns";

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

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get("accountId");
  const userId = searchParams.get("userId") ?? "demo-user";
  const month = searchParams.get("month");

  if (!accountId) {
    return NextResponse.json({ error: "accountId required" }, { status: 400 });
  }

  try {
    const monthDate = month ? new Date(month) : new Date();
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);

    const tradesSnap = await db
      .collection("trades")
      .where("accountId", "==", accountId)
      .where("userId", "==", userId)
      .where("status", "==", "closed")
      .get();

    const trades = tradesSnap.docs.map(
      (doc) => ({ ticket: doc.id, ...doc.data() } as TradeDoc),
    );

    const withdrawalsSnap = await db
      .collection("withdrawals")
      .where("accountId", "==", accountId)
      .where("userId", "==", userId)
      .get();
    const withdrawals = withdrawalsSnap.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() }) as WithdrawalDoc,
    );

    const monthTrades = trades.filter((t) => {
      if (!t.closeTime) return false;
      const closeDate = new Date(t.closeTime);
      return closeDate >= monthStart && closeDate <= monthEnd;
    });

    const monthWithdrawals = withdrawals.filter((w) => {
      const d = new Date(w.date);
      return d >= monthStart && d <= monthEnd;
    });

    const totalPnl = monthTrades.reduce((acc, t) => acc + getNetProfit(t), 0);

    const byDate = new Map<string, { pnl: number; trades: number }>();
    monthTrades.forEach((trade) => {
      if (!trade.closeTime) return;
      const date = format(new Date(trade.closeTime), "yyyy-MM-dd");
      const existing = byDate.get(date) ?? { pnl: 0, trades: 0 };
      byDate.set(date, {
        pnl: existing.pnl + getNetProfit(trade),
        trades: existing.trades + 1,
      });
    });

    const dailyPnl: DailyPnlEntry[] = Array.from(byDate.entries()).map(([date, data]) => ({
      date,
      pnl: data.pnl,
      trades: data.trades,
    }));

    const tradingDays = byDate.size;

    const stats: MonthlyStats = {
      totalPnl,
      tradingDays,
    };

    return NextResponse.json({ stats, dailyPnl, withdrawals: monthWithdrawals });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Firebase admin credentials")) {
      return NextResponse.json(
        { stats: { totalPnl: 0, tradingDays: 0 }, dailyPnl: [] },
        { status: 200 },
      );
    }
    return NextResponse.json(
      { stats: { totalPnl: 0, tradingDays: 0 }, dailyPnl: [] },
      { status: 200 },
    );
  }
}

